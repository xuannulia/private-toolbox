import { ImageBase64Format, ImageBase64Result } from './types';

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

const inferMimeType = (file: File): string => {
  if (file.type) return file.type;

  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension ? extensionMimeTypes[extension] || '' : '';
};

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Failed to read image as Data URL'));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () =>
      reject(reader.error || new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });

export const imageFileToBase64 = async (
  file: File,
  format: ImageBase64Format
): Promise<ImageBase64Result> => {
  const mimeType = inferMimeType(file);
  if (!mimeType.startsWith('image/')) {
    throw new Error('Please select an image file');
  }

  const dataUrl = await readAsDataUrl(file);
  const base64 = dataUrl.split(',')[1] ?? '';

  return {
    name: file.name,
    sizeBytes: file.size,
    mimeType,
    format,
    text: format === 'data_url' ? dataUrl : base64
  };
};
