import { ToolboxError, type JsonValue } from '@private-toolbox/core';
import { mergeNetworkToolConfig, type NetworkToolConfig } from './config.js';

export type FetchTextResult = {
  url: string;
  status: number;
  contentType: string;
  text: string;
};

const readLimitedBody = async (
  response: Response,
  maxResponseBytes: number
): Promise<string> => {
  if (!response.body) return '';

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    totalBytes += value.byteLength;
    if (totalBytes > maxResponseBytes) {
      await reader.cancel();
      throw new ToolboxError(
        'RESPONSE_TOO_LARGE',
        `Response exceeded ${maxResponseBytes} bytes`
      );
    }

    chunks.push(value);
  }

  return Buffer.concat(chunks).toString('utf-8');
};

export const fetchTextLimited = async (
  url: string,
  override?: Partial<NetworkToolConfig>
): Promise<FetchTextResult> => {
  const config = mergeNetworkToolConfig(override);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
        'user-agent': config.userAgent
      }
    });

    const text = await readLimitedBody(response, config.maxResponseBytes);
    const contentType = response.headers.get('content-type') ?? '';

    if (!response.ok) {
      throw new ToolboxError('HTTP_ERROR', `HTTP ${response.status}`, {
        url: response.url,
        status: response.status,
        bodyPreview: text.slice(0, 300)
      });
    }

    return {
      url: response.url,
      status: response.status,
      contentType,
      text
    };
  } catch (error) {
    if (error instanceof ToolboxError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ToolboxError('NETWORK_TIMEOUT', `Request timed out after ${config.timeoutMs} ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const parseJsonText = (text: string): JsonValue => {
  try {
    return JSON.parse(text) as JsonValue;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON';
    throw new ToolboxError('INVALID_JSON_RESPONSE', message);
  }
};

export const fetchJsonLimited = async (
  url: string,
  override?: Partial<NetworkToolConfig>
): Promise<{ url: string; status: number; data: JsonValue }> => {
  const response = await fetchTextLimited(url, override);

  return {
    url: response.url,
    status: response.status,
    data: parseJsonText(response.text)
  };
};
