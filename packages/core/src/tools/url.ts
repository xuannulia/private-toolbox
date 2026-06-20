import { type ToolboxTool, normalizeError, ok } from '../types.js';

export type UrlInput = {
  text: string;
  encodeEveryCharacter?: boolean;
};

export type UrlOutput = {
  text: string;
};

export const encodeUrlComponent = ({
  text,
  encodeEveryCharacter = false
}: UrlInput): string => {
  if (!encodeEveryCharacter) {
    return encodeURIComponent(text);
  }

  return Array.from(new TextEncoder().encode(text))
    .map((byte) => `%${byte.toString(16).toUpperCase().padStart(2, '0')}`)
    .join('');
};

export const decodeUrlComponent = ({ text }: UrlInput): string =>
  decodeURIComponent(text);

export const urlTools: ToolboxTool[] = [
  {
    name: 'url.encode',
    title: 'Encode URL Component',
    description: 'Percent-encode text for use in a URL component.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        encodeEveryCharacter: { type: 'boolean', default: false }
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
        return ok({ text: encodeUrlComponent(input as UrlInput) });
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'url.decode',
    title: 'Decode URL Component',
    description: 'Decode percent-encoded URL component text.',
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
        return ok({ text: decodeUrlComponent(input as UrlInput) });
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
