import { type ToolboxTool, normalizeError, ok } from '../types.js';

export type UnicodeEncodeInput = {
  text: string;
  uppercase?: boolean;
};

export type UnicodeDecodeInput = {
  text: string;
};

export type UnicodeTextOutput = {
  text: string;
};

export const encodeUnicode = ({
  text,
  uppercase = false
}: UnicodeEncodeInput): string => {
  let result = '';

  for (let index = 0; index < text.length; index += 1) {
    let hex = text.charCodeAt(index).toString(16).padStart(4, '0');
    if (uppercase) {
      hex = hex.toUpperCase();
    }
    result += `\\u${hex}`;
  }

  return result;
};

export const decodeUnicode = ({ text }: UnicodeDecodeInput): string =>
  text.replace(/\\u([\dA-Fa-f]{4})/g, (_, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16))
  );

export const unicodeTools: ToolboxTool[] = [
  {
    name: 'unicode.encode',
    title: 'Encode Unicode Escapes',
    description: 'Encode text as Unicode escape sequences.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        uppercase: { type: 'boolean', default: false }
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
        return ok({ text: encodeUnicode(input as UnicodeEncodeInput) });
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'unicode.decode',
    title: 'Decode Unicode Escapes',
    description: 'Decode Unicode escape sequences back to text.',
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
        return ok({ text: decodeUnicode(input as UnicodeDecodeInput) });
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
