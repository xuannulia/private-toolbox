import {
  type JsonValue,
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type BarcodeFormat = 'svg' | 'data_url';

export type BarcodeGenerateInput = {
  text: string;
  format?: BarcodeFormat;
  moduleWidth?: number;
  height?: number;
  margin?: number;
  foregroundColor?: string;
  backgroundColor?: string;
  displayText?: boolean;
  fontSize?: number;
};

export type BarcodeGenerateOutput = {
  format: BarcodeFormat;
  mimeType: 'image/svg+xml';
  text: string;
  width: number;
  height: number;
  checksum: number;
};

const code128Patterns = [
  '212222',
  '222122',
  '222221',
  '121223',
  '121322',
  '131222',
  '122213',
  '122312',
  '132212',
  '221213',
  '221312',
  '231212',
  '112232',
  '122132',
  '122231',
  '113222',
  '123122',
  '123221',
  '223211',
  '221132',
  '221231',
  '213212',
  '223112',
  '312131',
  '311222',
  '321122',
  '321221',
  '312212',
  '322112',
  '322211',
  '212123',
  '212321',
  '232121',
  '111323',
  '131123',
  '131321',
  '112313',
  '132113',
  '132311',
  '211313',
  '231113',
  '231311',
  '112133',
  '112331',
  '132131',
  '113123',
  '113321',
  '133121',
  '313121',
  '211331',
  '231131',
  '213113',
  '213311',
  '213131',
  '311123',
  '311321',
  '331121',
  '312113',
  '312311',
  '332111',
  '314111',
  '221411',
  '431111',
  '111224',
  '111422',
  '121124',
  '121421',
  '141122',
  '141221',
  '112214',
  '112412',
  '122114',
  '122411',
  '142112',
  '142211',
  '241211',
  '221114',
  '413111',
  '241112',
  '134111',
  '111242',
  '121142',
  '121241',
  '114212',
  '124112',
  '124211',
  '411212',
  '421112',
  '421211',
  '212141',
  '214121',
  '412121',
  '111143',
  '111341',
  '131141',
  '114113',
  '114311',
  '411113',
  '411311',
  '113141',
  '114131',
  '311141',
  '411131',
  '211412',
  '211214',
  '211232',
  '2331112'
] as const;

const startCodeB = 104;
const stopCode = 106;
const barcodeFormats: BarcodeFormat[] = ['svg', 'data_url'];
const colorPattern =
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizeFormat = (format?: BarcodeFormat): BarcodeFormat => {
  if (!format) return 'svg';
  if (barcodeFormats.includes(format)) return format;

  throw new ToolboxError(
    'BARCODE_UNSUPPORTED_FORMAT',
    `Unsupported barcode output format: ${format}`
  );
};

const normalizeInteger = (
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
  label: string
): number => {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ToolboxError(
      'BARCODE_INVALID_OPTION',
      `${label} must be an integer between ${min} and ${max}`
    );
  }

  return value;
};

const normalizeColor = (
  value: string | undefined,
  fallback: string
): string => {
  if (value === undefined) return fallback;
  if (!colorPattern.test(value)) {
    throw new ToolboxError(
      'BARCODE_INVALID_COLOR',
      `Barcode colors must be hex colors: ${value}`
    );
  }

  return value;
};

const encodeCode128B = (
  text: string
): { codes: number[]; checksum: number } => {
  if (typeof text !== 'string' || text.length === 0) {
    throw new ToolboxError('BARCODE_TEXT_REQUIRED', 'Barcode text is required');
  }

  if (text.length > 256) {
    throw new ToolboxError(
      'BARCODE_TEXT_TOO_LONG',
      'Barcode text must be 256 characters or fewer',
      { length: text.length }
    );
  }

  const dataCodes = Array.from(text, (character) => {
    const charCode = character.charCodeAt(0);
    if (charCode < 32 || charCode > 127) {
      throw new ToolboxError(
        'BARCODE_UNSUPPORTED_CHARACTER',
        'Code 128 B supports ASCII characters from space through DEL only',
        {
          character,
          charCode
        }
      );
    }

    return charCode - 32;
  });

  const checksum =
    (startCodeB +
      dataCodes.reduce((sum, code, index) => sum + code * (index + 1), 0)) %
    103;

  return {
    codes: [startCodeB, ...dataCodes, checksum, stopCode],
    checksum
  };
};

const patternWidth = (pattern: string): number =>
  Array.from(pattern).reduce((sum, item) => sum + Number(item), 0);

const renderBars = (
  codes: number[],
  moduleWidth: number,
  margin: number,
  height: number,
  foregroundColor: string
): { bars: string; widthModules: number } => {
  let xModules = margin;
  const bars: string[] = [];

  for (const code of codes) {
    const pattern = code128Patterns[code];
    let isBar = true;

    for (const item of pattern) {
      const widthModules = Number(item);
      if (isBar) {
        bars.push(
          `<rect x="${xModules * moduleWidth}" y="0" width="${
            widthModules * moduleWidth
          }" height="${height}" fill="${foregroundColor}"/>`
        );
      }
      xModules += widthModules;
      isBar = !isBar;
    }
  }

  return {
    bars: bars.join(''),
    widthModules:
      margin * 2 +
      codes.reduce((sum, code) => sum + patternWidth(code128Patterns[code]), 0)
  };
};

export const generateBarcode = (
  input: BarcodeGenerateInput
): BarcodeGenerateOutput => {
  const format = normalizeFormat(input.format);
  const moduleWidth = normalizeInteger(
    input.moduleWidth,
    2,
    1,
    10,
    'moduleWidth'
  );
  const barHeight = normalizeInteger(input.height, 96, 24, 400, 'height');
  const margin = normalizeInteger(input.margin, 10, 0, 50, 'margin');
  const fontSize = normalizeInteger(input.fontSize, 14, 8, 48, 'fontSize');
  const displayText = input.displayText ?? true;
  const foregroundColor = normalizeColor(input.foregroundColor, '#000000');
  const backgroundColor = normalizeColor(input.backgroundColor, '#ffffff');
  const { codes, checksum } = encodeCode128B(input.text);
  const { bars, widthModules } = renderBars(
    codes,
    moduleWidth,
    margin,
    barHeight,
    foregroundColor
  );
  const width = widthModules * moduleWidth;
  const height = barHeight + (displayText ? fontSize + 8 : 0);
  const label = displayText
    ? `<text x="${width / 2}" y="${
        barHeight + fontSize + 2
      }" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="${fontSize}" fill="${foregroundColor}">${escapeXml(
        input.text
      )}</text>`
    : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Barcode"><rect width="100%" height="100%" fill="${backgroundColor}"/>${bars}${label}</svg>`;

  return {
    format,
    mimeType: 'image/svg+xml',
    text:
      format === 'data_url'
        ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
        : svg,
    width,
    height,
    checksum
  };
};

export const barcodeTools: ToolboxTool[] = [
  {
    name: 'barcode.generate',
    title: 'Generate Barcode',
    description: 'Generate a Code 128 barcode as SVG or SVG Data URL.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        format: {
          type: 'string',
          enum: barcodeFormats,
          default: 'svg'
        },
        moduleWidth: {
          type: 'integer',
          minimum: 1,
          maximum: 10,
          default: 2
        },
        height: {
          type: 'integer',
          minimum: 24,
          maximum: 400,
          default: 96
        },
        margin: {
          type: 'integer',
          minimum: 0,
          maximum: 50,
          default: 10
        },
        foregroundColor: {
          type: 'string',
          default: '#000000'
        },
        backgroundColor: {
          type: 'string',
          default: '#ffffff'
        },
        displayText: {
          type: 'boolean',
          default: true
        },
        fontSize: {
          type: 'integer',
          minimum: 8,
          maximum: 48,
          default: 14
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['format', 'mimeType', 'text', 'width', 'height', 'checksum'],
      additionalProperties: false,
      properties: {
        format: {
          type: 'string',
          enum: barcodeFormats
        },
        mimeType: { type: 'string', const: 'image/svg+xml' },
        text: { type: 'string' },
        width: { type: 'integer' },
        height: { type: 'integer' },
        checksum: { type: 'integer' }
      }
    },
    execute: (input) => {
      try {
        return ok(
          generateBarcode(input as BarcodeGenerateInput) as unknown as JsonValue
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
