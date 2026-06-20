declare module 'exif-parser' {
  export type ExifImageSize = {
    width: number;
    height: number;
  };

  export type ExifResult = {
    tags: Record<string, unknown>;
    imageSize?: ExifImageSize;
    hasThumbnail: (mimeType?: string) => boolean;
    getImageSize: () => ExifImageSize | undefined;
    getThumbnailSize: () => ExifImageSize | undefined;
    getThumbnailLength: () => number;
  };

  export type ExifParser = {
    enableBinaryFields: (enable: boolean) => ExifParser;
    enablePointers: (enable: boolean) => ExifParser;
    enableTagNames: (enable: boolean) => ExifParser;
    enableImageSize: (enable: boolean) => ExifParser;
    enableReturnTags: (enable: boolean) => ExifParser;
    enableSimpleValues: (enable: boolean) => ExifParser;
    parse: () => ExifResult;
  };

  const exifParser: {
    create: (buffer: Buffer | ArrayBuffer) => ExifParser;
  };

  export default exifParser;
}
