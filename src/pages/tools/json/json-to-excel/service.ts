import { jsonToExcel } from '@private-toolbox/core';

export type JsonToExcelWebOptions = {
  text: string;
  sheetName: string;
  fileName: string;
  includeHeaders: boolean;
};

export type JsonToExcelWebResult = {
  file: File;
  rowCount: number;
  columnCount: number;
};

const base64ToBytes = (base64: string): Uint8Array => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

export const createJsonExcelFile = async ({
  text,
  sheetName,
  fileName,
  includeHeaders
}: JsonToExcelWebOptions): Promise<JsonToExcelWebResult> => {
  const result = await jsonToExcel({
    text,
    sheetName,
    fileName,
    includeHeaders,
    format: 'base64'
  });
  const bytes = base64ToBytes(result.text);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);

  return {
    file: new File([buffer], result.fileName, {
      type: result.mimeType
    }),
    rowCount: result.rowCount,
    columnCount: result.columnCount
  };
};
