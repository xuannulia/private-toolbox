import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type UuidInput = {
  uppercase?: boolean;
  removeDashes?: boolean;
  count?: number;
};

export type UuidOutput = {
  uuid: string;
  uuids: string[];
};

const fallbackUuidV4 = (): string => {
  if (!globalThis.crypto?.getRandomValues) {
    throw new ToolboxError(
      'UUID_UNSUPPORTED',
      'Secure random UUID generation is not available'
    );
  }

  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join('')
  ].join('-');
};

export const generateUuid = ({
  uppercase = false,
  removeDashes = false
}: UuidInput = {}): string => {
  let uuid =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : fallbackUuidV4();

  if (removeDashes) {
    uuid = uuid.replace(/-/g, '');
  }

  return uppercase ? uuid.toUpperCase() : uuid;
};

const normalizeUuidCount = (count: number | undefined): number => {
  if (count === undefined) return 1;
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new ToolboxError(
      'UUID_COUNT_INVALID',
      'UUID count must be an integer between 1 and 100'
    );
  }

  return count;
};

export const generateUuids = (input: UuidInput = {}): UuidOutput => {
  const count = normalizeUuidCount(input.count);
  const uuids = Array.from({ length: count }, () => generateUuid(input));

  return {
    uuid: uuids[0],
    uuids
  };
};

export const uuidTools: ToolboxTool[] = [
  {
    name: 'uuid.generate',
    title: 'Generate UUID',
    description: 'Generate a random UUID v4.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        uppercase: { type: 'boolean', default: false },
        removeDashes: { type: 'boolean', default: false },
        count: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 1
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['uuid', 'uuids'],
      additionalProperties: false,
      properties: {
        uuid: { type: 'string' },
        uuids: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },
    execute: (input) => {
      try {
        return ok(generateUuids((input ?? {}) as UuidInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
