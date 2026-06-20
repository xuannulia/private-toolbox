import * as QRCode from 'qrcode';
import {
  type JsonValue,
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type QrCodeOutputFormat = 'svg' | 'data_url' | 'utf8';
export type QrCodeErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';
export type QrCodeModuleStyle = 'square' | 'dots';

export type QrCodeGenerateInput = {
  text: string;
  format?: QrCodeOutputFormat;
  size?: number;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
  transparentBackground?: boolean;
  errorCorrectionLevel?: QrCodeErrorCorrectionLevel;
  moduleStyle?: QrCodeModuleStyle;
  logoDataUrl?: string;
  logoSizePercent?: number;
  logoPadding?: number;
};

export type QrCodeGenerateOutput = {
  format: QrCodeOutputFormat;
  mimeType: string;
  text: string;
};

const outputFormats: QrCodeOutputFormat[] = ['svg', 'data_url', 'utf8'];
const errorCorrectionLevels: QrCodeErrorCorrectionLevel[] = [
  'L',
  'M',
  'Q',
  'H'
];
const moduleStyles: QrCodeModuleStyle[] = ['square', 'dots'];
const colorPattern =
  /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const logoDataUrlPattern =
  /^data:image\/(?:png|jpe?g|webp|svg\+xml);base64,[A-Za-z0-9+/]+={0,2}$/;

const normalizeFormat = (format?: QrCodeOutputFormat): QrCodeOutputFormat => {
  if (!format) return 'svg';
  if (outputFormats.includes(format)) return format;

  throw new ToolboxError(
    'QRCODE_UNSUPPORTED_FORMAT',
    `Unsupported QR code output format: ${format}`
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
      'QRCODE_INVALID_OPTION',
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
      'QRCODE_INVALID_COLOR',
      `QR code colors must be hex colors: ${value}`
    );
  }

  return value;
};

const normalizeModuleStyle = (
  value: QrCodeModuleStyle | undefined
): QrCodeModuleStyle => {
  if (!value) return 'square';
  if (moduleStyles.includes(value)) return value;

  throw new ToolboxError(
    'QRCODE_INVALID_MODULE_STYLE',
    `Unsupported QR code module style: ${value}`
  );
};

const normalizeErrorCorrectionLevel = (
  value: QrCodeErrorCorrectionLevel | undefined,
  hasLogo = false
): QrCodeErrorCorrectionLevel => {
  if (!value) return hasLogo ? 'H' : 'M';
  if (errorCorrectionLevels.includes(value)) return value;

  throw new ToolboxError(
    'QRCODE_INVALID_ERROR_CORRECTION',
    `Unsupported QR code error correction level: ${value}`
  );
};

const normalizeLogoDataUrl = (
  value: string | undefined
): string | undefined => {
  if (value === undefined || value === '') return undefined;
  if (value.length > 512 * 1024) {
    throw new ToolboxError(
      'QRCODE_LOGO_TOO_LARGE',
      'Logo Data URL must be 512 KB or smaller',
      { length: value.length }
    );
  }
  if (!logoDataUrlPattern.test(value)) {
    throw new ToolboxError(
      'QRCODE_LOGO_INVALID',
      'Logo must be a base64 image Data URL'
    );
  }

  return value;
};

const getMimeType = (format: QrCodeOutputFormat): string => {
  if (format === 'svg') return 'image/svg+xml';
  if (format === 'data_url') return 'image/png';
  return 'text/plain';
};

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const expandHex = (value: string): string => {
  const hex = value.replace('#', '');
  if (hex.length === 3 || hex.length === 4) {
    return hex
      .split('')
      .map((character) => `${character}${character}`)
      .join('');
  }

  return hex.length === 6 ? `${hex}ff` : hex;
};

const getSvgColorAttributes = (color: string, attribute: string): string => {
  const expanded = expandHex(color);
  const alpha = parseInt(expanded.slice(6, 8), 16) / 255;
  const hex = `#${expanded.slice(0, 6)}`;
  const opacity = alpha < 1 ? ` ${attribute}-opacity="${round(alpha, 2)}"` : '';

  return `${attribute}="${hex}"${opacity}`;
};

const round = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const isTransparentColor = (color: string): boolean =>
  parseInt(expandHex(color).slice(6, 8), 16) === 0;

const svgCommand = (command: string, x: number, y?: number) =>
  `${command}${x}${typeof y === 'number' ? ` ${y}` : ''}`;

const qrToSquarePath = (
  data: Uint8Array,
  size: number,
  margin: number
): string => {
  let path = '';
  let moveBy = 0;
  let newRow = false;
  let lineLength = 0;

  for (let index = 0; index < data.length; index += 1) {
    const column = Math.floor(index % size);
    const row = Math.floor(index / size);

    if (!column && !newRow) newRow = true;

    if (data[index]) {
      lineLength += 1;

      if (!(index > 0 && column > 0 && data[index - 1])) {
        path += newRow
          ? svgCommand('M', column + margin, 0.5 + row + margin)
          : svgCommand('m', moveBy, 0);

        moveBy = 0;
        newRow = false;
      }

      if (!(column + 1 < size && data[index + 1])) {
        path += svgCommand('h', lineLength);
        lineLength = 0;
      }
    } else {
      moveBy += 1;
    }
  }

  return path;
};

const renderDotModules = (
  data: Uint8Array,
  size: number,
  margin: number,
  darkColor: string
): string => {
  const colorAttributes = getSvgColorAttributes(darkColor, 'fill');
  const modules: string[] = [];

  for (let index = 0; index < data.length; index += 1) {
    if (!data[index]) continue;

    const column = index % size;
    const row = Math.floor(index / size);
    modules.push(
      `<circle ${colorAttributes} cx="${column + margin + 0.5}" cy="${
        row + margin + 0.5
      }" r="0.42"/>`
    );
  }

  return modules.join('');
};

const renderLogo = ({
  logoDataUrl,
  lightColor,
  quietZoneSize,
  logoSizePercent,
  logoPadding
}: {
  logoDataUrl: string | undefined;
  lightColor: string;
  quietZoneSize: number;
  logoSizePercent: number;
  logoPadding: number;
}): string => {
  if (!logoDataUrl) return '';

  const logoSize = round((quietZoneSize * logoSizePercent) / 100, 2);
  const logoX = round((quietZoneSize - logoSize) / 2, 2);
  const backgroundSize = round(logoSize + logoPadding * 2, 2);
  const backgroundX = round(logoX - logoPadding, 2);
  const backgroundFill = isTransparentColor(lightColor)
    ? '#ffffff'
    : lightColor;

  return [
    `<rect ${getSvgColorAttributes(
      backgroundFill,
      'fill'
    )} x="${backgroundX}" y="${backgroundX}" width="${backgroundSize}" height="${backgroundSize}" rx="${round(
      logoPadding * 0.7,
      2
    )}"/>`,
    `<image href="${escapeXml(
      logoDataUrl
    )}" x="${logoX}" y="${logoX}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`
  ].join('');
};

const renderSvg = ({
  text,
  size,
  margin,
  darkColor,
  lightColor,
  errorCorrectionLevel,
  moduleStyle,
  logoDataUrl,
  logoSizePercent,
  logoPadding
}: {
  text: string;
  size: number;
  margin: number;
  darkColor: string;
  lightColor: string;
  errorCorrectionLevel: QrCodeErrorCorrectionLevel;
  moduleStyle: QrCodeModuleStyle;
  logoDataUrl: string | undefined;
  logoSizePercent: number;
  logoPadding: number;
}): string => {
  const qrData = QRCode.create(text, { errorCorrectionLevel });
  const moduleCount = qrData.modules.size;
  const data = qrData.modules.data;
  const quietZoneSize = moduleCount + margin * 2;
  const viewBox = `0 0 ${quietZoneSize} ${quietZoneSize}`;
  const background = isTransparentColor(lightColor)
    ? ''
    : `<path ${getSvgColorAttributes(
        lightColor,
        'fill'
      )} d="M0 0h${quietZoneSize}v${quietZoneSize}H0z"/>`;
  const modules =
    moduleStyle === 'dots'
      ? renderDotModules(data, moduleCount, margin, darkColor)
      : `<path ${getSvgColorAttributes(
          darkColor,
          'stroke'
        )} d="${qrToSquarePath(data, moduleCount, margin)}"/>`;
  const logo = renderLogo({
    logoDataUrl,
    lightColor,
    quietZoneSize,
    logoSizePercent,
    logoPadding
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}" shape-rendering="${
    moduleStyle === 'dots' ? 'geometricPrecision' : 'crispEdges'
  }">${background}${modules}${logo}</svg>\n`;
};

export const generateQrCode = async (
  input: QrCodeGenerateInput
): Promise<QrCodeGenerateOutput> => {
  const text = input.text;
  if (typeof text !== 'string' || !text.trim()) {
    throw new ToolboxError('QRCODE_TEXT_REQUIRED', 'QR code text is required');
  }
  if (text.length > 4096) {
    throw new ToolboxError(
      'QRCODE_TEXT_TOO_LONG',
      'QR code text must be 4096 characters or fewer',
      { length: text.length }
    );
  }

  const format = normalizeFormat(input.format);
  const size = normalizeInteger(input.size, 256, 64, 2048, 'size');
  const margin = normalizeInteger(input.margin, 4, 0, 20, 'margin');
  const darkColor = normalizeColor(input.darkColor, '#000000');
  const lightColor = input.transparentBackground
    ? '#ffffff00'
    : normalizeColor(input.lightColor, '#ffffff');
  const moduleStyle = normalizeModuleStyle(input.moduleStyle);
  const logoDataUrl = normalizeLogoDataUrl(input.logoDataUrl);
  const logoSizePercent = normalizeInteger(
    input.logoSizePercent,
    18,
    5,
    30,
    'logoSizePercent'
  );
  const logoPadding = normalizeInteger(
    input.logoPadding,
    1,
    0,
    8,
    'logoPadding'
  );
  const errorCorrectionLevel = normalizeErrorCorrectionLevel(
    input.errorCorrectionLevel,
    Boolean(logoDataUrl)
  );

  if (format !== 'svg' && (moduleStyle !== 'square' || logoDataUrl)) {
    throw new ToolboxError(
      'QRCODE_SVG_REQUIRED_FOR_STYLE',
      'QR code module style and logo options require SVG output'
    );
  }

  const options = {
    errorCorrectionLevel,
    margin,
    width: size,
    color: {
      dark: darkColor,
      light: lightColor
    }
  };

  const textOutput =
    format === 'svg'
      ? renderSvg({
          text,
          size,
          margin,
          darkColor,
          lightColor,
          errorCorrectionLevel,
          moduleStyle,
          logoDataUrl,
          logoSizePercent,
          logoPadding
        })
      : format === 'data_url'
        ? await QRCode.toDataURL(text, {
            ...options,
            type: 'image/png'
          })
        : await QRCode.toString(text, {
            ...options,
            type: format
          });

  return {
    format,
    mimeType: getMimeType(format),
    text: textOutput
  };
};

export const qrcodeTools: ToolboxTool[] = [
  {
    name: 'qrcode.generate',
    title: 'Generate QR Code',
    description: 'Generate a QR code from text as SVG, PNG Data URL, or UTF-8.',
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
          enum: outputFormats,
          default: 'svg'
        },
        size: {
          type: 'integer',
          minimum: 64,
          maximum: 2048,
          default: 256
        },
        margin: {
          type: 'integer',
          minimum: 0,
          maximum: 20,
          default: 4
        },
        darkColor: {
          type: 'string',
          default: '#000000'
        },
        lightColor: {
          type: 'string',
          default: '#ffffff'
        },
        transparentBackground: {
          type: 'boolean',
          default: false
        },
        errorCorrectionLevel: {
          type: 'string',
          enum: errorCorrectionLevels,
          default: 'M'
        },
        moduleStyle: {
          type: 'string',
          enum: moduleStyles,
          default: 'square'
        },
        logoDataUrl: {
          type: 'string',
          description:
            'Optional base64 image Data URL embedded in SVG output. For reliable scanning, use errorCorrectionLevel H.'
        },
        logoSizePercent: {
          type: 'integer',
          minimum: 5,
          maximum: 30,
          default: 18
        },
        logoPadding: {
          type: 'integer',
          minimum: 0,
          maximum: 8,
          default: 1
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['format', 'mimeType', 'text'],
      additionalProperties: false,
      properties: {
        format: {
          type: 'string',
          enum: outputFormats
        },
        mimeType: { type: 'string' },
        text: { type: 'string' }
      }
    },
    execute: async (input) => {
      try {
        return ok(
          (await generateQrCode(
            input as QrCodeGenerateInput
          )) as unknown as JsonValue
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
