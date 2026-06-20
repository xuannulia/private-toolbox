import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type DateDiffDirection = 'forward' | 'backward' | 'same';

export type DateDiffBreakdown = {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
};

export type DateDiffTotals = {
  milliseconds: number;
  seconds: number;
  minutes: number;
  hours: number;
  days: number;
};

export type DateDiffInput = {
  start: string;
  end: string;
};

export type DateDiffOutput = {
  start: string;
  end: string;
  startEpochMs: number;
  endEpochMs: number;
  direction: DateDiffDirection;
  totals: DateDiffTotals;
  breakdown: DateDiffBreakdown;
  human: string;
};

type DateUnit = keyof DateDiffBreakdown;

const dateUnits: DateUnit[] = [
  'years',
  'months',
  'days',
  'hours',
  'minutes',
  'seconds',
  'milliseconds'
];

const unitLabels: Record<DateUnit, [string, string]> = {
  years: ['year', 'years'],
  months: ['month', 'months'],
  days: ['day', 'days'],
  hours: ['hour', 'hours'],
  minutes: ['minute', 'minutes'],
  seconds: ['second', 'seconds'],
  milliseconds: ['millisecond', 'milliseconds']
};

const millisecondsPerSecond = 1000;
const millisecondsPerMinute = 60 * millisecondsPerSecond;
const millisecondsPerHour = 60 * millisecondsPerMinute;
const millisecondsPerDay = 24 * millisecondsPerHour;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseDateValue = (value: unknown, name: string): Date => {
  if (typeof value !== 'string') {
    throw new ToolboxError('INVALID_DATE_INPUT', `${name} must be a string`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ToolboxError('INVALID_DATE_INPUT', `${name} is required`);
  }

  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) {
    throw new ToolboxError('INVALID_DATE', `Invalid ${name}: ${trimmed}`);
  }

  return new Date(timestamp);
};

const daysInUtcMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

const addUtcMonths = (date: Date, amount: number): Date => {
  const monthIndex = date.getUTCMonth() + amount;
  const year =
    date.getUTCFullYear() +
    Math.floor(monthIndex / 12) -
    (monthIndex < 0 && monthIndex % 12 !== 0 ? 1 : 0);
  const month = ((monthIndex % 12) + 12) % 12;
  const day = Math.min(date.getUTCDate(), daysInUtcMonth(year, month));

  return new Date(
    Date.UTC(
      year,
      month,
      day,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  );
};

const addUtcYears = (date: Date, amount: number): Date =>
  addUtcMonths(date, amount * 12);

const takeCalendarUnit = (
  start: Date,
  end: Date,
  estimate: number,
  add: (date: Date, amount: number) => Date
): { count: number; cursor: Date } => {
  let count = Math.max(0, estimate);

  while (count > 0 && add(start, count).getTime() > end.getTime()) {
    count -= 1;
  }
  while (add(start, count + 1).getTime() <= end.getTime()) {
    count += 1;
  }

  return {
    count,
    cursor: add(start, count)
  };
};

const formatHuman = (breakdown: DateDiffBreakdown): string => {
  const parts = dateUnits
    .map((unit) => {
      const value = breakdown[unit];
      if (value === 0) return null;

      const [singular, plural] = unitLabels[unit];
      return `${value} ${value === 1 ? singular : plural}`;
    })
    .filter((part): part is string => part !== null);

  return parts.length > 0 ? parts.join(', ') : '0 milliseconds';
};

export const calculateDateDiff = (input: DateDiffInput): DateDiffOutput => {
  if (!isRecord(input)) {
    throw new ToolboxError('INVALID_DATE_INPUT', 'input must be an object');
  }

  const startDate = parseDateValue(input.start, 'start');
  const endDate = parseDateValue(input.end, 'end');
  const startEpochMs = startDate.getTime();
  const endEpochMs = endDate.getTime();
  const direction: DateDiffDirection =
    endEpochMs > startEpochMs
      ? 'forward'
      : endEpochMs < startEpochMs
        ? 'backward'
        : 'same';
  const earlier = startEpochMs <= endEpochMs ? startDate : endDate;
  const later = startEpochMs <= endEpochMs ? endDate : startDate;
  const totalMilliseconds = later.getTime() - earlier.getTime();

  const yearEstimate = later.getUTCFullYear() - earlier.getUTCFullYear();
  const yearsTaken = takeCalendarUnit(
    earlier,
    later,
    yearEstimate,
    addUtcYears
  );
  let cursor = yearsTaken.cursor;

  const monthEstimate =
    (later.getUTCFullYear() - cursor.getUTCFullYear()) * 12 +
    (later.getUTCMonth() - cursor.getUTCMonth());
  const monthsTaken = takeCalendarUnit(
    cursor,
    later,
    monthEstimate,
    addUtcMonths
  );
  cursor = monthsTaken.cursor;

  let remaining = later.getTime() - cursor.getTime();
  const days = Math.floor(remaining / millisecondsPerDay);
  remaining -= days * millisecondsPerDay;
  const hours = Math.floor(remaining / millisecondsPerHour);
  remaining -= hours * millisecondsPerHour;
  const minutes = Math.floor(remaining / millisecondsPerMinute);
  remaining -= minutes * millisecondsPerMinute;
  const seconds = Math.floor(remaining / millisecondsPerSecond);
  remaining -= seconds * millisecondsPerSecond;

  const breakdown: DateDiffBreakdown = {
    years: yearsTaken.count,
    months: monthsTaken.count,
    days,
    hours,
    minutes,
    seconds,
    milliseconds: remaining
  };

  return {
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    startEpochMs,
    endEpochMs,
    direction,
    totals: {
      milliseconds: totalMilliseconds,
      seconds: totalMilliseconds / millisecondsPerSecond,
      minutes: totalMilliseconds / millisecondsPerMinute,
      hours: totalMilliseconds / millisecondsPerHour,
      days: totalMilliseconds / millisecondsPerDay
    },
    breakdown,
    human: formatHuman(breakdown)
  };
};

const dateDiffBreakdownSchema = {
  type: 'object',
  required: dateUnits,
  additionalProperties: false,
  properties: {
    years: { type: 'number' },
    months: { type: 'number' },
    days: { type: 'number' },
    hours: { type: 'number' },
    minutes: { type: 'number' },
    seconds: { type: 'number' },
    milliseconds: { type: 'number' }
  }
};

const dateDiffTotalsSchema = {
  type: 'object',
  required: ['milliseconds', 'seconds', 'minutes', 'hours', 'days'],
  additionalProperties: false,
  properties: {
    milliseconds: { type: 'number' },
    seconds: { type: 'number' },
    minutes: { type: 'number' },
    hours: { type: 'number' },
    days: { type: 'number' }
  }
};

export const dateTools: ToolboxTool[] = [
  {
    name: 'date.diff',
    title: 'Date Difference',
    description:
      'Calculate the absolute interval between two parseable date strings.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['start', 'end'],
      additionalProperties: false,
      properties: {
        start: { type: 'string' },
        end: { type: 'string' }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'start',
        'end',
        'startEpochMs',
        'endEpochMs',
        'direction',
        'totals',
        'breakdown',
        'human'
      ],
      additionalProperties: false,
      properties: {
        start: { type: 'string' },
        end: { type: 'string' },
        startEpochMs: { type: 'number' },
        endEpochMs: { type: 'number' },
        direction: { enum: ['forward', 'backward', 'same'] },
        totals: dateDiffTotalsSchema,
        breakdown: dateDiffBreakdownSchema,
        human: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok(calculateDateDiff(input as DateDiffInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
