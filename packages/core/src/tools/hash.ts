import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

export type HashTextInput = {
  text: string;
  algorithm?: HashAlgorithm;
};

export type HashTextOutput = {
  algorithm: HashAlgorithm;
  hex: string;
};

const supportedAlgorithms: HashAlgorithm[] = [
  'MD5',
  'SHA-1',
  'SHA-256',
  'SHA-384',
  'SHA-512'
];

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const md5ShiftAmounts = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
  9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
  16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15,
  21
];

const md5Constants = Array.from({ length: 64 }, (_, index) =>
  Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32)
);

const leftRotate = (value: number, amount: number): number =>
  ((value << amount) | (value >>> (32 - amount))) >>> 0;

const md5WordToHex = (word: number): string =>
  [word & 0xff, (word >>> 8) & 0xff, (word >>> 16) & 0xff, (word >>> 24) & 0xff]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const md5Hex = (bytes: Uint8Array): string => {
  let paddedLength = bytes.length + 1;
  while (paddedLength % 64 !== 56) paddedLength += 1;

  const padded = new Uint8Array(paddedLength + 8);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const bitLength = BigInt(bytes.length) * 8n;
  for (let index = 0; index < 8; index += 1) {
    padded[paddedLength + index] = Number(
      (bitLength >> BigInt(index * 8)) & 0xffn
    );
  }

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let offset = 0; offset < padded.length; offset += 64) {
    const words = Array.from({ length: 16 }, (_, index) => {
      const position = offset + index * 4;
      return (
        (padded[position] |
          (padded[position + 1] << 8) |
          (padded[position + 2] << 16) |
          (padded[position + 3] << 24)) >>>
        0
      );
    });

    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let index = 0; index < 64; index += 1) {
      let f: number;
      let g: number;

      if (index < 16) {
        f = (b & c) | (~b & d);
        g = index;
      } else if (index < 32) {
        f = (d & b) | (~d & c);
        g = (5 * index + 1) % 16;
      } else if (index < 48) {
        f = b ^ c ^ d;
        g = (3 * index + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * index) % 16;
      }

      const previousD = d;
      d = c;
      c = b;
      b =
        (b +
          leftRotate(
            (a + f + md5Constants[index] + words[g]) >>> 0,
            md5ShiftAmounts[index]
          )) >>>
        0;
      a = previousD;
    }

    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  return [a0, b0, c0, d0].map(md5WordToHex).join('');
};

export const hashText = async ({
  text,
  algorithm = 'SHA-256'
}: HashTextInput): Promise<HashTextOutput> => {
  if (!supportedAlgorithms.includes(algorithm)) {
    throw new ToolboxError(
      'UNSUPPORTED_HASH_ALGORITHM',
      `Unsupported hash algorithm: ${algorithm}`
    );
  }

  const bytes = new TextEncoder().encode(text);

  if (algorithm === 'MD5') {
    return {
      algorithm,
      hex: md5Hex(bytes)
    };
  }

  if (!globalThis.crypto?.subtle) {
    throw new ToolboxError(
      'HASH_UNSUPPORTED',
      'Web Crypto hash support is not available'
    );
  }

  const digest = await globalThis.crypto.subtle.digest(algorithm, bytes);

  return {
    algorithm,
    hex: toHex(digest)
  };
};

export const hashTools: ToolboxTool[] = [
  {
    name: 'hash.text',
    title: 'Hash Text',
    description: 'Create an MD5 or SHA hash for text input.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        algorithm: {
          type: 'string',
          enum: supportedAlgorithms,
          default: 'SHA-256'
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['algorithm', 'hex'],
      additionalProperties: false,
      properties: {
        algorithm: { type: 'string' },
        hex: { type: 'string' }
      }
    },
    execute: async (input) => {
      try {
        return ok(await hashText(input as HashTextInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
