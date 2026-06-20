import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type RmbUppercaseInput = {
  amount: number | string;
  negativePrefix?: string;
};

export type RmbUppercaseOutput = {
  amount: string;
  uppercase: string;
  negative: boolean;
  integerPart: string;
  cents: number;
  result: string;
};

const digits = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const smallUnits = ['', '拾', '佰', '仟'];
const sectionUnits = ['', '万', '亿', '兆'];
const maxIntegerDigits = sectionUnits.length * 4;

type NormalizedAmount = {
  negative: boolean;
  integerPart: string;
  cents: number;
  amount: string;
};

const normalizeAmountText = (amount: number | string): string => {
  const raw =
    typeof amount === 'number'
      ? amount.toString()
      : amount.trim().replace(/,/g, '');

  if (!raw) {
    throw new ToolboxError('RMB_AMOUNT_REQUIRED', 'amount is required');
  }

  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) {
    throw new ToolboxError(
      'RMB_INVALID_AMOUNT',
      'amount must be a decimal number'
    );
  }

  return raw;
};

const incrementIntegerString = (value: string): string => {
  let carry = 1;
  const result = value.split('');

  for (let index = result.length - 1; index >= 0; index -= 1) {
    const next = Number(result[index]) + carry;
    result[index] = String(next % 10);
    carry = next >= 10 ? 1 : 0;
    if (!carry) break;
  }

  return carry ? `1${result.join('')}` : result.join('');
};

const normalizeAmount = (amount: number | string): NormalizedAmount => {
  const raw = normalizeAmountText(amount);
  const negative = raw.startsWith('-');
  const unsigned = raw.replace(/^[+-]/, '');
  const [integerRaw = '0', fractionRaw = ''] = unsigned.split('.');
  let integerPart = integerRaw.replace(/^0+(?=\d)/, '') || '0';
  const fraction = fractionRaw.padEnd(3, '0');
  let cents = Number(fraction.slice(0, 2));

  if (Number(fraction[2]) >= 5) {
    cents += 1;
  }
  if (cents >= 100) {
    cents = 0;
    integerPart = incrementIntegerString(integerPart);
  }

  if (integerPart.length > maxIntegerDigits) {
    throw new ToolboxError(
      'RMB_AMOUNT_TOO_LARGE',
      `integer part must contain at most ${maxIntegerDigits} digits`
    );
  }

  const normalizedAmount = `${negative ? '-' : ''}${integerPart}.${String(
    cents
  ).padStart(2, '0')}`;

  return {
    negative: negative && (integerPart !== '0' || cents !== 0),
    integerPart,
    cents,
    amount: normalizedAmount
  };
};

const convertSection = (section: string): string => {
  const padded = section.padStart(4, '0');
  let output = '';
  let zeroPending = false;

  for (let index = 0; index < padded.length; index += 1) {
    const digit = Number(padded[index]);
    const unitIndex = padded.length - index - 1;

    if (digit === 0) {
      if (output) zeroPending = true;
      continue;
    }

    if (zeroPending) {
      output += digits[0];
      zeroPending = false;
    }
    output += `${digits[digit]}${smallUnits[unitIndex]}`;
  }

  return output;
};

const splitSections = (integerPart: string): string[] => {
  const sections: string[] = [];
  for (let end = integerPart.length; end > 0; end -= 4) {
    sections.unshift(integerPart.slice(Math.max(0, end - 4), end));
  }

  return sections;
};

const convertInteger = (integerPart: string): string => {
  if (BigInt(integerPart) === 0n) return digits[0];

  const sections = splitSections(integerPart);
  let output = '';
  let zeroPending = false;

  sections.forEach((section, index) => {
    const sectionValue = Number(section);
    const sectionUnit = sectionUnits[sections.length - index - 1];

    if (sectionValue === 0) {
      if (output) zeroPending = true;
      return;
    }

    if (output && (zeroPending || sectionValue < 1000)) {
      output += digits[0];
    }
    output += `${convertSection(section)}${sectionUnit}`;
    zeroPending = false;
  });

  return output;
};

const convertFraction = (cents: number): string => {
  const jiao = Math.floor(cents / 10);
  const fen = cents % 10;

  if (jiao === 0 && fen === 0) return '整';
  if (jiao > 0 && fen > 0) return `${digits[jiao]}角${digits[fen]}分`;
  if (jiao > 0) return `${digits[jiao]}角`;
  return `零${digits[fen]}分`;
};

export const convertRmbUppercase = (
  input: RmbUppercaseInput
): RmbUppercaseOutput => {
  const normalized = normalizeAmount(input.amount);
  const negativePrefix = input.negativePrefix ?? '负';
  const uppercase = `${
    normalized.negative ? negativePrefix : ''
  }${convertInteger(normalized.integerPart)}元${convertFraction(
    normalized.cents
  )}`;

  return {
    amount: normalized.amount,
    uppercase,
    negative: normalized.negative,
    integerPart: normalized.integerPart,
    cents: normalized.cents,
    result: uppercase
  };
};

export const rmbTools: ToolboxTool[] = [
  {
    name: 'rmb.uppercase',
    title: 'RMB Uppercase',
    description: 'Convert a numeric RMB amount to formal Chinese uppercase.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['amount'],
      additionalProperties: false,
      properties: {
        amount: { type: ['number', 'string'] },
        negativePrefix: { type: 'string', default: '负' }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'amount',
        'uppercase',
        'negative',
        'integerPart',
        'cents',
        'result'
      ],
      additionalProperties: false,
      properties: {
        amount: { type: 'string' },
        uppercase: { type: 'string' },
        negative: { type: 'boolean' },
        integerPart: { type: 'string' },
        cents: { type: 'integer' },
        result: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok(convertRmbUppercase(input as RmbUppercaseInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
