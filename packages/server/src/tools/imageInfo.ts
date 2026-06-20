import { stat } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';
import Jimp from 'jimp';
import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '@private-toolbox/core';

export type ImageInfoInput = {
  path: string;
};

export type ImageOrientation = 'landscape' | 'portrait' | 'square';

export type ImageInfoOutput = {
  path: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  extension: string;
  width: number;
  height: number;
  aspectRatio: number;
  aspectRatioText: string;
  orientation: ImageOrientation;
  pixelCount: number;
  megapixels: number;
  hasAlpha: boolean;
  modifiedAt: string;
};

const defaultMaxImageBytes = 32 * 1024 * 1024;

const gcd = (left: number, right: number): number => {
  let a = Math.abs(left);
  let b = Math.abs(right);

  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }

  return a || 1;
};

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const getOrientation = (width: number, height: number): ImageOrientation => {
  if (width === height) return 'square';
  return width > height ? 'landscape' : 'portrait';
};

const getExtension = (path: string, image: Jimp): string => {
  const fileExtension = extname(path).toLowerCase().replace(/^\./, '');
  return fileExtension || image.getExtension() || '';
};

export const inspectImageInfo = async (
  input: ImageInfoInput,
  maxImageBytes = defaultMaxImageBytes
): Promise<ImageInfoOutput> => {
  if (!input.path?.trim()) {
    throw new ToolboxError('IMAGE_PATH_REQUIRED', 'Image path is required');
  }

  const absolutePath = resolve(input.path);
  const fileStat = await stat(absolutePath);

  if (!fileStat.isFile()) {
    throw new ToolboxError('IMAGE_INFO_NOT_FILE', 'Path must point to a file');
  }

  if (fileStat.size > maxImageBytes) {
    throw new ToolboxError(
      'IMAGE_INFO_TOO_LARGE',
      `Image exceeds the ${maxImageBytes} byte limit`,
      {
        sizeBytes: fileStat.size,
        maxImageBytes
      }
    );
  }

  let image: Jimp;
  try {
    image = await Jimp.read(absolutePath);
  } catch (error) {
    throw new ToolboxError(
      'IMAGE_INFO_DECODE_FAILED',
      error instanceof Error ? error.message : 'Failed to decode image'
    );
  }

  const width = image.bitmap.width;
  const height = image.bitmap.height;
  const divisor = gcd(width, height);

  return {
    path: absolutePath,
    name: basename(absolutePath),
    sizeBytes: fileStat.size,
    mimeType: image.getMIME(),
    extension: getExtension(absolutePath, image),
    width,
    height,
    aspectRatio: round(width / height, 4),
    aspectRatioText: `${width / divisor}:${height / divisor}`,
    orientation: getOrientation(width, height),
    pixelCount: width * height,
    megapixels: round((width * height) / 1_000_000, 4),
    hasAlpha: image.hasAlpha(),
    modifiedAt: fileStat.mtime.toISOString()
  };
};

export const imageInfoTools: ToolboxTool[] = [
  {
    name: 'image.info',
    title: 'Inspect Image Info',
    description:
      'Read basic dimensions and file metadata from a local image file path.',
    channels: ['api', 'mcp'],
    risks: ['file-read'],
    inputSchema: {
      type: 'object',
      required: ['path'],
      additionalProperties: false,
      properties: {
        path: { type: 'string' }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'path',
        'name',
        'sizeBytes',
        'mimeType',
        'extension',
        'width',
        'height',
        'aspectRatio',
        'aspectRatioText',
        'orientation',
        'pixelCount',
        'megapixels',
        'hasAlpha',
        'modifiedAt'
      ],
      additionalProperties: false,
      properties: {
        path: { type: 'string' },
        name: { type: 'string' },
        sizeBytes: { type: 'integer' },
        mimeType: { type: 'string' },
        extension: { type: 'string' },
        width: { type: 'integer' },
        height: { type: 'integer' },
        aspectRatio: { type: 'number' },
        aspectRatioText: { type: 'string' },
        orientation: {
          type: 'string',
          enum: ['landscape', 'portrait', 'square']
        },
        pixelCount: { type: 'integer' },
        megapixels: { type: 'number' },
        hasAlpha: { type: 'boolean' },
        modifiedAt: { type: 'string' }
      }
    },
    execute: async (input, context) => {
      try {
        return ok(
          await inspectImageInfo(
            input as ImageInfoInput,
            context?.maxInputBytes ?? defaultMaxImageBytes
          )
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
