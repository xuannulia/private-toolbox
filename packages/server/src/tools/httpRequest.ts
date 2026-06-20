import http from 'node:http';
import https from 'node:https';
import net, { type LookupFunction } from 'node:net';
import {
  ToolboxError,
  type JsonValue,
  type ToolboxTool,
  normalizeError,
  ok
} from '@private-toolbox/core';
import { mergeNetworkToolConfig, type NetworkToolConfig } from '../config.js';
import { assertPublicTarget } from '../security.js';

export type HttpRequestMethod =
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'OPTIONS';

export type HttpRequestInput = {
  url: string;
  method?: HttpRequestMethod;
  headers?: Record<string, string>;
  body?: string;
  followRedirects?: boolean;
  timeoutMs?: number;
  maxResponseBytes?: number;
};

export type HttpRequestOutput = {
  url: string;
  finalUrl: string;
  method: HttpRequestMethod;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  bodyText: string;
  bodyBytes: number;
  redirected: boolean;
  redirects: string[];
};

export type HttpStatusMethod = 'HEAD' | 'GET';

export type HttpStatusInput = {
  url: string;
  method?: HttpStatusMethod;
  followRedirects?: boolean;
  timeoutMs?: number;
};

export type HttpStatusCategory =
  | 'informational'
  | 'success'
  | 'redirection'
  | 'client_error'
  | 'server_error'
  | 'unknown';

export type HttpStatusOutput = {
  url: string;
  finalUrl: string;
  method: HttpStatusMethod;
  status: number;
  statusText: string;
  category: HttpStatusCategory;
  ok: boolean;
  redirected: boolean;
  redirectCount: number;
  redirects: string[];
  responseTimeMs: number;
  headers: Record<string, string>;
};

type RequestOnceResult = {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  bodyText: string;
  bodyBytes: number;
};

const supportedMethods: HttpRequestMethod[] = [
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS'
];

const blockedRequestHeaders = new Set([
  'connection',
  'content-length',
  'host',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade'
]);

const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const statusMethods: HttpStatusMethod[] = ['HEAD', 'GET'];

const normalizeMethod = (method?: HttpRequestMethod): HttpRequestMethod => {
  const normalized = (method ?? 'GET').toUpperCase() as HttpRequestMethod;

  if (!supportedMethods.includes(normalized)) {
    throw new ToolboxError(
      'HTTP_METHOD_UNSUPPORTED',
      `Unsupported HTTP method: ${method}`
    );
  }

  return normalized;
};

const normalizeStatusMethod = (method?: HttpStatusMethod): HttpStatusMethod => {
  const normalized = (method ?? 'HEAD').toUpperCase() as HttpStatusMethod;

  if (!statusMethods.includes(normalized)) {
    throw new ToolboxError(
      'HTTP_STATUS_METHOD_UNSUPPORTED',
      `Unsupported HTTP status method: ${method}`
    );
  }

  return normalized;
};

const normalizeUrl = (input: string): URL => {
  if (!input?.trim()) {
    throw new ToolboxError('HTTP_URL_REQUIRED', 'URL is required');
  }

  const url = new URL(input);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ToolboxError(
      'HTTP_PROTOCOL_UNSUPPORTED',
      'Only http and https URLs are supported'
    );
  }

  if (url.username || url.password) {
    throw new ToolboxError(
      'HTTP_URL_CREDENTIALS_UNSUPPORTED',
      'Credentials in URLs are not supported'
    );
  }

  return url;
};

const getStatusCategory = (status: number): HttpStatusCategory => {
  if (status >= 100 && status <= 199) return 'informational';
  if (status >= 200 && status <= 299) return 'success';
  if (status >= 300 && status <= 399) return 'redirection';
  if (status >= 400 && status <= 499) return 'client_error';
  if (status >= 500 && status <= 599) return 'server_error';
  return 'unknown';
};

const normalizeHeaders = (
  headers: Record<string, string> | undefined,
  userAgent: string
): Record<string, string> => {
  const result: Record<string, string> = {
    accept: '*/*',
    'user-agent': userAgent
  };

  for (const [key, value] of Object.entries(headers ?? {})) {
    const normalizedKey = key.trim().toLowerCase();
    if (!normalizedKey || blockedRequestHeaders.has(normalizedKey)) {
      continue;
    }

    result[normalizedKey] = String(value);
  }

  return result;
};

const normalizeResponseHeaders = (
  headers: http.IncomingHttpHeaders
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(', ') : String(value ?? '')
    ])
  );

const pickAddress = async (
  host: string,
  config: NetworkToolConfig
): Promise<{ address: string; family: 4 | 6 }> => {
  const target = await assertPublicTarget(host, config);
  const address = target.addresses[0];
  const family = net.isIP(address);

  if (family !== 4 && family !== 6) {
    throw new ToolboxError(
      'HTTP_TARGET_RESOLVE_FAILED',
      `Unable to resolve target: ${host}`
    );
  }

  return {
    address,
    family
  };
};

const createLookup = (
  expectedHost: string,
  address: string,
  family: 4 | 6
): LookupFunction => {
  return (hostname, options, callback) => {
    if (hostname !== expectedHost) {
      const error = new Error(
        `Unexpected lookup host: ${hostname}`
      ) as NodeJS.ErrnoException;
      error.code = 'ENOTFOUND';
      callback(error, address, family);
      return;
    }

    if (options.all) {
      callback(null, [{ address, family }]);
      return;
    }

    callback(null, address, family);
  };
};

const requestOnce = async (
  url: URL,
  method: HttpRequestMethod,
  headers: Record<string, string>,
  body: string | undefined,
  config: NetworkToolConfig
): Promise<RequestOnceResult> => {
  const { address, family } = await pickAddress(url.hostname, config);
  const client = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const request = client.request(
      url,
      {
        method,
        headers,
        timeout: config.timeoutMs,
        lookup: createLookup(url.hostname, address, family)
      },
      (response) => {
        const chunks: Buffer[] = [];
        let bodyBytes = 0;

        response.on('data', (chunk: Buffer) => {
          bodyBytes += chunk.byteLength;
          if (bodyBytes > config.maxResponseBytes) {
            request.destroy(
              new ToolboxError(
                'RESPONSE_TOO_LARGE',
                `Response exceeded ${config.maxResponseBytes} bytes`
              )
            );
            return;
          }

          chunks.push(chunk);
        });

        response.on('end', () => {
          resolve({
            status: response.statusCode ?? 0,
            statusText: response.statusMessage ?? '',
            headers: normalizeResponseHeaders(response.headers),
            bodyText: Buffer.concat(chunks).toString('utf-8'),
            bodyBytes
          });
        });
      }
    );

    request.on('timeout', () => {
      request.destroy(
        new ToolboxError(
          'NETWORK_TIMEOUT',
          `Request timed out after ${config.timeoutMs} ms`
        )
      );
    });
    request.on('error', reject);

    if (body && method !== 'GET' && method !== 'HEAD') {
      request.write(body);
    }

    request.end();
  });
};

const nextRedirectUrl = (
  currentUrl: URL,
  location: string | undefined
): URL => {
  if (!location) {
    throw new ToolboxError(
      'HTTP_REDIRECT_LOCATION_MISSING',
      'Redirect response is missing a Location header'
    );
  }

  return normalizeUrl(new URL(location, currentUrl).toString());
};

export const sendHttpRequest = async (
  input: HttpRequestInput,
  override?: Partial<NetworkToolConfig>
): Promise<HttpRequestOutput> => {
  const method = normalizeMethod(input.method);
  const initialUrl = normalizeUrl(input.url);
  const config = mergeNetworkToolConfig({
    ...override,
    timeoutMs: input.timeoutMs ?? override?.timeoutMs,
    maxResponseBytes: input.maxResponseBytes ?? override?.maxResponseBytes
  });
  const followRedirects = input.followRedirects ?? true;
  const headers = normalizeHeaders(input.headers, config.userAgent);
  const redirects: string[] = [];
  let currentUrl = initialUrl;
  let currentMethod = method;
  let currentBody = input.body;

  for (
    let redirectCount = 0;
    redirectCount <= config.maxRedirects;
    redirectCount += 1
  ) {
    const response = await requestOnce(
      currentUrl,
      currentMethod,
      headers,
      currentBody,
      config
    );

    if (
      followRedirects &&
      redirectStatuses.has(response.status) &&
      response.headers.location
    ) {
      if (redirectCount >= config.maxRedirects) {
        throw new ToolboxError(
          'HTTP_REDIRECT_LIMIT_EXCEEDED',
          `Redirect limit exceeded: ${config.maxRedirects}`
        );
      }

      currentUrl = nextRedirectUrl(currentUrl, response.headers.location);
      redirects.push(currentUrl.toString());

      if (
        response.status === 303 ||
        ((response.status === 301 || response.status === 302) &&
          currentMethod === 'POST')
      ) {
        currentMethod = 'GET';
        currentBody = undefined;
      }

      continue;
    }

    return {
      url: initialUrl.toString(),
      finalUrl: currentUrl.toString(),
      method,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      bodyText: response.bodyText,
      bodyBytes: response.bodyBytes,
      redirected: redirects.length > 0,
      redirects
    };
  }

  throw new ToolboxError(
    'HTTP_REDIRECT_LIMIT_EXCEEDED',
    `Redirect limit exceeded: ${config.maxRedirects}`
  );
};

export const checkHttpStatus = async (
  input: HttpStatusInput,
  override?: Partial<NetworkToolConfig>
): Promise<HttpStatusOutput> => {
  const method = normalizeStatusMethod(input.method);
  const startedAt = Date.now();
  const response = await sendHttpRequest(
    {
      url: input.url,
      method,
      followRedirects: input.followRedirects ?? true,
      timeoutMs: input.timeoutMs,
      maxResponseBytes: 64 * 1024
    },
    override
  );
  const category = getStatusCategory(response.status);

  return {
    url: response.url,
    finalUrl: response.finalUrl,
    method,
    status: response.status,
    statusText: response.statusText,
    category,
    ok: response.status >= 200 && response.status < 400,
    redirected: response.redirected,
    redirectCount: response.redirects.length,
    redirects: response.redirects,
    responseTimeMs: Date.now() - startedAt,
    headers: response.headers
  };
};

export const httpRequestTools: ToolboxTool[] = [
  {
    name: 'http.request',
    title: 'HTTP Request',
    description:
      'Send an HTTP request from the local backend with SSRF guards.',
    channels: ['api'],
    risks: ['network'],
    inputSchema: {
      type: 'object',
      required: ['url'],
      additionalProperties: false,
      properties: {
        url: { type: 'string' },
        method: {
          type: 'string',
          enum: supportedMethods,
          default: 'GET'
        },
        headers: {
          type: 'object',
          additionalProperties: { type: 'string' }
        },
        body: { type: 'string' },
        followRedirects: {
          type: 'boolean',
          default: true
        },
        timeoutMs: {
          type: 'integer',
          minimum: 100,
          maximum: 30000
        },
        maxResponseBytes: {
          type: 'integer',
          minimum: 1,
          maximum: 5242880
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'url',
        'finalUrl',
        'method',
        'status',
        'statusText',
        'headers',
        'bodyText',
        'bodyBytes',
        'redirected',
        'redirects'
      ],
      additionalProperties: false,
      properties: {
        url: { type: 'string' },
        finalUrl: { type: 'string' },
        method: { type: 'string' },
        status: { type: 'integer' },
        statusText: { type: 'string' },
        headers: {
          type: 'object',
          additionalProperties: { type: 'string' }
        },
        bodyText: { type: 'string' },
        bodyBytes: { type: 'integer' },
        redirected: { type: 'boolean' },
        redirects: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },
    execute: async (input) => {
      try {
        return ok(await sendHttpRequest(input as HttpRequestInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'http.status',
    title: 'HTTP Status',
    description:
      'Check an HTTP URL status from the local backend with SSRF guards.',
    channels: ['api'],
    risks: ['network'],
    inputSchema: {
      type: 'object',
      required: ['url'],
      additionalProperties: false,
      properties: {
        url: { type: 'string' },
        method: {
          type: 'string',
          enum: statusMethods,
          default: 'HEAD'
        },
        followRedirects: {
          type: 'boolean',
          default: true
        },
        timeoutMs: {
          type: 'integer',
          minimum: 100,
          maximum: 30000
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'url',
        'finalUrl',
        'method',
        'status',
        'statusText',
        'category',
        'ok',
        'redirected',
        'redirectCount',
        'redirects',
        'responseTimeMs',
        'headers'
      ],
      additionalProperties: false,
      properties: {
        url: { type: 'string' },
        finalUrl: { type: 'string' },
        method: { type: 'string', enum: statusMethods },
        status: { type: 'integer' },
        statusText: { type: 'string' },
        category: {
          type: 'string',
          enum: [
            'informational',
            'success',
            'redirection',
            'client_error',
            'server_error',
            'unknown'
          ]
        },
        ok: { type: 'boolean' },
        redirected: { type: 'boolean' },
        redirectCount: { type: 'integer' },
        redirects: {
          type: 'array',
          items: { type: 'string' }
        },
        responseTimeMs: { type: 'integer' },
        headers: {
          type: 'object',
          additionalProperties: { type: 'string' }
        }
      }
    },
    execute: async (input) => {
      try {
        return ok(await checkHttpStatus(input as HttpStatusInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
