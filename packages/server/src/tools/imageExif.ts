import { readFile, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import exifParser from 'exif-parser';
import {
  type JsonValue,
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '@private-toolbox/core';

export type ImageExifInput = {
  path: string;
};

export type ImageExifSize = {
  width: number;
  height: number;
};

export type ImageExifThumbnail = {
  exists: boolean;
  mimeType: 'image/jpeg' | 'image/tiff' | null;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
};

export type ImageExifOutput = {
  path: string;
  name: string;
  sizeBytes: number;
  hasExif: boolean;
  tagCount: number;
  imageSize: ImageExifSize | null;
  tags: Record<string, JsonValue>;
  thumbnail: ImageExifThumbnail;
};

const defaultMaxImageBytes = 32 * 1024 * 1024;

const isJsonPrimitive = (
  value: unknown
): value is string | number | boolean | null =>
  value === null ||
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean';

const toJsonValue = (value: unknown): JsonValue => {
  if (isJsonPrimitive(value)) {
    return typeof value === 'number'
      ? Number.isFinite(value)
        ? value
        : null
      : value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return {
      type: 'binary',
      sizeBytes: value.byteLength
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }

  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        toJsonValue(item)
      ])
    );
  }

  return String(value);
};

const toTags = (tags: Record<string, unknown>): Record<string, JsonValue> =>
  Object.fromEntries(
    Object.entries(tags).map(([key, value]) => [key, toJsonValue(value)])
  );

const toImageSize = (size: ImageExifSize | undefined): ImageExifSize | null => {
  if (
    !size ||
    typeof size.width !== 'number' ||
    typeof size.height !== 'number'
  ) {
    return null;
  }

  return {
    width: size.width,
    height: size.height
  };
};

export const inspectImageExif = async (
  input: ImageExifInput,
  maxImageBytes = defaultMaxImageBytes
): Promise<ImageExifOutput> => {
  if (!input.path?.trim()) {
    throw new ToolboxError('IMAGE_PATH_REQUIRED', 'Image path is required');
  }

  const absolutePath = resolve(input.path);
  const fileStat = await stat(absolutePath);

  if (!fileStat.isFile()) {
    throw new ToolboxError('IMAGE_EXIF_NOT_FILE', 'Path must point to a file');
  }

  if (fileStat.size > maxImageBytes) {
    throw new ToolboxError(
      'IMAGE_EXIF_TOO_LARGE',
      `Image exceeds the ${maxImageBytes} byte limit`,
      {
        sizeBytes: fileStat.size,
        maxImageBytes
      }
    );
  }

  const buffer = await readFile(absolutePath);

  try {
    const parser = exifParser
      .create(buffer)
      .enableBinaryFields(false)
      .enableImageSize(true)
      .enablePointers(false)
      .enableReturnTags(true)
      .enableSimpleValues(true)
      .enableTagNames(true);
    const result = parser.parse();
    const tags = toTags(result.tags ?? {});
    const thumbnailSize = result.hasThumbnail()
      ? result.getThumbnailSize()
      : undefined;
    const thumbnailMimeType = result.hasThumbnail('image/jpeg')
      ? 'image/jpeg'
      : result.hasThumbnail('image/tiff')
        ? 'image/tiff'
        : null;

    return {
      path: absolutePath,
      name: basename(absolutePath),
      sizeBytes: fileStat.size,
      hasExif: Object.keys(tags).length > 0,
      tagCount: Object.keys(tags).length,
      imageSize: toImageSize(result.getImageSize() ?? result.imageSize),
      tags,
      thumbnail: {
        exists: result.hasThumbnail(),
        mimeType: thumbnailMimeType,
        width: thumbnailSize?.width ?? null,
        height: thumbnailSize?.height ?? null,
        sizeBytes: result.hasThumbnail() ? result.getThumbnailLength() : null
      }
    };
  } catch (error) {
    throw new ToolboxError(
      'IMAGE_EXIF_PARSE_FAILED',
      error instanceof Error ? error.message : 'Failed to parse EXIF metadata'
    );
  }
};

const imageSizeSchema = {
  type: 'object',
  required: ['width', 'height'],
  additionalProperties: false,
  properties: {
    width: { type: 'integer' },
    height: { type: 'integer' }
  }
};

const thumbnailSchema = {
  type: 'object',
  required: ['exists', 'mimeType', 'width', 'height', 'sizeBytes'],
  additionalProperties: false,
  properties: {
    exists: { type: 'boolean' },
    mimeType: {
      type: ['string', 'null'],
      enum: ['image/jpeg', 'image/tiff', null]
    },
    width: { type: ['integer', 'null'] },
    height: { type: ['integer', 'null'] },
    sizeBytes: { type: ['integer', 'null'] }
  }
};

export const imageExifTools: ToolboxTool[] = [
  {
    name: 'image.exif',
    title: 'Inspect Image EXIF',
    description: 'Read EXIF metadata from a local image file path.',
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
        'hasExif',
        'tagCount',
        'imageSize',
        'tags',
        'thumbnail'
      ],
      additionalProperties: false,
      properties: {
        path: { type: 'string' },
        name: { type: 'string' },
        sizeBytes: { type: 'integer' },
        hasExif: { type: 'boolean' },
        tagCount: { type: 'integer' },
        imageSize: {
          anyOf: [imageSizeSchema, { type: 'null' }]
        },
        tags: {
          type: 'object',
          additionalProperties: true
        },
        thumbnail: thumbnailSchema
      }
    },
    execute: async (input, context) => {
      try {
        return ok(
          await inspectImageExif(
            input as ImageExifInput,
            context?.maxInputBytes ?? defaultMaxImageBytes
          )
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
