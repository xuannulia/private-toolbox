import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import {
  callCoreTool,
  getCoreTool,
  getCoreToolsByChannel,
  type JsonValue,
  type ToolResult,
  normalizeError
} from '@private-toolbox/core';
import {
  callServerTool,
  getServerTool,
  getServerToolsByChannel
} from '@private-toolbox/server';

type ApiBody = Record<string, JsonValue>;

const isObject = (value: unknown): value is ApiBody =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toJsonValue = (value: unknown): JsonValue => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(toJsonValue);
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        toJsonValue(item)
      ])
    );
  }
  return String(value);
};

const writeJson = (
  response: ServerResponse,
  statusCode: number,
  body: JsonValue
) => {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type'
  });
  response.end(JSON.stringify(body));
};

const writeToolResult = (response: ServerResponse, result: ToolResult) => {
  writeJson(response, result.ok ? 200 : 400, result);
};

const readBody = async (request: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    const maxBytes = 1024 * 1024;

    request.on('data', (chunk: Buffer) => {
      totalBytes += chunk.byteLength;
      if (totalBytes > maxBytes) {
        request.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    request.on('error', reject);
  });

const readJsonBody = async (request: IncomingMessage): Promise<ApiBody> => {
  const text = await readBody(request);
  if (!text.trim()) return {};

  const parsed = JSON.parse(text) as unknown;
  if (!isObject(parsed)) {
    throw new Error('Request body must be a JSON object');
  }

  return parsed;
};

const callAndWrite = async (
  response: ServerResponse,
  name: string,
  args: ApiBody
) => {
  const result = getCoreApiTool(name)
    ? await callCoreTool(name, args)
    : await callServerTool(name, args);
  writeToolResult(response, result);
};

const getApiTools = () => [
  ...getCoreToolsByChannel('api'),
  ...getServerToolsByChannel('api')
];

const getCoreApiTool = (name: string) => {
  const tool = getCoreTool(name);
  return tool?.channels.includes('api') ? tool : undefined;
};

const getServerApiTool = (name: string) => {
  const tool = getServerTool(name);
  return tool?.channels.includes('api') ? tool : undefined;
};

const handleGet = async (
  url: URL,
  response: ServerResponse
): Promise<boolean> => {
  switch (url.pathname) {
    case '/health':
      writeJson(response, 200, {
        ok: true,
        name: 'private-toolbox-api'
      });
      return true;
    case '/api/tools':
      writeJson(response, 200, {
        tools: getApiTools().map((tool) => ({
          name: tool.name,
          title: tool.title,
          description: tool.description,
          inputSchema: toJsonValue(tool.inputSchema),
          outputSchema: toJsonValue(tool.outputSchema)
        }))
      });
      return true;
    case '/api/rdap':
      await callAndWrite(response, 'rdap.lookup', {
        query: url.searchParams.get('query') ?? '',
        kind: (url.searchParams.get('kind') as JsonValue) ?? null
      });
      return true;
    case '/api/dns':
      await callAndWrite(response, 'dns.lookup', {
        name: url.searchParams.get('name') ?? '',
        type: url.searchParams.get('type') ?? 'A'
      });
      return true;
    case '/api/ssl':
      await callAndWrite(response, 'ssl.inspect', {
        host: url.searchParams.get('host') ?? '',
        port: Number(url.searchParams.get('port') ?? '443'),
        serverName: url.searchParams.get('serverName') ?? null
      });
      return true;
    case '/api/ip/current':
      await callAndWrite(response, 'ip.current', {});
      return true;
    case '/api/ip/lookup':
      await callAndWrite(response, 'ip.lookup', {
        ip: url.searchParams.get('ip') ?? ''
      });
      return true;
    default:
      return false;
  }
};

const handleRequest = async (
  request: IncomingMessage,
  response: ServerResponse
) => {
  response.setHeader('access-control-allow-origin', '*');
  response.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  response.setHeader('access-control-allow-headers', 'content-type');

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  try {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');

    if (request.method === 'GET' && (await handleGet(url, response))) {
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/tools/call') {
      const body = await readJsonBody(request);
      const name = typeof body.name === 'string' ? body.name : '';
      const args = isObject(body.arguments) ? body.arguments : {};

      if (!getCoreApiTool(name) && !getServerApiTool(name)) {
        writeJson(response, 404, {
          ok: false,
          error: {
            code: 'TOOL_NOT_FOUND',
            message: `Tool not found: ${name}`
          }
        });
        return;
      }

      await callAndWrite(response, name, args);
      return;
    }

    writeJson(response, 404, {
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Not found'
      }
    });
  } catch (error) {
    writeJson(response, 500, normalizeError(error));
  }
};

export const createApiServer = () =>
  http.createServer((request, response) => {
    void handleRequest(request, response);
  });

const currentFile = fileURLToPath(import.meta.url);

if (process.argv[1] === currentFile) {
  const host = process.env.PRIVATE_TOOLBOX_API_HOST ?? '127.0.0.1';
  const port = Number(process.env.PRIVATE_TOOLBOX_API_PORT ?? '4317');
  const server = createApiServer();

  server.listen(port, host, () => {
    console.error(`Private Toolbox API listening on http://${host}:${port}`);
  });
}
