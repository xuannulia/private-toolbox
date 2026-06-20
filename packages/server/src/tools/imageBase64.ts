import { readFile, stat } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '@private-toolbox/core';

export type ImageBase64Format = 'base64' | 'data_url';

export type ImageToBase64Input = {
  path: string;
  format?: ImageBase64Format;
  mimeType?: string;
};

export type ImageToBase64Output = {
  path: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  format: ImageBase64Format;
  text: string;
};

const defaultMaxImageBytes = 8 * 1024 * 1024;

const extensionMimeTypes: Record<string, string> = {
  '.apng': 'image/apng',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

const inferImageMimeType = (path: string, buffer: Buffer): string => {
  if (buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) {
    return 'image/png';
  }
  if (buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return 'image/jpeg';
  }
  if (
    buffer.subarray(0, 6).toString('ascii') === 'GIF87a' ||
    buffer.subarray(0, 6).toString('ascii') === 'GIF89a'
  ) {
    return 'image/gif';
  }
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  const mimeType = extensionMimeTypes[extname(path).toLowerCase()];
  if (mimeType) return mimeType;

  throw new ToolboxError(
    'IMAGE_BASE64_UNSUPPORTED_TYPE',
    'Supported image types are PNG, JPEG, GIF, WebP, SVG, ICO, BMP, APNG, and AVIF'
  );
};

const normalizeFormat = (format?: ImageBase64Format): ImageBase64Format => {
  if (!format) return 'data_url';
  if (format === 'base64' || format === 'data_url') return format;

  throw new ToolboxError(
    'IMAGE_BASE64_UNSUPPORTED_FORMAT',
    `Unsupported image Base64 format: ${format}`
  );
};

export const imageToBase64 = async (
  input: ImageToBase64Input,
  maxImageBytes = defaultMaxImageBytes
): Promise<ImageToBase64Output> => {
  if (!input.path?.trim()) {
    throw new ToolboxError('IMAGE_PATH_REQUIRED', 'Image path is required');
  }

  const absolutePath = resolve(input.path);
  const fileStat = await stat(absolutePath);

  if (!fileStat.isFile()) {
    throw new ToolboxError(
      'IMAGE_BASE64_NOT_FILE',
      'Path must point to a file'
    );
  }

  if (fileStat.size > maxImageBytes) {
    throw new ToolboxError(
      'IMAGE_BASE64_TOO_LARGE',
      `Image exceeds the ${maxImageBytes} byte limit`,
      {
        sizeBytes: fileStat.size,
        maxImageBytes
      }
    );
  }

  const buffer = await readFile(absolutePath);
  const mimeType =
    input.mimeType?.trim() || inferImageMimeType(absolutePath, buffer);
  if (!mimeType.startsWith('image/')) {
    throw new ToolboxError(
      'IMAGE_BASE64_INVALID_MIME',
      `Mime type must start with image/: ${mimeType}`
    );
  }

  const format = normalizeFormat(input.format);
  const base64 = buffer.toString('base64');

  return {
    path: absolutePath,
    name: basename(absolutePath),
    sizeBytes: fileStat.size,
    mimeType,
    format,
    text: format === 'data_url' ? `data:${mimeType};base64,${base64}` : base64
  };
};

export const imageBase64Tools: ToolboxTool[] = [
  {
    name: 'image.to_base64',
    title: 'Image to Base64',
    description: 'Encode a local image file as Base64 or a Data URL.',
    channels: ['api', 'mcp'],
    risks: ['file-read'],
    inputSchema: {
      type: 'object',
      required: ['path'],
      additionalProperties: false,
      properties: {
        path: { type: 'string' },
        format: {
          type: 'string',
          enum: ['base64', 'data_url'],
          default: 'data_url'
        },
        mimeType: {
          type: 'string',
          description: 'Optional image MIME type override.'
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['path', 'name', 'sizeBytes', 'mimeType', 'format', 'text'],
      additionalProperties: false,
      properties: {
        path: { type: 'string' },
        name: { type: 'string' },
        sizeBytes: { type: 'integer' },
        mimeType: { type: 'string' },
        format: { type: 'string', enum: ['base64', 'data_url'] },
        text: { type: 'string' }
      }
    },
    execute: async (input, context) => {
      try {
        return ok(
          await imageToBase64(
            input as ImageToBase64Input,
            context?.maxInputBytes ?? defaultMaxImageBytes
          )
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
