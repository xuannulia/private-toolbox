import { mkdir, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import Jimp from 'jimp';
import {
  ToolboxError,
  createIcoFromPngImages,
  normalizeError,
  normalizeIconSizes,
  ok,
  type IconSize,
  type ToolboxTool
} from '@private-toolbox/core';
import { mergeFileToolConfig, type FileToolConfig } from '../config.js';

export type ImageIconFormat = 'data_url' | 'base64';

export type ImageToIconInput = {
  path: string;
  sizes?: number[];
  format?: ImageIconFormat;
  outputPath?: string;
};

export type ImageToIconOutput = {
  path: string;
  name: string;
  sourceSizeBytes: number;
  mimeType: 'image/x-icon';
  format: ImageIconFormat;
  sizes: IconSize[];
  sizeBytes: number;
  text: string;
  outputPath?: string;
};

const defaultMaxImageBytes = 16 * 1024 * 1024;
const defaultMaxIconBytes = 4 * 1024 * 1024;

const normalizeFormat = (format?: ImageIconFormat): ImageIconFormat => {
  if (!format) return 'data_url';
  if (format === 'data_url' || format === 'base64') return format;

  throw new ToolboxError(
    'IMAGE_ICON_FORMAT_UNSUPPORTED',
    `Unsupported icon output format: ${format}`
  );
};

const isPathInside = (rootDir: string, targetPath: string): boolean => {
  const diff = relative(rootDir, targetPath);
  return diff === '' || (!diff.startsWith('..') && !isAbsolute(diff));
};

const createDefaultOutputPath = (inputPath: string, config: FileToolConfig) => {
  const name = basename(inputPath, extname(inputPath)) || 'icon';
  return resolve(config.outputDir, `${name}.ico`);
};

const resolveAllowedOutputPath = async (
  inputPath: string,
  outputPath: string | undefined,
  config: FileToolConfig
) => {
  if (!outputPath?.trim()) return undefined;

  const rootDir = resolve(config.rootDir);
  const targetPath = resolve(
    outputPath === 'auto' ? createDefaultOutputPath(inputPath, config) : outputPath
  );

  if (!isPathInside(rootDir, targetPath)) {
    throw new ToolboxError(
      'IMAGE_ICON_OUTPUT_OUTSIDE_ROOT',
      'Icon output path is outside the configured file tool root',
      {
        rootDir,
        outputPath: targetPath
      }
    );
  }

  if (extname(targetPath).toLowerCase() !== '.ico') {
    throw new ToolboxError(
      'IMAGE_ICON_OUTPUT_EXTENSION_INVALID',
      'Icon output path must end with .ico'
    );
  }

  await mkdir(dirname(targetPath), { recursive: true });
  return targetPath;
};

const renderPngSizes = async (path: string, sizes: IconSize[]) => {
  let image: Jimp;
  try {
    image = await Jimp.read(path);
  } catch (error) {
    throw new ToolboxError(
      'IMAGE_ICON_DECODE_FAILED',
      error instanceof Error ? error.message : 'Failed to decode image'
    );
  }

  return Promise.all(
    sizes.map(async (size) => {
      const resized = image.clone().scaleToFit(size, size);
      const canvas = await new Jimp(size, size, 0x00000000);
      canvas.composite(
        resized,
        Math.round((size - resized.bitmap.width) / 2),
        Math.round((size - resized.bitmap.height) / 2)
      );

      const pngData = await canvas.getBufferAsync(Jimp.MIME_PNG);
      return {
        width: size,
        height: size,
        pngData
      };
    })
  );
};

export const imageToIcon = async (
  input: ImageToIconInput,
  configOverride?: Partial<FileToolConfig>,
  maxImageBytes = defaultMaxImageBytes,
  maxIconBytes = defaultMaxIconBytes
): Promise<ImageToIconOutput> => {
  if (!input.path?.trim()) {
    throw new ToolboxError('IMAGE_PATH_REQUIRED', 'Image path is required');
  }

  const absolutePath = resolve(input.path);
  const fileStat = await stat(absolutePath);

  if (!fileStat.isFile()) {
    throw new ToolboxError('IMAGE_ICON_NOT_FILE', 'Path must point to a file');
  }

  if (fileStat.size > maxImageBytes) {
    throw new ToolboxError(
      'IMAGE_ICON_INPUT_TOO_LARGE',
      `Image exceeds the ${maxImageBytes} byte limit`,
      {
        sizeBytes: fileStat.size,
        maxImageBytes
      }
    );
  }

  const sizes = normalizeIconSizes(input.sizes);
  const format = normalizeFormat(input.format);
  const images = await renderPngSizes(absolutePath, sizes);
  const icoBytes = createIcoFromPngImages(images);

  if (icoBytes.byteLength > maxIconBytes) {
    throw new ToolboxError(
      'IMAGE_ICON_OUTPUT_TOO_LARGE',
      `Icon output exceeds the ${maxIconBytes} byte limit`,
      {
        sizeBytes: icoBytes.byteLength,
        maxIconBytes
      }
    );
  }

  const outputPath = await resolveAllowedOutputPath(
    absolutePath,
    input.outputPath,
    mergeFileToolConfig(configOverride)
  );
  const buffer = Buffer.from(icoBytes);

  if (outputPath) {
    await writeFile(outputPath, buffer);
  }

  const base64 = buffer.toString('base64');
  return {
    path: absolutePath,
    name: basename(absolutePath),
    sourceSizeBytes: fileStat.size,
    mimeType: 'image/x-icon',
    format,
    sizes,
    sizeBytes: buffer.byteLength,
    text: format === 'data_url' ? `data:image/x-icon;base64,${base64}` : base64,
    ...(outputPath ? { outputPath } : {})
  };
};

export const imageIconTools: ToolboxTool[] = [
  {
    name: 'image.to_icon',
    title: 'Image to Icon',
    description:
      'Convert a local image file into a multi-size ICO file as Base64 or an optional written file.',
    channels: ['api', 'mcp'],
    risks: ['file-read', 'file-write'],
    inputSchema: {
      type: 'object',
      required: ['path'],
      additionalProperties: false,
      properties: {
        path: { type: 'string' },
        sizes: {
          type: 'array',
          items: {
            type: 'integer',
            enum: [16, 24, 32, 48, 64, 128, 256]
          },
          uniqueItems: true,
          default: [16, 32, 48, 64, 128, 256]
        },
        format: {
          type: 'string',
          enum: ['data_url', 'base64'],
          default: 'data_url'
        },
        outputPath: {
          type: 'string',
          description:
            'Optional .ico output path inside PRIVATE_TOOLBOX_FILE_ROOT. Use "auto" for the configured output directory.'
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'path',
        'name',
        'sourceSizeBytes',
        'mimeType',
        'format',
        'sizes',
        'sizeBytes',
        'text'
      ],
      additionalProperties: false,
      properties: {
        path: { type: 'string' },
        name: { type: 'string' },
        sourceSizeBytes: { type: 'integer' },
        mimeType: { type: 'string', const: 'image/x-icon' },
        format: { type: 'string', enum: ['data_url', 'base64'] },
        sizes: {
          type: 'array',
          items: { type: 'integer' }
        },
        sizeBytes: { type: 'integer' },
        text: { type: 'string' },
        outputPath: { type: 'string' }
      }
    },
    execute: async (input, context) => {
      try {
        return ok(
          await imageToIcon(
            input as ImageToIconInput,
            undefined,
            context?.maxInputBytes ?? defaultMaxImageBytes,
            context?.maxOutputBytes ?? defaultMaxIconBytes
          )
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
