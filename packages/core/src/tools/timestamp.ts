import {
  type JsonValue,
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type TimestampConvertMode = 'unix_to_date' | 'date_to_unix';
export type TimestampUnit = 'seconds' | 'milliseconds' | 'auto';
export type TimestampTimezone = 'utc' | 'local';

export type TimestampConvertInput = {
  value: string | number;
  mode?: TimestampConvertMode;
  unit?: TimestampUnit;
  timezone?: TimestampTimezone;
  utcOffset?: string;
};

export type TimestampConvertOutput = {
  mode: TimestampConvertMode;
  input: string;
  unit: 'seconds' | 'milliseconds';
  unixSeconds: number;
  unixMilliseconds: number;
  iso: string;
  formattedUtc: string;
  formattedLocal: string;
  timezone: TimestampTimezone;
  utcOffset: string | null;
};

const modes: TimestampConvertMode[] = ['unix_to_date', 'date_to_unix'];
const units: TimestampUnit[] = ['seconds', 'milliseconds', 'auto'];
const timezones: TimestampTimezone[] = ['utc', 'local'];
const utcOffsetPattern = /^Z$|^[+-](0\d|1[0-4]):(00|15|30|45)$/;

const pad = (value: number, length = 2): string =>
  String(value).padStart(length, '0');

const formatUtc = (date: Date): string =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate()
  )} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(
    date.getUTCSeconds()
  )}.${pad(date.getUTCMilliseconds(), 3)}`;

const formatLocal = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}.${pad(date.getMilliseconds(), 3)}`;

const normalizeMode = (value?: TimestampConvertMode): TimestampConvertMode => {
  if (!value) return 'unix_to_date';
  if (modes.includes(value)) return value;

  throw new ToolboxError(
    'TIMESTAMP_INVALID_MODE',
    `Unsupported timestamp conversion mode: ${value}`
  );
};

const normalizeUnit = (value?: TimestampUnit): TimestampUnit => {
  if (!value) return 'auto';
  if (units.includes(value)) return value;

  throw new ToolboxError(
    'TIMESTAMP_INVALID_UNIT',
    `Unsupported timestamp unit: ${value}`
  );
};

const normalizeTimezone = (value?: TimestampTimezone): TimestampTimezone => {
  if (!value) return 'utc';
  if (timezones.includes(value)) return value;

  throw new ToolboxError(
    'TIMESTAMP_INVALID_TIMEZONE',
    `Unsupported timestamp timezone: ${value}`
  );
};

const normalizeInput = (value: unknown): string => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new ToolboxError('TIMESTAMP_INVALID_VALUE', 'value must be finite');
    }
    return String(value);
  }

  if (typeof value !== 'string') {
    throw new ToolboxError(
      'TIMESTAMP_INVALID_VALUE',
      'value must be a string or number'
    );
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ToolboxError('TIMESTAMP_VALUE_REQUIRED', 'value is required');
  }

  return trimmed;
};

const normalizeUtcOffset = (value: string | undefined): string | null => {
  if (!value?.trim()) return null;
  const normalized = value.trim();
  if (!utcOffsetPattern.test(normalized)) {
    throw new ToolboxError(
      'TIMESTAMP_INVALID_UTC_OFFSET',
      `Invalid UTC offset: ${value}`
    );
  }

  return normalized;
};

const parseDateParts = (input: string): {
  dateTime: string;
  utcOffset: string | null;
} => {
  const match = input.match(/^(.+?)\s*([+-]\d{2}:\d{2}|Z)$/);
  if (!match) return { dateTime: input, utcOffset: null };

  return {
    dateTime: match[1].trim(),
    utcOffset: match[2] ?? null
  };
};

const normalizeDateTime = (value: string): string =>
  value.includes('T')
    ? value
    : value.includes(':')
      ? value.replace(' ', 'T')
      : `${value.replace(' ', 'T')}T00:00:00`;

const parseUnixTimestamp = (
  input: string,
  unitOption: TimestampUnit
): { date: Date; unit: 'seconds' | 'milliseconds' } => {
  if (!/^-?\d+(?:\.\d+)?$/.test(input)) {
    throw new ToolboxError(
      'TIMESTAMP_INVALID_UNIX',
      'Unix timestamp must be numeric'
    );
  }

  const numeric = Number(input);
  if (!Number.isFinite(numeric)) {
    throw new ToolboxError('TIMESTAMP_INVALID_UNIX', 'Unix timestamp is invalid');
  }

  const unit =
    unitOption === 'auto'
      ? input.replace(/^-/, '').split('.')[0].length >= 13
        ? 'milliseconds'
        : 'seconds'
      : unitOption;
  const milliseconds = unit === 'seconds' ? numeric * 1000 : numeric;
  const date = new Date(milliseconds);

  if (Number.isNaN(date.getTime())) {
    throw new ToolboxError(
      'TIMESTAMP_OUT_OF_RANGE',
      'Unix timestamp is outside the supported date range'
    );
  }

  return { date, unit };
};

const parseDateToUnix = (
  input: string,
  timezone: TimestampTimezone,
  utcOffsetOverride: string | null
): { date: Date; utcOffset: string | null } => {
  const parts = parseDateParts(input);
  const utcOffset = utcOffsetOverride ?? parts.utcOffset;
  if (utcOffset) normalizeUtcOffset(utcOffset);

  const normalized = normalizeDateTime(parts.dateTime);
  const parsed =
    timezone === 'local' && !utcOffset
      ? Date.parse(normalized)
      : Date.parse(`${normalized}${utcOffset === null ? 'Z' : utcOffset}`);

  if (Number.isNaN(parsed)) {
    throw new ToolboxError('TIMESTAMP_INVALID_DATE', `Invalid date: ${input}`);
  }

  return {
    date: new Date(parsed),
    utcOffset: utcOffset ?? (timezone === 'utc' ? 'Z' : null)
  };
};

const toOutput = (
  mode: TimestampConvertMode,
  input: string,
  date: Date,
  unit: 'seconds' | 'milliseconds',
  timezone: TimestampTimezone,
  utcOffset: string | null
): TimestampConvertOutput => {
  const unixMilliseconds = date.getTime();

  return {
    mode,
    input,
    unit,
    unixSeconds: Math.floor(unixMilliseconds / 1000),
    unixMilliseconds,
    iso: date.toISOString(),
    formattedUtc: formatUtc(date),
    formattedLocal: formatLocal(date),
    timezone,
    utcOffset
  };
};

export const convertTimestamp = (
  input: TimestampConvertInput
): TimestampConvertOutput => {
  const mode = normalizeMode(input.mode);
  const value = normalizeInput(input.value);
  const unitOption = normalizeUnit(input.unit);
  const timezone = normalizeTimezone(input.timezone);
  const utcOffset = normalizeUtcOffset(input.utcOffset);

  if (mode === 'unix_to_date') {
    const parsed = parseUnixTimestamp(value, unitOption);
    return toOutput(mode, value, parsed.date, parsed.unit, timezone, null);
  }

  const parsed = parseDateToUnix(value, timezone, utcOffset);
  return toOutput(mode, value, parsed.date, 'seconds', timezone, parsed.utcOffset);
};

const timestampOutputSchema = {
  type: 'object',
  required: [
    'mode',
    'input',
    'unit',
    'unixSeconds',
    'unixMilliseconds',
    'iso',
    'formattedUtc',
    'formattedLocal',
    'timezone',
    'utcOffset'
  ],
  additionalProperties: false,
  properties: {
    mode: { type: 'string', enum: modes },
    input: { type: 'string' },
    unit: { type: 'string', enum: ['seconds', 'milliseconds'] },
    unixSeconds: { type: 'integer' },
    unixMilliseconds: { type: 'integer' },
    iso: { type: 'string' },
    formattedUtc: { type: 'string' },
    formattedLocal: { type: 'string' },
    timezone: { type: 'string', enum: timezones },
    utcOffset: { type: ['string', 'null'] }
  }
};

export const timestampTools: ToolboxTool[] = [
  {
    name: 'timestamp.convert',
    title: 'Convert Timestamp',
    description: 'Convert Unix timestamps and date strings in both directions.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['value'],
      additionalProperties: false,
      properties: {
        value: {
          anyOf: [{ type: 'string' }, { type: 'number' }]
        },
        mode: {
          type: 'string',
          enum: modes,
          default: 'unix_to_date'
        },
        unit: {
          type: 'string',
          enum: units,
          default: 'auto'
        },
        timezone: {
          type: 'string',
          enum: timezones,
          default: 'utc'
        },
        utcOffset: {
          type: 'string',
          description: 'Optional UTC offset such as +08:00 or Z.'
        }
      }
    },
    outputSchema: timestampOutputSchema,
    execute: (input) => {
      try {
        return ok(
          convertTimestamp(input as unknown as TimestampConvertInput) as unknown as JsonValue
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
