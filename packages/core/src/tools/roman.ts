import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

const romanDirections = ['auto', 'to_roman', 'from_roman'] as const;

export type RomanConvertDirection = (typeof romanDirections)[number];

export type RomanConvertInput = {
  value: number | string;
  direction?: RomanConvertDirection;
};

export type RomanConvertOutput = {
  direction: Exclude<RomanConvertDirection, 'auto'>;
  number: number;
  roman: string;
  result: string;
};

const romanPairs = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I']
] as const;

const strictRomanPattern =
  /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

const normalizeDirection = (value: unknown): RomanConvertDirection => {
  if (value === undefined || value === null || value === '') return 'auto';
  if (
    typeof value !== 'string' ||
    !romanDirections.includes(value as RomanConvertDirection)
  ) {
    throw new ToolboxError(
      'ROMAN_INVALID_DIRECTION',
      `direction must be one of: ${romanDirections.join(', ')}`
    );
  }

  return value as RomanConvertDirection;
};

const normalizeIntegerValue = (value: unknown): number => {
  const numeric = typeof value === 'string' ? Number(value.trim()) : value;
  if (
    typeof numeric !== 'number' ||
    !Number.isInteger(numeric) ||
    numeric < 1 ||
    numeric > 3999
  ) {
    throw new ToolboxError(
      'ROMAN_INVALID_NUMBER',
      'number must be an integer from 1 to 3999'
    );
  }

  return numeric;
};

export const numberToRoman = (value: number): string => {
  let remaining = normalizeIntegerValue(value);
  let output = '';

  for (const [number, roman] of romanPairs) {
    while (remaining >= number) {
      output += roman;
      remaining -= number;
    }
  }

  return output;
};

export const romanToNumber = (value: string): number => {
  const normalized = value.trim().toUpperCase();
  if (!normalized || !strictRomanPattern.test(normalized)) {
    throw new ToolboxError(
      'ROMAN_INVALID_NUMERAL',
      'roman numeral must use standard subtractive notation from I to MMMCMXCIX'
    );
  }

  let index = 0;
  let total = 0;
  for (const [number, roman] of romanPairs) {
    while (normalized.startsWith(roman, index)) {
      total += number;
      index += roman.length;
    }
  }

  return total;
};

export const convertRoman = (input: RomanConvertInput): RomanConvertOutput => {
  const direction = normalizeDirection(input.direction);
  const inferredDirection =
    direction === 'auto'
      ? typeof input.value === 'number' ||
        (typeof input.value === 'string' &&
          /^[+-]?\d+$/.test(input.value.trim()))
        ? 'to_roman'
        : 'from_roman'
      : direction;

  if (inferredDirection === 'to_roman') {
    const number = normalizeIntegerValue(input.value);
    const roman = numberToRoman(number);
    return {
      direction: inferredDirection,
      number,
      roman,
      result: roman
    };
  }

  if (typeof input.value !== 'string') {
    throw new ToolboxError(
      'ROMAN_INVALID_NUMERAL',
      'roman numeral input must be a string'
    );
  }

  const number = romanToNumber(input.value);
  const roman = numberToRoman(number);

  return {
    direction: inferredDirection,
    number,
    roman,
    result: String(number)
  };
};

export const romanTools: ToolboxTool[] = [
  {
    name: 'roman.convert',
    title: 'Roman Numeral Converter',
    description: 'Convert between integers and Roman numerals.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['value'],
      additionalProperties: false,
      properties: {
        value: { type: ['number', 'string'] },
        direction: {
          type: 'string',
          enum: romanDirections,
          default: 'auto'
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['direction', 'number', 'roman', 'result'],
      additionalProperties: false,
      properties: {
        direction: { type: 'string', enum: ['to_roman', 'from_roman'] },
        number: { type: 'integer' },
        roman: { type: 'string' },
        result: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok(convertRoman(input as RomanConvertInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
