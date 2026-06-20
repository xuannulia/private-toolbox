export type ImageBase64Format = 'data_url' | 'base64';

export type InitialValuesType = {
  format: ImageBase64Format;
};

export type ImageBase64Result = {
  name: string;
  sizeBytes: number;
  mimeType: string;
  format: ImageBase64Format;
  text: string;
};
