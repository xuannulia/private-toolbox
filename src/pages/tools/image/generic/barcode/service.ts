import { generateBarcode } from '@private-toolbox/core';

export type BarcodeWebOptions = {
  text: string;
  moduleWidth: string;
  height: string;
  margin: string;
  foregroundColor: string;
  backgroundColor: string;
  displayText: boolean;
};

const toInteger = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const createBarcodeSvgFile = (options: BarcodeWebOptions): File => {
  const result = generateBarcode({
    text: options.text,
    moduleWidth: toInteger(options.moduleWidth, 2),
    height: toInteger(options.height, 96),
    margin: toInteger(options.margin, 10),
    foregroundColor: options.foregroundColor,
    backgroundColor: options.backgroundColor,
    displayText: options.displayText,
    format: 'svg'
  });

  return new File([result.text], 'barcode.svg', {
    type: result.mimeType
  });
};
