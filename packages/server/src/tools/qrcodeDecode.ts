import { stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import * as jsQRModule from 'jsqr';
import { type Options as JsQrOptions, type QRCode } from 'jsqr';
import Jimp from 'jimp';
import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '@private-toolbox/core';

export type QrCodeDecodeInput = {
  path: string;
  inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst';
};

export type QrCodePoint = {
  x: number;
  y: number;
};

export type QrCodeDecodeOutput = {
  path: string;
  name: string;
  sizeBytes: number;
  text: string;
  version: number;
  location: {
    topLeft: QrCodePoint;
    topRight: QrCodePoint;
    bottomLeft: QrCodePoint;
    bottomRight: QrCodePoint;
  };
};

const defaultMaxImageBytes = 16 * 1024 * 1024;
const inversionAttempts = [
  'dontInvert',
  'onlyInvert',
  'attemptBoth',
  'invertFirst'
] as const;

const jsQR = jsQRModule.default as unknown as (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: JsQrOptions
) => QRCode | null;

const normalizeInversionAttempts = (
  value?: QrCodeDecodeInput['inversionAttempts']
): NonNullable<QrCodeDecodeInput['inversionAttempts']> => {
  if (!value) return 'attemptBoth';
  if (inversionAttempts.includes(value)) return value;

  throw new ToolboxError(
    'QRCODE_DECODE_INVALID_INVERSION',
    `Unsupported QR code inversion mode: ${value}`
  );
};

const toPoint = (point: { x: number; y: number }): QrCodePoint => ({
  x: Math.round(point.x * 100) / 100,
  y: Math.round(point.y * 100) / 100
});

const toOutput = (
  code: QRCode,
  path: string,
  sizeBytes: number
): QrCodeDecodeOutput => ({
  path,
  name: basename(path),
  sizeBytes,
  text: code.data,
  version: code.version,
  location: {
    topLeft: toPoint(code.location.topLeftCorner),
    topRight: toPoint(code.location.topRightCorner),
    bottomLeft: toPoint(code.location.bottomLeftCorner),
    bottomRight: toPoint(code.location.bottomRightCorner)
  }
});

export const decodeQrCode = async (
  input: QrCodeDecodeInput,
  maxImageBytes = defaultMaxImageBytes
): Promise<QrCodeDecodeOutput> => {
  if (!input.path?.trim()) {
    throw new ToolboxError('QRCODE_DECODE_PATH_REQUIRED', 'Image path is required');
  }

  const absolutePath = resolve(input.path);
  const fileStat = await stat(absolutePath);

  if (!fileStat.isFile()) {
    throw new ToolboxError(
      'QRCODE_DECODE_NOT_FILE',
      'Path must point to a file'
    );
  }

  if (fileStat.size > maxImageBytes) {
    throw new ToolboxError(
      'QRCODE_DECODE_TOO_LARGE',
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
      'QRCODE_DECODE_IMAGE_FAILED',
      error instanceof Error ? error.message : 'Failed to decode image'
    );
  }

  const rgba = new Uint8ClampedArray(image.bitmap.data);
  const code = jsQR(rgba, image.bitmap.width, image.bitmap.height, {
    inversionAttempts: normalizeInversionAttempts(input.inversionAttempts)
  });

  if (!code) {
    throw new ToolboxError(
      'QRCODE_NOT_FOUND',
      'No QR code was found in the image'
    );
  }

  return toOutput(code, absolutePath, fileStat.size);
};

export const qrcodeDecodeTools: ToolboxTool[] = [
  {
    name: 'qrcode.decode',
    title: 'Decode QR Code',
    description: 'Decode the first QR code found in a local image file.',
    channels: ['api', 'mcp'],
    risks: ['file-read'],
    inputSchema: {
      type: 'object',
      required: ['path'],
      additionalProperties: false,
      properties: {
        path: { type: 'string' },
        inversionAttempts: {
          type: 'string',
          enum: inversionAttempts,
          default: 'attemptBoth'
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['path', 'name', 'sizeBytes', 'text', 'version', 'location'],
      additionalProperties: false,
      properties: {
        path: { type: 'string' },
        name: { type: 'string' },
        sizeBytes: { type: 'integer' },
        text: { type: 'string' },
        version: { type: 'integer' },
        location: {
          type: 'object',
          required: ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'],
          additionalProperties: false,
          properties: {
            topLeft: {
              type: 'object',
              required: ['x', 'y'],
              properties: { x: { type: 'number' }, y: { type: 'number' } }
            },
            topRight: {
              type: 'object',
              required: ['x', 'y'],
              properties: { x: { type: 'number' }, y: { type: 'number' } }
            },
            bottomLeft: {
              type: 'object',
              required: ['x', 'y'],
              properties: { x: { type: 'number' }, y: { type: 'number' } }
            },
            bottomRight: {
              type: 'object',
              required: ['x', 'y'],
              properties: { x: { type: 'number' }, y: { type: 'number' } }
            }
          }
        }
      }
    },
    execute: async (input, context) => {
      try {
        return ok(
          await decodeQrCode(
            input as QrCodeDecodeInput,
            context?.maxInputBytes ?? defaultMaxImageBytes
          )
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
