import { ToolboxError } from '../types.js';

export type IconPngImage = {
  width: number;
  height: number;
  pngData: Uint8Array;
};

export const defaultIconSizes = [16, 32, 48, 64, 128, 256] as const;

export const supportedIconSizes = [
  16,
  24,
  32,
  48,
  64,
  128,
  256
] as const;

export type IconSize = (typeof supportedIconSizes)[number];

const supportedIconSizeSet = new Set<number>(supportedIconSizes);

const assertByteLengthFitsUint32 = (byteLength: number) => {
  if (byteLength > 0xffffffff) {
    throw new ToolboxError(
      'ICO_FILE_TOO_LARGE',
      'ICO output is too large to encode'
    );
  }
};

export const normalizeIconSizes = (sizes?: number[]): IconSize[] => {
  const requested = sizes?.length ? sizes : [...defaultIconSizes];
  const normalized = Array.from(new Set(requested)).sort((a, b) => a - b);

  for (const size of normalized) {
    if (!Number.isInteger(size) || !supportedIconSizeSet.has(size)) {
      throw new ToolboxError(
        'ICO_SIZE_UNSUPPORTED',
        `Unsupported icon size: ${size}`,
        {
          supportedSizes: supportedIconSizes.map((item) => item)
        }
      );
    }
  }

  return normalized as IconSize[];
};

export const createIcoFromPngImages = (images: IconPngImage[]): Uint8Array => {
  if (!images.length) {
    throw new ToolboxError(
      'ICO_IMAGES_REQUIRED',
      'At least one PNG image is required'
    );
  }

  const directoryBytes = 6 + images.length * 16;
  const imageBytes = images.reduce((sum, image) => {
    if (
      !Number.isInteger(image.width) ||
      !Number.isInteger(image.height) ||
      image.width < 1 ||
      image.width > 256 ||
      image.height < 1 ||
      image.height > 256
    ) {
      throw new ToolboxError(
        'ICO_IMAGE_SIZE_INVALID',
        'ICO image dimensions must be integers from 1 to 256'
      );
    }

    if (!image.pngData.byteLength) {
      throw new ToolboxError('ICO_IMAGE_EMPTY', 'ICO PNG image is empty');
    }

    assertByteLengthFitsUint32(image.pngData.byteLength);
    return sum + image.pngData.byteLength;
  }, 0);

  const totalBytes = directoryBytes + imageBytes;
  assertByteLengthFitsUint32(totalBytes);

  const output = new Uint8Array(totalBytes);
  const view = new DataView(output.buffer);
  let cursor = 0;

  view.setUint16(cursor, 0, true);
  cursor += 2;
  view.setUint16(cursor, 1, true);
  cursor += 2;
  view.setUint16(cursor, images.length, true);
  cursor += 2;

  let imageOffset = directoryBytes;
  for (const image of images) {
    output[cursor] = image.width === 256 ? 0 : image.width;
    output[cursor + 1] = image.height === 256 ? 0 : image.height;
    output[cursor + 2] = 0;
    output[cursor + 3] = 0;
    view.setUint16(cursor + 4, 1, true);
    view.setUint16(cursor + 6, 32, true);
    view.setUint32(cursor + 8, image.pngData.byteLength, true);
    view.setUint32(cursor + 12, imageOffset, true);
    cursor += 16;
    imageOffset += image.pngData.byteLength;
  }

  cursor = directoryBytes;
  for (const image of images) {
    output.set(image.pngData, cursor);
    cursor += image.pngData.byteLength;
  }

  return output;
};
