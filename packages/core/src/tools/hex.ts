import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type HexEncodeInput = {
  text: string;
  uppercase?: boolean;
  separator?: string;
};

export type HexDecodeInput = {
  text: string;
};

export type HexTextOutput = {
  text: string;
};

const toHexByte = (byte: number, uppercase: boolean): string => {
  const value = byte.toString(16).padStart(2, '0');
  return uppercase ? value.toUpperCase() : value;
};

export const encodeHex = ({
  text,
  uppercase = false,
  separator = ''
}: HexEncodeInput): string =>
  Array.from(new TextEncoder().encode(text), (byte) =>
    toHexByte(byte, uppercase)
  ).join(separator);

const normalizeHexInput = (text: string): string => {
  const normalized = text
    .trim()
    .replace(/0x/gi, '')
    .replace(/[\s,_:-]/g, '');

  if (normalized.length === 0) {
    return '';
  }

  if (!/^[0-9a-fA-F]+$/.test(normalized)) {
    throw new ToolboxError(
      'INVALID_HEX',
      'Hex input can only contain hexadecimal digits and common separators'
    );
  }

  if (normalized.length % 2 !== 0) {
    throw new ToolboxError(
      'INVALID_HEX_LENGTH',
      'Hex input must contain an even number of digits'
    );
  }

  return normalized;
};

export const decodeHex = ({ text }: HexDecodeInput): string => {
  const normalized = normalizeHexInput(text);
  const bytes = new Uint8Array(normalized.length / 2);

  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new ToolboxError('INVALID_UTF8', 'Hex input is not valid UTF-8 text');
  }
};

export const hexTools: ToolboxTool[] = [
  {
    name: 'hex.encode',
    title: 'Encode Hex',
    description: 'Encode UTF-8 text as hexadecimal bytes.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        uppercase: { type: 'boolean', default: false },
        separator: { type: 'string', default: '' }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok({ text: encodeHex(input as HexEncodeInput) });
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'hex.decode',
    title: 'Decode Hex',
    description: 'Decode hexadecimal bytes as UTF-8 text.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok({ text: decodeHex(input as HexDecodeInput) });
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
