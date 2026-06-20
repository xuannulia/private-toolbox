import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type NumberBaseConvertInput = {
  value: string | number;
  fromBase?: number;
  toBase?: number;
  uppercase?: boolean;
  outputPrefix?: boolean;
};

export type NumberBaseConvertOutput = {
  input: string;
  normalizedInput: string;
  fromBase: number;
  toBase: number;
  value: string;
  prefixedValue: string;
  decimal: string;
  binary: string;
  octal: string;
  hexadecimal: string;
  isNegative: boolean;
};

const digits = '0123456789abcdefghijklmnopqrstuvwxyz';
const maxInputDigits = 4096;

const normalizeBase = (value: unknown, fallback: number): number => {
  const base = value === undefined ? fallback : value;
  if (
    typeof base !== 'number' ||
    !Number.isInteger(base) ||
    base < 2 ||
    base > 36
  ) {
    throw new ToolboxError(
      'BASE_CONVERT_INVALID_BASE',
      'Base must be an integer between 2 and 36'
    );
  }

  return base;
};

const normalizeInputValue = (value: unknown): string => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new ToolboxError(
        'BASE_CONVERT_INVALID_VALUE',
        'Numeric input must be a finite integer'
      );
    }

    return String(value);
  }

  if (typeof value !== 'string') {
    throw new ToolboxError(
      'BASE_CONVERT_INVALID_VALUE',
      'value must be a string or integer'
    );
  }

  const normalized = value.trim().replace(/[\s_]/g, '');
  if (!normalized) {
    throw new ToolboxError('BASE_CONVERT_VALUE_REQUIRED', 'value is required');
  }

  return normalized;
};

const detectBase = (
  value: string,
  explicitBase: number | undefined
): { base: number; body: string } => {
  const sign = value.startsWith('-') || value.startsWith('+') ? value[0] : '';
  const unsigned = sign ? value.slice(1) : value;
  const lowerUnsigned = unsigned.toLowerCase();
  const prefixBase = lowerUnsigned.startsWith('0x')
    ? 16
    : lowerUnsigned.startsWith('0b')
      ? 2
      : lowerUnsigned.startsWith('0o')
        ? 8
        : null;

  if (prefixBase !== null) {
    if (explicitBase !== undefined && explicitBase !== prefixBase) {
      throw new ToolboxError(
        'BASE_CONVERT_PREFIX_MISMATCH',
        `Input prefix implies base ${prefixBase}, but fromBase is ${explicitBase}`
      );
    }

    return {
      base: prefixBase,
      body: `${sign}${unsigned.slice(2)}`
    };
  }

  return {
    base: normalizeBase(explicitBase, 10),
    body: value
  };
};

const parseInteger = (value: string, base: number): bigint => {
  const sign = value.startsWith('-') ? -1n : 1n;
  const unsigned =
    value.startsWith('-') || value.startsWith('+') ? value.slice(1) : value;

  if (!unsigned) {
    throw new ToolboxError(
      'BASE_CONVERT_INVALID_VALUE',
      'value must contain digits'
    );
  }

  if (unsigned.length > maxInputDigits) {
    throw new ToolboxError(
      'BASE_CONVERT_INPUT_TOO_LONG',
      `value must contain at most ${maxInputDigits} digits`
    );
  }

  const radix = BigInt(base);
  let result = 0n;

  for (const character of unsigned.toLowerCase()) {
    const digit = digits.indexOf(character);
    if (digit < 0 || digit >= base) {
      throw new ToolboxError(
        'BASE_CONVERT_INVALID_DIGIT',
        `Digit "${character}" is not valid for base ${base}`
      );
    }

    result = result * radix + BigInt(digit);
  }

  return result * sign;
};

const formatInteger = (
  value: bigint,
  base: number,
  uppercase: boolean
): string => {
  const output = value.toString(base);
  return uppercase ? output.toUpperCase() : output;
};

const prefixForBase = (base: number): string =>
  base === 2 ? '0b' : base === 8 ? '0o' : base === 16 ? '0x' : '';

const withPrefix = (value: string, base: number): string => {
  const prefix = prefixForBase(base);
  if (!prefix) return value;
  const sign = value.startsWith('-') ? '-' : '';
  const unsigned = sign ? value.slice(1) : value;

  return `${sign}${prefix}${unsigned}`;
};

export const convertNumberBase = (
  input: NumberBaseConvertInput
): NumberBaseConvertOutput => {
  const normalizedValue = normalizeInputValue(input.value);
  const detected = detectBase(normalizedValue, input.fromBase);
  const toBase = normalizeBase(input.toBase, 10);
  const uppercase = input.uppercase ?? false;
  const integer = parseInteger(detected.body, detected.base);
  const value = formatInteger(integer, toBase, uppercase);
  const outputPrefix = input.outputPrefix ?? false;

  return {
    input: normalizedValue,
    normalizedInput: detected.body,
    fromBase: detected.base,
    toBase,
    value,
    prefixedValue: outputPrefix ? withPrefix(value, toBase) : value,
    decimal: integer.toString(10),
    binary: formatInteger(integer, 2, uppercase),
    octal: formatInteger(integer, 8, uppercase),
    hexadecimal: formatInteger(integer, 16, uppercase),
    isNegative: integer < 0n
  };
};

export const baseConvertTools: ToolboxTool[] = [
  {
    name: 'number.base_convert',
    title: 'Number Base Converter',
    description: 'Convert integers between bases 2 through 36.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['value'],
      additionalProperties: false,
      properties: {
        value: {
          type: ['string', 'integer'],
          description: 'Integer value to convert'
        },
        fromBase: {
          type: 'integer',
          minimum: 2,
          maximum: 36,
          description:
            'Source base. If omitted, 0x/0b/0o prefixes are detected.'
        },
        toBase: {
          type: 'integer',
          minimum: 2,
          maximum: 36,
          default: 10
        },
        uppercase: { type: 'boolean', default: false },
        outputPrefix: { type: 'boolean', default: false }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'input',
        'normalizedInput',
        'fromBase',
        'toBase',
        'value',
        'prefixedValue',
        'decimal',
        'binary',
        'octal',
        'hexadecimal',
        'isNegative'
      ],
      additionalProperties: false,
      properties: {
        input: { type: 'string' },
        normalizedInput: { type: 'string' },
        fromBase: { type: 'integer' },
        toBase: { type: 'integer' },
        value: { type: 'string' },
        prefixedValue: { type: 'string' },
        decimal: { type: 'string' },
        binary: { type: 'string' },
        octal: { type: 'string' },
        hexadecimal: { type: 'string' },
        isNegative: { type: 'boolean' }
      }
    },
    execute: (input) => {
      try {
        return ok(convertNumberBase(input as NumberBaseConvertInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
