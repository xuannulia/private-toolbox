import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type ColorConvertInput = {
  color?: string;
  red?: number;
  green?: number;
  blue?: number;
  alpha?: number;
  uppercase?: boolean;
};

export type ColorConvertOutput = {
  input: string;
  sourceFormat: 'hex' | 'rgb' | 'components';
  hex: string;
  hexa: string;
  rgb: {
    red: number;
    green: number;
    blue: number;
  };
  alpha: number;
  cssRgb: string;
  cssRgba: string;
  relativeLuminance: number;
  contrastText: '#000000' | '#ffffff';
};

type RgbaColor = {
  red: number;
  green: number;
  blue: number;
  alpha: number;
  sourceFormat: ColorConvertOutput['sourceFormat'];
  input: string;
};

const hexPattern = /^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const cssRgbPattern = /^rgba?\((.+)\)$/i;

const normalizeChannel = (value: unknown, name: string): number => {
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (
    typeof numeric !== 'number' ||
    !Number.isFinite(numeric) ||
    !Number.isInteger(numeric) ||
    numeric < 0 ||
    numeric > 255
  ) {
    throw new ToolboxError(
      'COLOR_INVALID_CHANNEL',
      `${name} must be an integer between 0 and 255`
    );
  }

  return numeric;
};

const normalizeAlpha = (value: unknown): number => {
  if (value === undefined || value === null || value === '') return 1;

  if (typeof value === 'string' && value.trim().endsWith('%')) {
    const percent = Number(value.trim().slice(0, -1));
    if (Number.isFinite(percent) && percent >= 0 && percent <= 100) {
      return percent / 100;
    }
  }

  const numeric = typeof value === 'string' ? Number(value) : value;
  if (
    typeof numeric !== 'number' ||
    !Number.isFinite(numeric) ||
    numeric < 0 ||
    numeric > 1
  ) {
    throw new ToolboxError(
      'COLOR_INVALID_ALPHA',
      'alpha must be a number between 0 and 1'
    );
  }

  return numeric;
};

const normalizeAlphaOutput = (value: number): number =>
  Math.round(value * 1000) / 1000;

const parseHexPair = (value: string): number => Number.parseInt(value, 16);

const expandHex = (value: string): string =>
  value.length === 3 || value.length === 4
    ? value
        .split('')
        .map((item) => `${item}${item}`)
        .join('')
    : value;

const parseHexColor = (input: string): RgbaColor | null => {
  const match = input.trim().match(hexPattern);
  if (!match) return null;

  const hex = expandHex(match[1]);
  return {
    red: parseHexPair(hex.slice(0, 2)),
    green: parseHexPair(hex.slice(2, 4)),
    blue: parseHexPair(hex.slice(4, 6)),
    alpha: hex.length === 8 ? parseHexPair(hex.slice(6, 8)) / 255 : 1,
    sourceFormat: 'hex',
    input: input.trim()
  };
};

const parseChannelToken = (value: string, name: string): number => {
  const trimmed = value.trim();
  if (trimmed.endsWith('%')) {
    const percent = Number(trimmed.slice(0, -1));
    if (Number.isFinite(percent) && percent >= 0 && percent <= 100) {
      return Math.round((percent / 100) * 255);
    }
  }

  return normalizeChannel(trimmed, name);
};

const parseRgbTokens = (input: string, rawTokens: string[]): RgbaColor => {
  if (rawTokens.length !== 3 && rawTokens.length !== 4) {
    throw new ToolboxError(
      'COLOR_INVALID_RGB',
      'RGB input must contain 3 channels and an optional alpha value'
    );
  }

  return {
    red: parseChannelToken(rawTokens[0], 'red'),
    green: parseChannelToken(rawTokens[1], 'green'),
    blue: parseChannelToken(rawTokens[2], 'blue'),
    alpha: normalizeAlpha(rawTokens[3]),
    sourceFormat: 'rgb',
    input: input.trim()
  };
};

const parseRgbColor = (input: string): RgbaColor | null => {
  const trimmed = input.trim();
  const cssMatch = trimmed.match(cssRgbPattern);
  if (cssMatch) {
    const tokens = cssMatch[1]
      .replace(/\s*\/\s*/g, ' ')
      .split(/[\s,]+/)
      .filter(Boolean);
    return parseRgbTokens(input, tokens);
  }

  if (/^[\d.\s,%]+$/.test(trimmed)) {
    return parseRgbTokens(input, trimmed.split(/[\s,]+/).filter(Boolean));
  }

  return null;
};

const parseComponentColor = (input: ColorConvertInput): RgbaColor | null => {
  if (
    input.red === undefined &&
    input.green === undefined &&
    input.blue === undefined
  ) {
    return null;
  }

  return {
    red: normalizeChannel(input.red, 'red'),
    green: normalizeChannel(input.green, 'green'),
    blue: normalizeChannel(input.blue, 'blue'),
    alpha: normalizeAlpha(input.alpha),
    sourceFormat: 'components',
    input: `${input.red}, ${input.green}, ${input.blue}${
      input.alpha === undefined ? '' : `, ${input.alpha}`
    }`
  };
};

const parseColorInput = (input: ColorConvertInput): RgbaColor => {
  if (input.color?.trim()) {
    const colorText = input.color.trim();
    const parsed = parseHexColor(colorText) ?? parseRgbColor(colorText);
    if (!parsed) {
      throw new ToolboxError(
        'COLOR_INVALID_INPUT',
        'Color must be a HEX value or an RGB/RGBA value'
      );
    }

    return parsed;
  }

  const components = parseComponentColor(input);
  if (components) return components;

  throw new ToolboxError(
    'COLOR_INPUT_REQUIRED',
    'Provide a color string or RGB component values'
  );
};

const hexByte = (value: number, uppercase: boolean): string => {
  const output = value.toString(16).padStart(2, '0');
  return uppercase ? output.toUpperCase() : output;
};

const toHexColor = (
  { red, green, blue, alpha }: RgbaColor,
  uppercase: boolean
): { hex: string; hexa: string } => {
  const rgbHex = [red, green, blue]
    .map((value) => hexByte(value, uppercase))
    .join('');
  const alphaHex = hexByte(Math.round(alpha * 255), uppercase);

  return {
    hex: `#${rgbHex}`,
    hexa: `#${rgbHex}${alphaHex}`
  };
};

const linearizedChannel = (value: number): number => {
  const normalized = value / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = ({ red, green, blue }: RgbaColor): number =>
  0.2126 * linearizedChannel(red) +
  0.7152 * linearizedChannel(green) +
  0.0722 * linearizedChannel(blue);

export const convertColor = (input: ColorConvertInput): ColorConvertOutput => {
  const color = parseColorInput(input);
  const uppercase = input.uppercase ?? false;
  const { hex, hexa } = toHexColor(color, uppercase);
  const alpha = normalizeAlphaOutput(color.alpha);
  const luminance = relativeLuminance(color);

  return {
    input: color.input,
    sourceFormat: color.sourceFormat,
    hex,
    hexa,
    rgb: {
      red: color.red,
      green: color.green,
      blue: color.blue
    },
    alpha,
    cssRgb: `rgb(${color.red}, ${color.green}, ${color.blue})`,
    cssRgba: `rgba(${color.red}, ${color.green}, ${color.blue}, ${alpha})`,
    relativeLuminance: Math.round(luminance * 10000) / 10000,
    contrastText: luminance > 0.179 ? '#000000' : '#ffffff'
  };
};

export const colorTools: ToolboxTool[] = [
  {
    name: 'color.convert',
    title: 'Color Converter',
    description: 'Convert HEX and RGB/RGBA colors.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        color: {
          type: 'string',
          description: 'HEX, RGB, or RGBA color input'
        },
        red: { type: 'integer', minimum: 0, maximum: 255 },
        green: { type: 'integer', minimum: 0, maximum: 255 },
        blue: { type: 'integer', minimum: 0, maximum: 255 },
        alpha: { type: 'number', minimum: 0, maximum: 1, default: 1 },
        uppercase: { type: 'boolean', default: false }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'input',
        'sourceFormat',
        'hex',
        'hexa',
        'rgb',
        'alpha',
        'cssRgb',
        'cssRgba',
        'relativeLuminance',
        'contrastText'
      ],
      additionalProperties: false,
      properties: {
        input: { type: 'string' },
        sourceFormat: { type: 'string' },
        hex: { type: 'string' },
        hexa: { type: 'string' },
        rgb: {
          type: 'object',
          required: ['red', 'green', 'blue'],
          additionalProperties: false,
          properties: {
            red: { type: 'integer' },
            green: { type: 'integer' },
            blue: { type: 'integer' }
          }
        },
        alpha: { type: 'number' },
        cssRgb: { type: 'string' },
        cssRgba: { type: 'string' },
        relativeLuminance: { type: 'number' },
        contrastText: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok(convertColor((input ?? {}) as ColorConvertInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
