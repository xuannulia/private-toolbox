export type QrCodeDecodeOptions = Record<string, never>;

export type DecodedQrCodeResult = {
  text: string;
  version: number;
};
