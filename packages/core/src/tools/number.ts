import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

const extractionTypes = ['smart', 'delimiter'] as const;

export type NumberExtractionType = (typeof extractionTypes)[number];

export type NumberSumInput = {
  text?: string;
  numbers?: number[];
  extractionType?: NumberExtractionType;
  separator?: string;
  printRunningSum?: boolean;
  precision?: number;
};

export type NumberSumOutput = {
  numbers: number[];
  count: number;
  sum: number;
  runningSums: number[];
  result: string;
  extractionType: NumberExtractionType;
  separator: string;
};

export type NumberRandomInput = {
  min?: number;
  max?: number;
  minValue?: number;
  maxValue?: number;
  count?: number;
  allowDecimals?: boolean;
  allowDuplicates?: boolean;
  sortResults?: boolean;
  precision?: number;
  separator?: string;
};

export type NumberRandomOutput = {
  numbers: number[];
  min: number;
  max: number;
  count: number;
  allowDecimals: boolean;
  allowDuplicates: boolean;
  precision: number;
  hasDuplicates: boolean;
  isSorted: boolean;
  result: string;
};

const siUnits = ['b', 'B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'] as const;
const iecUnits = ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB'] as const;

export const dataUnits = [...siUnits, ...iecUnits] as const;
export type DataUnit = (typeof dataUnits)[number];

export const dataUnitFactors: Record<DataUnit, number> = {
  b: 1 / 8,
  B: 1,
  KB: 1e3,
  MB: 1e6,
  GB: 1e9,
  TB: 1e12,
  PB: 1e15,
  EB: 1e18,
  KiB: 1024,
  MiB: 1024 ** 2,
  GiB: 1024 ** 3,
  TiB: 1024 ** 4,
  PiB: 1024 ** 5,
  EiB: 1024 ** 6
};

export type NumberByteConvertInput = {
  text?: string;
  value?: number;
  values?: number[];
  fromUnit?: DataUnit;
  toUnit?: DataUnit;
  precision?: number;
};

export type NumberByteConvertOutput = {
  fromUnit: DataUnit;
  toUnit: DataUnit;
  precision: number;
  values: number[];
  converted: number[];
  lines: string[];
  result: string;
};

const maxNumbers = 10000;
const maxRandomRange = 1000000;
const numberPattern = /[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?/gi;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeObject = (input: unknown): Record<string, unknown> => {
  if (input === undefined || input === null) return {};
  if (!isRecord(input)) {
    throw new ToolboxError('INVALID_NUMBER_INPUT', 'input must be an object');
  }

  return input;
};

const normalizeBoolean = (value: unknown, fallback: boolean): boolean => {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'boolean') {
    throw new ToolboxError('INVALID_NUMBER_INPUT', 'boolean option is invalid');
  }

  return value;
};

const normalizeString = (
  value: unknown,
  fallback: string,
  name: string
): string => {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string') {
    throw new ToolboxError('INVALID_NUMBER_INPUT', `${name} must be a string`);
  }

  return value;
};

const normalizeEnum = <T extends readonly string[]>(
  value: unknown,
  fallback: T[number],
  values: T,
  name: string
): T[number] => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string' || !values.includes(value)) {
    throw new ToolboxError(
      'INVALID_NUMBER_INPUT',
      `${name} must be one of: ${values.join(', ')}`
    );
  }

  return value;
};

const normalizeNumber = (
  value: unknown,
  fallback: number,
  name: string
): number => {
  const selected = value === undefined || value === null ? fallback : value;
  const numeric = typeof selected === 'string' ? Number(selected) : selected;

  if (typeof numeric !== 'number' || !Number.isFinite(numeric)) {
    throw new ToolboxError('INVALID_NUMBER_INPUT', `${name} must be a number`);
  }

  return numeric;
};

const normalizeInteger = (
  value: unknown,
  fallback: number,
  name: string,
  min: number,
  max: number
): number => {
  const numeric = normalizeNumber(value, fallback, name);
  if (!Number.isInteger(numeric) || numeric < min || numeric > max) {
    throw new ToolboxError(
      'INVALID_NUMBER_INPUT',
      `${name} must be an integer from ${min} to ${max}`
    );
  }

  return numeric;
};

const normalizeOptionalPrecision = (value: unknown, fallback: number): number =>
  normalizeInteger(value, fallback, 'precision', 0, 12);

const normalizeResultNumber = (value: number, precision?: number): number => {
  if (!Number.isFinite(value)) return value;
  const normalized =
    precision === undefined
      ? Number(value.toPrecision(15))
      : Number(value.toFixed(precision));
  return Object.is(normalized, -0) ? 0 : normalized;
};

const decodeSeparator = (separator: string): string =>
  separator.replace(/\\r/g, '\r').replace(/\\n/g, '\n').replace(/\\t/g, '\t');

const extractSmartNumbers = (text: string): number[] =>
  Array.from(text.matchAll(numberPattern), (match) => Number(match[0])).filter(
    Number.isFinite
  );

const extractDelimitedNumbers = (text: string, separator: string): number[] =>
  text
    .split(separator)
    .map((part) => Number(part.trim()))
    .filter(Number.isFinite);

const normalizeNumbersArray = (value: unknown): number[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new ToolboxError('INVALID_NUMBER_INPUT', 'numbers must be an array');
  }

  const numbers = value.map((item, index) => {
    const numeric = typeof item === 'string' ? Number(item) : item;
    if (typeof numeric !== 'number' || !Number.isFinite(numeric)) {
      throw new ToolboxError(
        'INVALID_NUMBER_INPUT',
        `numbers[${index}] must be a finite number`
      );
    }
    return numeric;
  });

  if (numbers.length > maxNumbers) {
    throw new ToolboxError(
      'NUMBER_LIST_TOO_LARGE',
      `number tools support at most ${maxNumbers} values`
    );
  }

  return numbers;
};

const formatNumberList = (values: number[]): string =>
  values.map((value) => String(value)).join('\n');

export const sumNumbers = (input: NumberSumInput = {}): NumberSumOutput => {
  const object = normalizeObject(input);
  const extractionType = normalizeEnum(
    object.extractionType,
    'smart',
    extractionTypes,
    'extractionType'
  );
  const separator = decodeSeparator(
    normalizeString(object.separator, '\n', 'separator')
  );
  const printRunningSum = normalizeBoolean(object.printRunningSum, false);
  const precision =
    object.precision === undefined || object.precision === null
      ? undefined
      : normalizeOptionalPrecision(object.precision, 12);

  const numbers =
    object.numbers !== undefined
      ? normalizeNumbersArray(object.numbers)
      : extractionType === 'delimiter'
        ? extractDelimitedNumbers(
            normalizeString(object.text, '', 'text'),
            separator
          )
        : extractSmartNumbers(normalizeString(object.text, '', 'text'));

  if (numbers.length > maxNumbers) {
    throw new ToolboxError(
      'NUMBER_LIST_TOO_LARGE',
      `number tools support at most ${maxNumbers} values`
    );
  }

  let total = 0;
  const runningSums = numbers.map((value) => {
    total = normalizeResultNumber(total + value, precision);
    return total;
  });
  const sum = runningSums.length ? runningSums[runningSums.length - 1] : 0;

  return {
    numbers,
    count: numbers.length,
    sum,
    runningSums,
    result: printRunningSum
      ? `${formatNumberList(runningSums)}\n`
      : String(sum),
    extractionType,
    separator
  };
};

const getRandomDouble = (): number => {
  if (globalThis.crypto?.getRandomValues) {
    const random = new Uint32Array(1);
    globalThis.crypto.getRandomValues(random);
    return random[0] / 0x100000000;
  }

  return Math.random();
};

const randomInt = (min: number, max: number): number =>
  Math.floor(getRandomDouble() * (max - min + 1)) + min;

const randomDecimal = (min: number, max: number, precision: number): number =>
  normalizeResultNumber(min + getRandomDouble() * (max - min), precision);

const hasDuplicates = (values: number[]): boolean =>
  new Set(values.map((value) => String(value))).size !== values.length;

export const formatRandomNumbers = (
  numbers: number[],
  separator = ', ',
  allowDecimals = false,
  precision = 2
): string =>
  numbers
    .map((number) =>
      allowDecimals ? number.toFixed(precision) : Math.round(number).toString()
    )
    .join(separator);

export const generateRandomNumbers = (
  input: NumberRandomInput = {}
): NumberRandomOutput => {
  const object = normalizeObject(input);
  const min = normalizeNumber(object.min ?? object.minValue, 1, 'min');
  const max = normalizeNumber(object.max ?? object.maxValue, 100, 'max');
  const count = normalizeInteger(object.count, 10, 'count', 1, maxNumbers);
  const allowDecimals = normalizeBoolean(object.allowDecimals, false);
  const allowDuplicates = normalizeBoolean(object.allowDuplicates, true);
  const sortResults = normalizeBoolean(object.sortResults, false);
  const precision = normalizeOptionalPrecision(
    object.precision,
    allowDecimals ? 2 : 0
  );
  const separator = normalizeString(object.separator, ', ', 'separator');

  if (min >= max) {
    throw new ToolboxError(
      'NUMBER_RANDOM_INVALID_RANGE',
      'Minimum value must be less than maximum value'
    );
  }

  if (max - min > maxRandomRange) {
    throw new ToolboxError(
      'NUMBER_RANDOM_RANGE_TOO_WIDE',
      'Range cannot exceed 1,000,000'
    );
  }

  const numbers: number[] = [];

  if (!allowDecimals) {
    const integerMin = Math.ceil(min);
    const integerMax = Math.floor(max);
    const available = integerMax - integerMin + 1;
    if (available <= 0) {
      throw new ToolboxError(
        'NUMBER_RANDOM_EMPTY_RANGE',
        'Integer range does not contain any whole numbers'
      );
    }
    if (!allowDuplicates && count > available) {
      throw new ToolboxError(
        'NUMBER_RANDOM_UNIQUE_COUNT_TOO_HIGH',
        'Cannot generate unique numbers: count exceeds available range'
      );
    }

    const selected = new Set<number>();
    while (numbers.length < count) {
      const value = randomInt(integerMin, integerMax);
      if (allowDuplicates || !selected.has(value)) {
        selected.add(value);
        numbers.push(value);
      }
    }
  } else {
    const scale = 10 ** precision;
    const scaledMin = Math.ceil(min * scale);
    const scaledMax = Math.floor(max * scale);
    const available = scaledMax - scaledMin + 1;
    if (available <= 0) {
      throw new ToolboxError(
        'NUMBER_RANDOM_EMPTY_RANGE',
        'Decimal range is too small for the selected precision'
      );
    }
    if (!allowDuplicates && count > available) {
      throw new ToolboxError(
        'NUMBER_RANDOM_UNIQUE_COUNT_TOO_HIGH',
        'Cannot generate unique numbers: count exceeds available range'
      );
    }

    const selected = new Set<number>();
    while (numbers.length < count) {
      const value = allowDuplicates
        ? randomDecimal(min, max, precision)
        : randomInt(scaledMin, scaledMax) / scale;
      if (allowDuplicates || !selected.has(value)) {
        selected.add(value);
        numbers.push(normalizeResultNumber(value, precision));
      }
    }
  }

  if (sortResults) {
    numbers.sort((left, right) => left - right);
  }

  return {
    numbers,
    min,
    max,
    count,
    allowDecimals,
    allowDuplicates,
    precision,
    hasDuplicates: hasDuplicates(numbers),
    isSorted: sortResults,
    result: formatRandomNumbers(numbers, separator, allowDecimals, precision)
  };
};

const normalizeDataUnit = (value: unknown, fallback: DataUnit): DataUnit => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string' || !dataUnits.includes(value as DataUnit)) {
    throw new ToolboxError(
      'BYTE_CONVERT_INVALID_UNIT',
      `unit must be one of: ${dataUnits.join(', ')}`
    );
  }

  return value as DataUnit;
};

const convertByteValue = (
  value: number,
  fromUnit: DataUnit,
  toUnit: DataUnit,
  precision: number
): number => {
  const bytes = value * dataUnitFactors[fromUnit];
  return normalizeResultNumber(bytes / dataUnitFactors[toUnit], precision);
};

const normalizeByteValues = (
  input: Record<string, unknown>
): { values: number[]; emptyLineIndexes: Set<number>; lineCount: number } => {
  if (input.values !== undefined) {
    const values = normalizeNumbersArray(input.values);
    return {
      values,
      emptyLineIndexes: new Set(),
      lineCount: values.length
    };
  }

  if (input.value !== undefined) {
    return {
      values: [normalizeNumber(input.value, 0, 'value')],
      emptyLineIndexes: new Set(),
      lineCount: 1
    };
  }

  const text = normalizeString(input.text, '', 'text');
  const values: number[] = [];
  const emptyLineIndexes = new Set<number>();
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      emptyLineIndexes.add(index);
      return;
    }

    values.push(normalizeNumber(trimmed, 0, `line ${index + 1}`));
  });

  return {
    values,
    emptyLineIndexes,
    lineCount: lines.length
  };
};

export const convertByteUnits = (
  input: NumberByteConvertInput = {}
): NumberByteConvertOutput => {
  const object = normalizeObject(input);
  const fromUnit = normalizeDataUnit(object.fromUnit, 'B');
  const toUnit = normalizeDataUnit(object.toUnit, 'B');
  const precision = normalizeOptionalPrecision(object.precision, 2);
  const { values, emptyLineIndexes, lineCount } = normalizeByteValues(object);

  const converted = values.map((value) =>
    convertByteValue(value, fromUnit, toUnit, precision)
  );

  const lines: string[] = [];
  let convertedIndex = 0;
  for (let index = 0; index < lineCount; index += 1) {
    if (emptyLineIndexes.has(index)) {
      lines.push('');
      continue;
    }
    lines.push(String(converted[convertedIndex]));
    convertedIndex += 1;
  }

  return {
    fromUnit,
    toUnit,
    precision,
    values,
    converted,
    lines,
    result: lines.join('\n')
  };
};

export const numberTools: ToolboxTool[] = [
  {
    name: 'number.sum',
    title: 'Sum Numbers',
    description: 'Extract and sum numbers from text or a numeric list.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        text: { type: 'string', default: '' },
        numbers: { type: 'array', items: { type: 'number' } },
        extractionType: {
          type: 'string',
          enum: extractionTypes,
          default: 'smart'
        },
        separator: { type: 'string', default: '\\n' },
        printRunningSum: { type: 'boolean', default: false },
        precision: { type: 'integer', minimum: 0, maximum: 12 }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'numbers',
        'count',
        'sum',
        'runningSums',
        'result',
        'extractionType',
        'separator'
      ],
      additionalProperties: false,
      properties: {
        numbers: { type: 'array', items: { type: 'number' } },
        count: { type: 'integer' },
        sum: { type: 'number' },
        runningSums: { type: 'array', items: { type: 'number' } },
        result: { type: 'string' },
        extractionType: { type: 'string', enum: extractionTypes },
        separator: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok(sumNumbers(input as NumberSumInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'number.random',
    title: 'Random Numbers',
    description: 'Generate random integers or decimals within a range.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        min: { type: 'number', default: 1 },
        max: { type: 'number', default: 100 },
        minValue: { type: 'number' },
        maxValue: { type: 'number' },
        count: {
          type: 'integer',
          minimum: 1,
          maximum: maxNumbers,
          default: 10
        },
        allowDecimals: { type: 'boolean', default: false },
        allowDuplicates: { type: 'boolean', default: true },
        sortResults: { type: 'boolean', default: false },
        precision: { type: 'integer', minimum: 0, maximum: 12 },
        separator: { type: 'string', default: ', ' }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'numbers',
        'min',
        'max',
        'count',
        'allowDecimals',
        'allowDuplicates',
        'precision',
        'hasDuplicates',
        'isSorted',
        'result'
      ],
      additionalProperties: false,
      properties: {
        numbers: { type: 'array', items: { type: 'number' } },
        min: { type: 'number' },
        max: { type: 'number' },
        count: { type: 'integer' },
        allowDecimals: { type: 'boolean' },
        allowDuplicates: { type: 'boolean' },
        precision: { type: 'integer' },
        hasDuplicates: { type: 'boolean' },
        isSorted: { type: 'boolean' },
        result: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok(generateRandomNumbers(input as NumberRandomInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'number.byte_convert',
    title: 'Byte Unit Converter',
    description: 'Convert values between bit, byte, SI, and IEC data units.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        value: { type: 'number' },
        values: { type: 'array', items: { type: 'number' } },
        fromUnit: { type: 'string', enum: dataUnits, default: 'B' },
        toUnit: { type: 'string', enum: dataUnits, default: 'B' },
        precision: { type: 'integer', minimum: 0, maximum: 12, default: 2 }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'fromUnit',
        'toUnit',
        'precision',
        'values',
        'converted',
        'lines',
        'result'
      ],
      additionalProperties: false,
      properties: {
        fromUnit: { type: 'string', enum: dataUnits },
        toUnit: { type: 'string', enum: dataUnits },
        precision: { type: 'integer' },
        values: { type: 'array', items: { type: 'number' } },
        converted: { type: 'array', items: { type: 'number' } },
        lines: { type: 'array', items: { type: 'string' } },
        result: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok(convertByteUnits(input as NumberByteConvertInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
