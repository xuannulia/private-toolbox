export type ImageOrientation = 'landscape' | 'portrait' | 'square';

export type ImageInfoResult = {
  name: string;
  sizeBytes: number;
  sizeText: string;
  mimeType: string;
  extension: string;
  width: number;
  height: number;
  aspectRatio: number;
  aspectRatioText: string;
  orientation: ImageOrientation;
  pixelCount: number;
  megapixels: number;
  hasAlpha: boolean | null;
  modifiedAt: string;
};
