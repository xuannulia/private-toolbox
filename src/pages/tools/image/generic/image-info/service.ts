import { type ImageInfoResult, type ImageOrientation } from './types';

const extensionMimeTypes: Record<string, string> = {
  apng: 'image/apng',
  avif: 'image/avif',
  bmp: 'image/bmp',
  gif: 'image/gif',
  ico: 'image/x-icon',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp'
};

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

const formatBytes = (value: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${round(size, unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
};

const getExtension = (file: File): string =>
  file.name.split('.').pop()?.toLowerCase() || '';

const inferMimeType = (file: File): string => {
  if (file.type) return file.type;

  const extension = getExtension(file);
  return extensionMimeTypes[extension] || '';
};

const getOrientation = (width: number, height: number): ImageOrientation => {
  if (width === height) return 'square';
  return width > height ? 'landscape' : 'portrait';
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

const detectAlpha = (image: HTMLImageElement): boolean | null => {
  const maxSide = 512;
  const scale = Math.min(
    1,
    maxSide / Math.max(image.naturalWidth, image.naturalHeight)
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;

  try {
    context.drawImage(image, 0, 0, width, height);
    const data = context.getImageData(0, 0, width, height).data;

    for (let index = 3; index < data.length; index += 4) {
      if (data[index] < 255) return true;
    }

    return false;
  } catch {
    return null;
  }
};

export const inspectImageFile = async (
  file: File
): Promise<ImageInfoResult> => {
  const mimeType = inferMimeType(file);
  if (!mimeType.startsWith('image/')) {
    throw new Error('Please select an image file');
  }

  const { image, objectUrl } = await loadImage(file);

  try {
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    const divisor = gcd(width, height);

    return {
      name: file.name,
      sizeBytes: file.size,
      sizeText: formatBytes(file.size),
      mimeType,
      extension: getExtension(file),
      width,
      height,
      aspectRatio: round(width / height, 4),
      aspectRatioText: `${width / divisor}:${height / divisor}`,
      orientation: getOrientation(width, height),
      pixelCount: width * height,
      megapixels: round((width * height) / 1_000_000, 4),
      hasAlpha: detectAlpha(image),
      modifiedAt: new Date(file.lastModified).toISOString()
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};
