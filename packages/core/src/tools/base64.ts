import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type Base64Input = {
  text: string;
};

export type Base64Output = {
  text: string;
};

type BufferLike = {
  from(input: string | Uint8Array, encoding?: string): {
    toString(encoding?: string): string;
  };
};

const getBuffer = (): BufferLike | undefined =>
  (globalThis as typeof globalThis & { Buffer?: BufferLike }).Buffer;

const bytesToBinary = (bytes: Uint8Array): string => {
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return binary;
};

const binaryToBytes = (binary: string): Uint8Array => {
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

export const encodeBase64 = ({ text }: Base64Input): string => {
  const bytes = new TextEncoder().encode(text);

  if (typeof btoa === 'function') {
    return btoa(bytesToBinary(bytes));
  }

  const buffer = getBuffer();
  if (buffer) {
    return buffer.from(bytes).toString('base64');
  }

  throw new ToolboxError('BASE64_UNSUPPORTED', 'Base64 encoding is not available');
};

export const decodeBase64 = ({ text }: Base64Input): string => {
  const normalized = text.replace(/\s+/g, '');

  if (
    normalized.length % 4 === 1 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)
  ) {
    throw new ToolboxError('INVALID_BASE64', 'Invalid Base64 string');
  }

  if (typeof atob === 'function') {
    return new TextDecoder().decode(binaryToBytes(atob(normalized)));
  }

  const buffer = getBuffer();
  if (buffer) {
    return buffer.from(normalized, 'base64').toString('utf-8');
  }

  throw new ToolboxError('BASE64_UNSUPPORTED', 'Base64 decoding is not available');
};

const base64InputSchema = {
  type: 'object',
  required: ['text'],
  additionalProperties: false,
  properties: {
    text: { type: 'string' }
  }
} as const;

const base64OutputSchema = {
  type: 'object',
  required: ['text'],
  additionalProperties: false,
  properties: {
    text: { type: 'string' }
  }
} as const;

export const base64Tools: ToolboxTool[] = [
  {
    name: 'base64.encode',
    title: 'Encode Base64',
    description: 'Encode UTF-8 text as Base64.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: base64InputSchema,
    outputSchema: base64OutputSchema,
    execute: (input) => {
      try {
        return ok({ text: encodeBase64(input as Base64Input) });
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'base64.decode',
    title: 'Decode Base64',
    description: 'Decode Base64 as UTF-8 text.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: base64InputSchema,
    outputSchema: base64OutputSchema,
    execute: (input) => {
      try {
        return ok({ text: decodeBase64(input as Base64Input) });
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
