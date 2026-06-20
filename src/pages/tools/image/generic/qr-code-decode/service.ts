import * as jsQRModule from 'jsqr';
import { type Options as JsQrOptions, type QRCode } from 'jsqr';
import { type DecodedQrCodeResult } from './types';

const jsQR = jsQRModule.default as unknown as (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: JsQrOptions
) => QRCode | null;

const loadImage = async (file: File) => {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.src = objectUrl;

  try {
    await image.decode();
    return { image, objectUrl };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error instanceof Error ? error : new Error('Failed to decode image');
  }
};

export const formatDecodedQrCode = (result: DecodedQrCodeResult) => result.text;

export const decodeQrCodeImageData = (
  imageData: ImageData
): DecodedQrCodeResult => {
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth'
  });

  if (!code) {
    throw new Error('No QR code was found in the image');
  }

  return {
    text: code.data,
    version: code.version
  };
};

export const decodeQrCodeFile = async (
  file: File
): Promise<DecodedQrCodeResult> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file');
  }

  const { image, objectUrl } = await loadImage(file);

  try {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    if (!context) {
      throw new Error('Canvas is not available');
    }

    context.drawImage(image, 0, 0);
    return decodeQrCodeImageData(
      context.getImageData(0, 0, canvas.width, canvas.height)
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};
