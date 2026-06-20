import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '@private-toolbox/core';

export type FileHashAlgorithm = 'md5' | 'sha1' | 'sha256' | 'sha384' | 'sha512';

export type HashFileInput = {
  path: string;
  algorithm?: FileHashAlgorithm;
  algorithms?: FileHashAlgorithm[];
};

export type HashFileOutput = {
  path: string;
  sizeBytes: number;
  algorithms: FileHashAlgorithm[];
  hashes: Record<string, string>;
};

const supportedAlgorithms: FileHashAlgorithm[] = [
  'md5',
  'sha1',
  'sha256',
  'sha384',
  'sha512'
];

const defaultMaxFileBytes = 512 * 1024 * 1024;

const normalizeAlgorithms = ({
  algorithm,
  algorithms
}: Pick<HashFileInput, 'algorithm' | 'algorithms'>): FileHashAlgorithm[] => {
  const requested = algorithms?.length
    ? algorithms
    : algorithm
      ? [algorithm]
      : ['sha256'];
  const normalized = Array.from(
    new Set(requested.map((value) => value.toLowerCase() as FileHashAlgorithm))
  );

  for (const item of normalized) {
    if (!supportedAlgorithms.includes(item)) {
      throw new ToolboxError(
        'UNSUPPORTED_FILE_HASH_ALGORITHM',
        `Unsupported file hash algorithm: ${item}`
      );
    }
  }

  return normalized;
};

export const hashFile = async (
  input: HashFileInput,
  maxFileBytes = defaultMaxFileBytes
): Promise<HashFileOutput> => {
  if (!input.path?.trim()) {
    throw new ToolboxError('FILE_PATH_REQUIRED', 'File path is required');
  }

  const absolutePath = resolve(input.path);
  const fileStat = await stat(absolutePath);

  if (!fileStat.isFile()) {
    throw new ToolboxError('FILE_HASH_NOT_FILE', 'Path must point to a file');
  }

  if (fileStat.size > maxFileBytes) {
    throw new ToolboxError(
      'FILE_HASH_TOO_LARGE',
      `File exceeds the ${maxFileBytes} byte limit`,
      {
        sizeBytes: fileStat.size,
        maxFileBytes
      }
    );
  }

  const algorithms = normalizeAlgorithms(input);
  const hashers = Object.fromEntries(
    algorithms.map((algorithm) => [algorithm, createHash(algorithm)])
  );

  for await (const chunk of createReadStream(absolutePath)) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    for (const hasher of Object.values(hashers)) {
      hasher.update(buffer);
    }
  }

  return {
    path: absolutePath,
    sizeBytes: fileStat.size,
    algorithms,
    hashes: Object.fromEntries(
      Object.entries(hashers).map(([algorithm, hasher]) => [
        algorithm,
        hasher.digest('hex')
      ])
    )
  };
};

export const fileHashTools: ToolboxTool[] = [
  {
    name: 'hash.file',
    title: 'Hash File',
    description: 'Calculate one or more hashes for a local file path.',
    channels: ['api', 'mcp'],
    risks: ['file-read'],
    inputSchema: {
      type: 'object',
      required: ['path'],
      additionalProperties: false,
      properties: {
        path: { type: 'string' },
        algorithm: {
          type: 'string',
          enum: supportedAlgorithms,
          default: 'sha256'
        },
        algorithms: {
          type: 'array',
          items: {
            type: 'string',
            enum: supportedAlgorithms
          },
          uniqueItems: true
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['path', 'sizeBytes', 'algorithms', 'hashes'],
      additionalProperties: false,
      properties: {
        path: { type: 'string' },
        sizeBytes: { type: 'integer' },
        algorithms: {
          type: 'array',
          items: { type: 'string' }
        },
        hashes: {
          type: 'object',
          additionalProperties: { type: 'string' }
        }
      }
    },
    execute: async (input, context) => {
      try {
        return ok(
          await hashFile(
            input as HashFileInput,
            context?.maxInputBytes ?? defaultMaxFileBytes
          )
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
