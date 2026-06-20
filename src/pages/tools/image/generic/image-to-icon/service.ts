import {
  createIcoFromPngImages,
  normalizeIconSizes,
  supportedIconSizes,
  type IconSize
} from '@private-toolbox/core/tools/ico';
import { type ImageToIconOptions, type ImageToIconResult } from './types';

export const webIconSizes = supportedIconSizes.map((size) => size);

export const replaceFileExtension = (name: string, extension: string) => {
  const cleanExtension = extension.replace(/^\./, '');
  const baseName = name.replace(/\.[^/.]+$/, '') || 'icon';
  return `${baseName}.${cleanExtension}`;
};

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

const canvasToPngBytes = (canvas: HTMLCanvasElement): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to render icon image'));
        return;
      }

      blob.arrayBuffer().then(
        (buffer) => resolve(new Uint8Array(buffer)),
        () => reject(new Error('Failed to read icon image'))
      );
    }, 'image/png');
  });

const renderIconPng = async (
  image: HTMLImageElement,
  size: IconSize
): Promise<Uint8Array> => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas is not available');
  }

  context.clearRect(0, 0, size, size);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const scale = Math.min(size / image.naturalWidth, size / image.naturalHeight);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const x = Math.round((size - width) / 2);
  const y = Math.round((size - height) / 2);

  context.drawImage(image, x, y, width, height);
  return canvasToPngBytes(canvas);
};

export const imageFileToIcon = async (
  file: File,
  options: ImageToIconOptions
): Promise<ImageToIconResult> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select an image file');
  }

  const sizes = normalizeIconSizes(options.sizes);
  const { image, objectUrl } = await loadImage(file);

  try {
    const pngImages = await Promise.all(
      sizes.map(async (size) => ({
        width: size,
        height: size,
        pngData: await renderIconPng(image, size)
      }))
    );
    const icoBytes = createIcoFromPngImages(pngImages);
    const icoBuffer = new ArrayBuffer(icoBytes.byteLength);
    new Uint8Array(icoBuffer).set(icoBytes);
    const iconFile = new File(
      [icoBuffer],
      replaceFileExtension(file.name, 'ico'),
      {
        type: 'image/x-icon'
      }
    );

    return {
      file: iconFile,
      sizes
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};
