import { createHash, randomUUID } from 'node:crypto';
import { mkdir, realpath, writeFile } from 'node:fs/promises';
import {
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve
} from 'node:path';
import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '@private-toolbox/core';
import { mergeFileToolConfig, type FileToolConfig } from '../config.js';

export type WriteTempFileEncoding = 'utf8' | 'base64';

export type WriteTempFileInput = {
  text: string;
  fileName?: string;
  encoding?: WriteTempFileEncoding;
  overwrite?: boolean;
};

export type WriteTempFileOutput = {
  path: string;
  rootDir: string;
  outputDir: string;
  relativePath: string;
  fileName: string;
  sizeBytes: number;
  encoding: WriteTempFileEncoding;
  sha256: string;
};

const supportedEncodings: WriteTempFileEncoding[] = ['utf8', 'base64'];
const defaultMaxWriteBytes = 10 * 1024 * 1024;

const isPathInside = (rootDir: string, targetPath: string): boolean => {
  const diff = relative(rootDir, targetPath);
  return diff === '' || (!diff.startsWith('..') && !isAbsolute(diff));
};

const normalizeEncoding = (value?: string): WriteTempFileEncoding => {
  if (!value) return 'utf8';
  if (supportedEncodings.includes(value as WriteTempFileEncoding)) {
    return value as WriteTempFileEncoding;
  }

  throw new ToolboxError(
    'FILE_WRITE_TEMP_ENCODING_UNSUPPORTED',
    `Unsupported file encoding: ${value}`
  );
};

const normalizeFileName = (value: string | undefined): string => {
  if (value !== undefined && typeof value !== 'string') {
    throw new ToolboxError(
      'FILE_WRITE_TEMP_FILE_NAME_INVALID',
      'fileName must be a string'
    );
  }

  const raw = value?.trim() || `private-toolbox-${randomUUID()}.txt`;
  if (raw.includes('/') || raw.includes('\\')) {
    throw new ToolboxError(
      'FILE_WRITE_TEMP_FILE_NAME_INVALID',
      'fileName must not contain path separators'
    );
  }

  const normalized = raw
    .replace(/[\u0000<>:"|?*]/g, '_')
    .replace(/^\.+$/, '')
    .trim()
    .slice(0, 160);

  return normalized || `private-toolbox-${randomUUID()}.txt`;
};

const decodeContent = (
  text: unknown,
  encoding: WriteTempFileEncoding
): Buffer => {
  if (typeof text !== 'string') {
    throw new ToolboxError(
      'FILE_WRITE_TEMP_TEXT_REQUIRED',
      'text must be a string'
    );
  }

  if (encoding === 'utf8') return Buffer.from(text, 'utf8');

  const normalized = text.replace(/\s+/g, '');
  if (
    normalized.length % 4 === 1 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)
  ) {
    throw new ToolboxError(
      'FILE_WRITE_TEMP_BASE64_INVALID',
      'text is not valid Base64'
    );
  }

  return Buffer.from(normalized, 'base64');
};

const resolveOutputDirectory = async (config: FileToolConfig) => {
  const rootDir = await realpath(resolve(config.rootDir));
  const requestedOutputDir = resolve(config.outputDir);

  await mkdir(requestedOutputDir, { recursive: true });

  const outputDir = await realpath(requestedOutputDir);
  if (!isPathInside(rootDir, outputDir)) {
    throw new ToolboxError(
      'FILE_WRITE_TEMP_OUTPUT_OUTSIDE_ROOT',
      'Output directory is outside the configured file tool root',
      {
        rootDir,
        outputDir
      }
    );
  }

  return {
    rootDir,
    outputDir
  };
};

const getNumberedPath = (
  outputDir: string,
  fileName: string,
  index: number
): string => {
  if (index === 0) return join(outputDir, fileName);

  const extension = extname(fileName);
  const stem = extension ? fileName.slice(0, -extension.length) : fileName;
  return join(outputDir, `${stem}-${index + 1}${extension}`);
};

const writeWithoutOverwrite = async (
  outputDir: string,
  fileName: string,
  content: Buffer,
  overwrite: boolean
): Promise<string> => {
  if (overwrite) {
    const targetPath = join(outputDir, fileName);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, content);
    return targetPath;
  }

  for (let index = 0; index < 1000; index += 1) {
    const targetPath = getNumberedPath(outputDir, fileName, index);
    try {
      await writeFile(targetPath, content, { flag: 'wx' });
      return targetPath;
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'EEXIST'
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new ToolboxError(
    'FILE_WRITE_TEMP_NAME_EXHAUSTED',
    'Could not create a unique temporary file name'
  );
};

export const writeTempFile = async (
  input: WriteTempFileInput,
  configOverride?: Partial<FileToolConfig>,
  maxWriteBytes = defaultMaxWriteBytes
): Promise<WriteTempFileOutput> => {
  const encoding = normalizeEncoding(input.encoding);
  const content = decodeContent(input.text, encoding);

  if (content.byteLength > maxWriteBytes) {
    throw new ToolboxError(
      'FILE_WRITE_TEMP_TOO_LARGE',
      `Temporary file exceeds the ${maxWriteBytes} byte limit`,
      {
        sizeBytes: content.byteLength,
        maxWriteBytes
      }
    );
  }

  const config = mergeFileToolConfig(configOverride);
  const { rootDir, outputDir } = await resolveOutputDirectory(config);
  const requestedFileName = normalizeFileName(input.fileName);
  const path = await writeWithoutOverwrite(
    outputDir,
    requestedFileName,
    content,
    input.overwrite ?? false
  );

  if (!isPathInside(rootDir, path)) {
    throw new ToolboxError(
      'FILE_WRITE_TEMP_PATH_OUTSIDE_ROOT',
      'Temporary file path is outside the configured file tool root',
      {
        rootDir,
        path
      }
    );
  }

  return {
    path,
    rootDir,
    outputDir,
    relativePath: relative(rootDir, path),
    fileName: relative(outputDir, path),
    sizeBytes: content.byteLength,
    encoding,
    sha256: createHash('sha256').update(content).digest('hex')
  };
};

export const writeTempFileTools: ToolboxTool[] = [
  {
    name: 'file.write_temp',
    title: 'Write Temporary File',
    description:
      'Write text or Base64 content into the configured private-toolbox output directory.',
    channels: ['api', 'mcp'],
    risks: ['file-write'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        fileName: {
          type: 'string',
          description:
            'Optional file name inside PRIVATE_TOOLBOX_FILE_OUTPUT_DIR. Path separators are not allowed.'
        },
        encoding: {
          type: 'string',
          enum: supportedEncodings,
          default: 'utf8'
        },
        overwrite: {
          type: 'boolean',
          default: false
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'path',
        'rootDir',
        'outputDir',
        'relativePath',
        'fileName',
        'sizeBytes',
        'encoding',
        'sha256'
      ],
      additionalProperties: false,
      properties: {
        path: { type: 'string' },
        rootDir: { type: 'string' },
        outputDir: { type: 'string' },
        relativePath: { type: 'string' },
        fileName: { type: 'string' },
        sizeBytes: { type: 'integer' },
        encoding: { type: 'string', enum: supportedEncodings },
        sha256: { type: 'string' }
      }
    },
    execute: async (input, context) => {
      try {
        return ok(
          await writeTempFile(
            input as WriteTempFileInput,
            undefined,
            context?.maxInputBytes ?? defaultMaxWriteBytes
          )
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
