import cronstrue from 'cronstrue/i18n.js';
import { CronExpressionParser } from 'cron-parser';
import {
  type JsonValue,
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

const cronTemplateIds = [
  'every_minute',
  'every_5_minutes',
  'every_15_minutes',
  'every_30_minutes',
  'hourly',
  'daily_midnight',
  'daily_9am',
  'weekly_monday_9am',
  'monthly_first_midnight',
  'weekday_9am'
] as const;

export type CronTemplateId = (typeof cronTemplateIds)[number];
export type CronDialect = 'crontab' | 'quartz';
export type CronInputDialect = 'auto' | CronDialect;
export type CronConvertTarget = CronDialect;

export type CronValidateInput = {
  expression: string;
  timezone?: string;
  strict?: boolean;
  dialect?: CronInputDialect;
};

export type CronParseInput = CronValidateInput & {
  locale?: string;
};

export type CronNextRunsInput = CronValidateInput & {
  count?: number;
  currentDate?: string;
};

export type CronTemplateInput = {
  template: CronTemplateId;
  locale?: string;
};

export type CronCalendarInput = CronValidateInput & {
  year?: number;
  month?: number;
  weekStartsOn?: 0 | 1;
  maxRuns?: number;
  maxRunsPerDay?: number;
};

export type CronConvertInput = {
  expression: string;
  sourceDialect?: CronInputDialect;
  targetDialect: CronConvertTarget;
  includeYear?: boolean;
  year?: string;
};

export type CronFields = {
  second: string;
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
  year?: string;
};

export type CronValidateOutput = {
  valid: boolean;
  expression: string;
  normalizedExpression: string | null;
  hasSeconds: boolean;
  isAlias: boolean;
  dialect: CronDialect | null;
  fieldCount: number | null;
  quartzYear: string | null;
  error: string | null;
};

export type CronParseOutput = CronValidateOutput & {
  description: string | null;
  fields: CronFields | null;
};

export type CronRun = {
  iso: string;
  epochMs: number;
};

export type CronNextRunsOutput = {
  expression: string;
  normalizedExpression: string;
  timezone: string | null;
  currentDate: string | null;
  runs: CronRun[];
};

export type CronCalendarRun = CronRun & {
  localDate: string;
  localTime: string;
};

export type CronCalendarDay = {
  date: string;
  dayOfMonth: number;
  weekday: number;
  inMonth: boolean;
  runCount: number;
  runs: CronCalendarRun[];
};

export type CronCalendarWeek = {
  weekIndex: number;
  days: CronCalendarDay[];
};

export type CronCalendarOutput = {
  expression: string;
  normalizedExpression: string;
  timezone: string;
  year: number;
  month: number;
  weekStartsOn: 0 | 1;
  totalRuns: number;
  truncated: boolean;
  warnings: string[];
  weeks: CronCalendarWeek[];
};

export type CronTemplateOutput = {
  template: CronTemplateId;
  title: string;
  expression: string;
  normalizedExpression: string;
  description: string;
  fields: CronFields;
};

export type CronConvertOutput = {
  expression: string;
  sourceDialect: CronDialect;
  targetDialect: CronConvertTarget;
  convertedExpression: string;
  normalizedExpression: string;
  warnings: string[];
  fields: CronFields;
};

type CronstrueModule = {
  toString: (expression: string, options?: { locale?: string }) => string;
};

const cronstrueModule = cronstrue as unknown as CronstrueModule;

const localeMap: Record<string, string> = {
  de: 'de',
  en: 'en',
  es: 'es',
  fr: 'fr',
  ja: 'ja',
  nl: 'nl',
  pt: 'pt_PT',
  pt_BR: 'pt_BR',
  pt_PT: 'pt_PT',
  ru: 'ru',
  zh: 'zh_CN',
  zh_CN: 'zh_CN'
};

const cronTemplates: Record<
  CronTemplateId,
  {
    title: string;
    expression: string;
  }
> = {
  every_minute: {
    title: 'Every minute',
    expression: '* * * * *'
  },
  every_5_minutes: {
    title: 'Every 5 minutes',
    expression: '*/5 * * * *'
  },
  every_15_minutes: {
    title: 'Every 15 minutes',
    expression: '*/15 * * * *'
  },
  every_30_minutes: {
    title: 'Every 30 minutes',
    expression: '*/30 * * * *'
  },
  hourly: {
    title: 'Hourly',
    expression: '0 * * * *'
  },
  daily_midnight: {
    title: 'Daily at midnight',
    expression: '0 0 * * *'
  },
  daily_9am: {
    title: 'Daily at 9:00 AM',
    expression: '0 9 * * *'
  },
  weekly_monday_9am: {
    title: 'Weekly on Monday at 9:00 AM',
    expression: '0 9 * * 1'
  },
  monthly_first_midnight: {
    title: 'Monthly on the first day at midnight',
    expression: '0 0 1 * *'
  },
  weekday_9am: {
    title: 'Weekdays at 9:00 AM',
    expression: '0 9 * * 1-5'
  }
};

const normalizeExpression = (expression: unknown): string => {
  if (typeof expression !== 'string') {
    throw new ToolboxError('INVALID_CRON_INPUT', 'expression must be a string');
  }

  const trimmed = expression.trim();
  if (!trimmed) {
    throw new ToolboxError('INVALID_CRON_INPUT', 'expression is required');
  }

  return trimmed;
};

const normalizeTimezone = (timezone: unknown): string | undefined => {
  if (timezone === undefined || timezone === null || timezone === '') {
    return undefined;
  }

  if (typeof timezone !== 'string') {
    throw new ToolboxError('INVALID_CRON_INPUT', 'timezone must be a string');
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    return timezone;
  } catch {
    throw new ToolboxError(
      'INVALID_TIMEZONE',
      `Unsupported timezone: ${timezone}`
    );
  }
};

const normalizeStrict = (strict: unknown): boolean => {
  if (strict === undefined) return false;
  if (typeof strict !== 'boolean') {
    throw new ToolboxError('INVALID_CRON_INPUT', 'strict must be a boolean');
  }

  return strict;
};

const normalizeDialect = (dialect: unknown): CronInputDialect => {
  if (dialect === undefined || dialect === null || dialect === '') {
    return 'auto';
  }

  if (dialect !== 'auto' && dialect !== 'crontab' && dialect !== 'quartz') {
    throw new ToolboxError(
      'INVALID_CRON_INPUT',
      'dialect must be auto, crontab, or quartz'
    );
  }

  return dialect;
};

const normalizeTargetDialect = (dialect: unknown): CronConvertTarget => {
  if (dialect !== 'crontab' && dialect !== 'quartz') {
    throw new ToolboxError(
      'INVALID_CRON_INPUT',
      'targetDialect must be crontab or quartz'
    );
  }

  return dialect;
};

const normalizeIncludeYear = (includeYear: unknown): boolean => {
  if (includeYear === undefined) return false;
  if (typeof includeYear !== 'boolean') {
    throw new ToolboxError(
      'INVALID_CRON_INPUT',
      'includeYear must be a boolean'
    );
  }

  return includeYear;
};

const normalizeLocale = (locale: unknown): string => {
  if (typeof locale !== 'string') return 'en';
  return localeMap[locale] ?? 'en';
};

const normalizeTemplateId = (template: unknown): CronTemplateId => {
  if (typeof template !== 'string') {
    throw new ToolboxError('INVALID_CRON_INPUT', 'template must be a string');
  }

  if (!cronTemplateIds.includes(template as CronTemplateId)) {
    throw new ToolboxError(
      'INVALID_CRON_TEMPLATE',
      `Unsupported cron template: ${template}`
    );
  }

  return template as CronTemplateId;
};

const countFields = (expression: string): number =>
  expression.split(/\s+/).filter(Boolean).length;

const isAliasExpression = (expression: string): boolean =>
  expression.startsWith('@');

const hasQuartzSyntax = (expression: string): boolean =>
  /[?LW#]/i.test(expression);

const isAnyField = (field: string): boolean => field === '*' || field === '?';

const isConstrainedField = (field: string): boolean => !isAnyField(field);

const validateYearValue = (value: number): void => {
  if (!Number.isInteger(value) || value < 1970 || value > 2099) {
    throw new ToolboxError(
      'INVALID_QUARTZ_YEAR',
      'Quartz year values must be integers from 1970 to 2099'
    );
  }
};

const expandYearPart = (part: string): number[] => {
  const [rangePart, stepPart] = part.split('/');
  const step = stepPart === undefined ? 1 : Number.parseInt(stepPart, 10);

  if (!Number.isInteger(step) || step < 1) {
    throw new ToolboxError(
      'INVALID_QUARTZ_YEAR',
      'Quartz year step must be a positive integer'
    );
  }

  let start: number;
  let end: number;

  if (rangePart === '*') {
    start = 1970;
    end = 2099;
  } else if (rangePart.includes('-')) {
    const [rawStart, rawEnd] = rangePart.split('-');
    start = Number.parseInt(rawStart, 10);
    end = Number.parseInt(rawEnd, 10);
  } else {
    start = Number.parseInt(rangePart, 10);
    end = stepPart === undefined ? start : 2099;
  }

  validateYearValue(start);
  validateYearValue(end);

  if (start > end) {
    throw new ToolboxError(
      'INVALID_QUARTZ_YEAR',
      'Quartz year range start must be less than or equal to the end'
    );
  }

  const years: number[] = [];
  for (let year = start; year <= end; year += step) {
    years.push(year);
  }

  return years;
};

const normalizeQuartzYear = (year: unknown): string => {
  if (year === undefined || year === null || year === '') return '*';
  if (typeof year !== 'string') {
    throw new ToolboxError('INVALID_CRON_INPUT', 'year must be a string');
  }

  const trimmed = year.trim();
  if (!trimmed) return '*';

  for (const part of trimmed.split(',')) {
    if (!part) {
      throw new ToolboxError(
        'INVALID_QUARTZ_YEAR',
        'Quartz year field contains an empty list item'
      );
    }

    expandYearPart(part);
  }

  return trimmed;
};

const expandQuartzYears = (yearField: string | null): Set<number> | null => {
  if (!yearField || yearField === '*') return null;

  const years = new Set<number>();
  for (const part of yearField.split(',')) {
    for (const year of expandYearPart(part)) {
      years.add(year);
    }
  }

  return years;
};

const matchesQuartzYear = (year: number, yearField: string | null): boolean => {
  const years = expandQuartzYears(yearField);
  return years === null || years.has(year);
};

const maxQuartzYear = (yearField: string | null): number | null => {
  const years = expandQuartzYears(yearField);
  return years === null ? null : Math.max(...years);
};

const toCronFields = (normalizedExpression: string): CronFields => {
  const [second, minute, hour, dayOfMonth, month, dayOfWeek, year] =
    normalizedExpression.split(/\s+/);

  return {
    second,
    minute,
    hour,
    dayOfMonth,
    month,
    dayOfWeek,
    ...(year ? { year } : {})
  };
};

const parseDateInput = (currentDate: unknown): string | undefined => {
  if (currentDate === undefined || currentDate === null || currentDate === '') {
    return undefined;
  }

  if (typeof currentDate !== 'string') {
    throw new ToolboxError(
      'INVALID_CRON_INPUT',
      'currentDate must be an ISO date string'
    );
  }

  const timestamp = Date.parse(currentDate);
  if (Number.isNaN(timestamp)) {
    throw new ToolboxError(
      'INVALID_DATE',
      `Invalid currentDate: ${currentDate}`
    );
  }

  return new Date(timestamp).toISOString();
};

const parseCount = (count: unknown): number => {
  if (count === undefined) return 5;
  if (
    typeof count !== 'number' ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 50
  ) {
    throw new ToolboxError(
      'INVALID_CRON_INPUT',
      'count must be an integer from 1 to 50'
    );
  }

  return count;
};

const normalizeCalendarYear = (value: unknown, fallback: number): number => {
  if (value === undefined || value === null || value === '') return fallback;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1970 ||
    value > 9999
  ) {
    throw new ToolboxError(
      'INVALID_CRON_INPUT',
      'year must be an integer from 1970 to 9999'
    );
  }

  return value;
};

const normalizeCalendarMonth = (value: unknown, fallback: number): number => {
  if (value === undefined || value === null || value === '') return fallback;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 12
  ) {
    throw new ToolboxError(
      'INVALID_CRON_INPUT',
      'month must be an integer from 1 to 12'
    );
  }

  return value;
};

const normalizeWeekStartsOn = (value: unknown): 0 | 1 => {
  if (value === undefined || value === null || value === '') return 1;
  if (value !== 0 && value !== 1) {
    throw new ToolboxError('INVALID_CRON_INPUT', 'weekStartsOn must be 0 or 1');
  }

  return value;
};

const normalizeCalendarMaxRuns = (value: unknown): number => {
  if (value === undefined) return 5000;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 20000
  ) {
    throw new ToolboxError(
      'INVALID_CRON_INPUT',
      'maxRuns must be an integer from 1 to 20000'
    );
  }

  return value;
};

const normalizeCalendarMaxRunsPerDay = (value: unknown): number => {
  if (value === undefined) return 8;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 100
  ) {
    throw new ToolboxError(
      'INVALID_CRON_INPUT',
      'maxRunsPerDay must be an integer from 0 to 100'
    );
  }

  return value;
};

const pad2 = (value: number): string => String(value).padStart(2, '0');

const getCalendarDefaults = (
  timezone: string
): { year: number; month: number } => {
  const parts = getDatePartsInTimezone(new Date(), timezone);
  return {
    year: parts.year,
    month: parts.month
  };
};

const datePartFormatter = (timezone: string): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });

const getDatePartsInTimezone = (
  date: Date,
  timezone: string
): {
  year: number;
  month: number;
  day: number;
  date: string;
  time: string;
} => {
  const entries = datePartFormatter(timezone)
    .formatToParts(date)
    .filter((part) => part.type !== 'literal')
    .map((part) => [part.type, part.value]);
  const parts = Object.fromEntries(entries) as Record<string, string>;
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);

  return {
    year,
    month,
    day,
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`
  };
};

const plainDateFromUtc = (date: Date): string =>
  date.toISOString().slice(0, 10);

const weekdayFromUtcDate = (date: Date): number => date.getUTCDay();

const makeUtcDate = (year: number, month: number, day: number): Date =>
  new Date(Date.UTC(year, month - 1, day));

type ParsedCron = {
  expression: string;
  executableExpression: string;
  normalizedExpression: string;
  timezone: string | undefined;
  dialect: CronDialect;
  fieldCount: number;
  yearField: string | null;
  parsed: ReturnType<typeof CronExpressionParser.parse>;
};

const resolveCronDialect = (
  expression: string,
  dialect: CronInputDialect
): CronDialect => {
  if (dialect !== 'auto') return dialect;
  if (isAliasExpression(expression)) return 'crontab';

  const fieldCount = countFields(expression);
  return fieldCount === 7 || hasQuartzSyntax(expression) ? 'quartz' : 'crontab';
};

const parseCron = (input: CronValidateInput): ParsedCron => {
  const expression = normalizeExpression(input.expression);
  const timezone = normalizeTimezone(input.timezone);
  const strict = normalizeStrict(input.strict);
  const requestedDialect = normalizeDialect(input.dialect);
  const dialect = resolveCronDialect(expression, requestedDialect);
  const fieldCount = isAliasExpression(expression)
    ? 1
    : countFields(expression);
  let executableExpression = expression;
  let yearField: string | null = null;

  if (dialect === 'quartz') {
    if (isAliasExpression(expression)) {
      throw new ToolboxError(
        'INVALID_CRON_INPUT',
        'Quartz cron does not support alias expressions'
      );
    }

    if (fieldCount !== 6 && fieldCount !== 7) {
      throw new ToolboxError(
        'INVALID_CRON_INPUT',
        'Quartz cron expressions must have 6 or 7 fields'
      );
    }

    const fields = expression.split(/\s+/);
    if (fieldCount === 7) {
      yearField = normalizeQuartzYear(fields[6]);
      executableExpression = fields.slice(0, 6).join(' ');
    }
  }

  const parsed = CronExpressionParser.parse(executableExpression, {
    strict,
    tz: timezone
  });
  const normalizedExecutable = parsed.stringify(true);
  const normalizedExpression =
    dialect === 'quartz' && yearField !== null
      ? `${normalizedExecutable} ${yearField}`
      : normalizedExecutable;

  return {
    expression,
    executableExpression,
    timezone,
    dialect,
    fieldCount,
    yearField,
    parsed,
    normalizedExpression
  };
};

export const validateCronExpression = (
  input: CronValidateInput
): CronValidateOutput => {
  let expression = '';

  try {
    const parsedCron = parseCron(input);
    expression = parsedCron.expression;

    return {
      valid: true,
      expression,
      normalizedExpression: parsedCron.normalizedExpression,
      hasSeconds:
        parsedCron.dialect === 'quartz' ||
        (!isAliasExpression(expression) && countFields(expression) === 6),
      isAlias: isAliasExpression(expression),
      dialect: parsedCron.dialect,
      fieldCount: parsedCron.fieldCount,
      quartzYear: parsedCron.yearField,
      error: null
    };
  } catch (error) {
    if (error instanceof ToolboxError) {
      return {
        valid: false,
        expression,
        normalizedExpression: null,
        hasSeconds: false,
        isAlias: false,
        dialect: null,
        fieldCount: null,
        quartzYear: null,
        error: error.message
      };
    }

    return {
      valid: false,
      expression,
      normalizedExpression: null,
      hasSeconds: false,
      isAlias: false,
      dialect: null,
      fieldCount: null,
      quartzYear: null,
      error: error instanceof Error ? error.message : 'Invalid cron expression'
    };
  }
};

export const parseCronExpression = (input: CronParseInput): CronParseOutput => {
  const validation = validateCronExpression(input);
  if (!validation.valid || validation.normalizedExpression === null) {
    return {
      ...validation,
      description: null,
      fields: null
    };
  }

  let description: string;
  try {
    description = cronstrueModule.toString(validation.expression, {
      locale: normalizeLocale(input.locale)
    });
  } catch (error) {
    description = cronstrueModule.toString(validation.normalizedExpression, {
      locale: 'en'
    });
  }

  return {
    ...validation,
    description,
    fields: toCronFields(validation.normalizedExpression)
  };
};

export const getCronNextRuns = (
  input: CronNextRunsInput
): CronNextRunsOutput => {
  const count = parseCount(input.count);
  const currentDate = parseDateInput(input.currentDate);
  const parsedCron = parseCron(input);
  const { expression, executableExpression, timezone, yearField } = parsedCron;

  try {
    const parsed = CronExpressionParser.parse(executableExpression, {
      currentDate,
      strict: normalizeStrict(input.strict),
      tz: timezone
    });
    const runs: CronRun[] = [];
    const latestYear = maxQuartzYear(yearField);
    let attempts = 0;

    while (runs.length < count && attempts < 10000) {
      attempts += 1;
      const date = parsed.next().toDate();
      const localYear = timezone
        ? getDatePartsInTimezone(date, timezone).year
        : date.getUTCFullYear();

      if (latestYear !== null && localYear > latestYear) break;

      if (matchesQuartzYear(localYear, yearField)) {
        runs.push({
          iso: date.toISOString(),
          epochMs: date.getTime()
        });
      }
    }

    return {
      expression,
      normalizedExpression: parsedCron.normalizedExpression,
      timezone: timezone ?? null,
      currentDate: currentDate ?? null,
      runs
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid cron expression';
    throw new ToolboxError('INVALID_CRON', message);
  }
};

export const getCronCalendar = (
  input: CronCalendarInput
): CronCalendarOutput => {
  const parsedCron = parseCron({
    ...input,
    timezone: input.timezone ?? 'UTC'
  });
  const { expression, executableExpression, normalizedExpression, yearField } =
    parsedCron;
  const timezone = parsedCron.timezone ?? 'UTC';
  const defaults = getCalendarDefaults(timezone);
  const year = normalizeCalendarYear(input.year, defaults.year);
  const month = normalizeCalendarMonth(input.month, defaults.month);
  const weekStartsOn = normalizeWeekStartsOn(input.weekStartsOn);
  const maxRuns = normalizeCalendarMaxRuns(input.maxRuns);
  const maxRunsPerDay = normalizeCalendarMaxRunsPerDay(input.maxRunsPerDay);
  const monthStart = makeUtcDate(year, month, 1);
  const monthEnd = new Date(Date.UTC(year, month, 1));
  const dayBuckets = new Map<
    string,
    { count: number; runs: CronCalendarRun[] }
  >();
  let totalRuns = 0;
  let truncated = false;
  const warnings: string[] = [];

  try {
    if (!matchesQuartzYear(year, yearField)) {
      warnings.push(
        `Quartz year field ${yearField} excludes selected calendar year ${year}.`
      );
    } else {
      const parsed = CronExpressionParser.parse(executableExpression, {
        currentDate: new Date(monthStart.getTime() - 1000),
        endDate: monthEnd,
        strict: normalizeStrict(input.strict),
        tz: timezone
      });

      while (parsed.hasNext()) {
        const date = parsed.next().toDate();
        if (date.getTime() >= monthEnd.getTime()) break;

        const localParts = getDatePartsInTimezone(date, timezone);
        if (localParts.year !== year || localParts.month !== month) {
          continue;
        }

        totalRuns += 1;
        const bucket = dayBuckets.get(localParts.date) ?? {
          count: 0,
          runs: []
        };
        bucket.count += 1;
        if (bucket.runs.length < maxRunsPerDay) {
          bucket.runs.push({
            iso: date.toISOString(),
            epochMs: date.getTime(),
            localDate: localParts.date,
            localTime: localParts.time
          });
        }
        dayBuckets.set(localParts.date, bucket);

        if (totalRuns >= maxRuns) {
          truncated = parsed.hasNext();
          if (truncated) {
            warnings.push(
              `Calendar stopped after ${maxRuns} runs. Increase maxRuns for denser schedules.`
            );
          }
          break;
        }
      }
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid cron expression';
    throw new ToolboxError('INVALID_CRON', message);
  }

  const firstWeekday = weekdayFromUtcDate(monthStart);
  const leadingDays = (firstWeekday - weekStartsOn + 7) % 7;
  const firstCell = makeUtcDate(year, month, 1 - leadingDays);
  const weeks: CronCalendarWeek[] = [];

  for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
    const days: CronCalendarDay[] = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const offset = weekIndex * 7 + dayIndex;
      const cellDate = new Date(
        firstCell.getTime() + offset * 24 * 60 * 60 * 1000
      );
      const date = plainDateFromUtc(cellDate);
      const inMonth =
        cellDate.getUTCFullYear() === year &&
        cellDate.getUTCMonth() === month - 1;
      const bucket = dayBuckets.get(date);

      days.push({
        date,
        dayOfMonth: cellDate.getUTCDate(),
        weekday: cellDate.getUTCDay(),
        inMonth,
        runCount: inMonth ? bucket?.count ?? 0 : 0,
        runs: inMonth ? bucket?.runs ?? [] : []
      });
    }

    weeks.push({
      weekIndex,
      days
    });
  }

  return {
    expression,
    normalizedExpression,
    timezone,
    year,
    month,
    weekStartsOn,
    totalRuns,
    truncated,
    warnings,
    weeks
  };
};

export const getCronTemplate = (
  input: CronTemplateInput
): CronTemplateOutput => {
  const template = normalizeTemplateId(input.template);
  const item = cronTemplates[template];
  const parsed = parseCronExpression({
    expression: item.expression,
    locale: input.locale
  });

  if (!parsed.valid || !parsed.normalizedExpression || !parsed.fields) {
    throw new ToolboxError(
      'INVALID_CRON_TEMPLATE',
      `Invalid cron template: ${template}`
    );
  }

  return {
    template,
    title: item.title,
    expression: item.expression,
    normalizedExpression: parsed.normalizedExpression,
    description: parsed.description ?? item.title,
    fields: parsed.fields
  };
};

const normalizeCronFieldForCrontab = (field: string): string =>
  field === '?' ? '*' : field;

const hasQuartzOnlyDaySyntax = (field: string): boolean => /[LW#]/i.test(field);

const convertCrontabToQuartz = (
  parsed: ParsedCron,
  includeYear: boolean,
  year: string
): { expression: string; warnings: string[] } => {
  const fields = toCronFields(parsed.normalizedExpression);
  let dayOfMonth = fields.dayOfMonth;
  let dayOfWeek = fields.dayOfWeek;
  const warnings: string[] = [];

  if (isConstrainedField(dayOfMonth) && !isConstrainedField(dayOfWeek)) {
    dayOfWeek = '?';
  } else if (!isConstrainedField(dayOfMonth) && isConstrainedField(dayOfWeek)) {
    dayOfMonth = '?';
  } else if (
    !isConstrainedField(dayOfMonth) &&
    !isConstrainedField(dayOfWeek)
  ) {
    dayOfWeek = '?';
  } else {
    warnings.push(
      'Both day-of-month and day-of-week are constrained. Quartz may evaluate this differently from crontab OR semantics.'
    );
  }

  const converted = [
    fields.second,
    fields.minute,
    fields.hour,
    dayOfMonth,
    fields.month,
    dayOfWeek
  ];

  if (includeYear) {
    converted.push(year);
  }

  return {
    expression: converted.join(' '),
    warnings
  };
};

const convertQuartzToCrontab = (
  parsed: ParsedCron
): { expression: string; warnings: string[] } => {
  const fields = toCronFields(parsed.normalizedExpression);
  const warnings: string[] = [];

  if (
    hasQuartzOnlyDaySyntax(fields.dayOfMonth) ||
    hasQuartzOnlyDaySyntax(fields.dayOfWeek)
  ) {
    throw new ToolboxError(
      'UNSUPPORTED_CRON_CONVERSION',
      'Quartz L, W, and # day syntax cannot be represented as a standard crontab expression'
    );
  }

  if (fields.year && fields.year !== '*') {
    warnings.push(
      `Dropped Quartz year field ${fields.year}; crontab has no year field.`
    );
  }

  if (
    isConstrainedField(fields.dayOfMonth) &&
    isConstrainedField(fields.dayOfWeek)
  ) {
    warnings.push(
      'Both day-of-month and day-of-week are constrained. Crontab may evaluate this differently from Quartz semantics.'
    );
  }

  const converted = [
    fields.minute,
    fields.hour,
    normalizeCronFieldForCrontab(fields.dayOfMonth),
    fields.month,
    normalizeCronFieldForCrontab(fields.dayOfWeek)
  ];

  if (fields.second !== '0') {
    converted.unshift(fields.second);
    warnings.push(
      'Converted to a 6-field cron expression because Quartz seconds are not zero.'
    );
  }

  return {
    expression: converted.join(' '),
    warnings
  };
};

export const convertCronExpression = (
  input: CronConvertInput
): CronConvertOutput => {
  const targetDialect = normalizeTargetDialect(input.targetDialect);
  const includeYear = normalizeIncludeYear(input.includeYear);
  const year = normalizeQuartzYear(input.year);
  const sourceDialect = normalizeDialect(input.sourceDialect);
  const parsed = parseCron({
    expression: input.expression,
    dialect: sourceDialect
  });

  if (parsed.dialect === targetDialect) {
    return {
      expression: parsed.expression,
      sourceDialect: parsed.dialect,
      targetDialect,
      convertedExpression: parsed.normalizedExpression,
      normalizedExpression: parsed.normalizedExpression,
      warnings: [],
      fields: toCronFields(parsed.normalizedExpression)
    };
  }

  const conversion =
    targetDialect === 'quartz'
      ? convertCrontabToQuartz(parsed, includeYear, year)
      : convertQuartzToCrontab(parsed);
  const convertedParsed = parseCron({
    expression: conversion.expression,
    dialect: targetDialect
  });

  return {
    expression: parsed.expression,
    sourceDialect: parsed.dialect,
    targetDialect,
    convertedExpression: conversion.expression,
    normalizedExpression: convertedParsed.normalizedExpression,
    warnings: conversion.warnings,
    fields: toCronFields(convertedParsed.normalizedExpression)
  };
};

const cronFieldsSchema = {
  type: 'object',
  required: ['second', 'minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek'],
  additionalProperties: false,
  properties: {
    second: { type: 'string' },
    minute: { type: 'string' },
    hour: { type: 'string' },
    dayOfMonth: { type: 'string' },
    month: { type: 'string' },
    dayOfWeek: { type: 'string' },
    year: { type: 'string' }
  }
};

const cronValidateOutputSchema = {
  type: 'object',
  required: [
    'valid',
    'expression',
    'normalizedExpression',
    'hasSeconds',
    'isAlias',
    'dialect',
    'fieldCount',
    'quartzYear',
    'error'
  ],
  additionalProperties: false,
  properties: {
    valid: { type: 'boolean' },
    expression: { type: 'string' },
    normalizedExpression: { type: ['string', 'null'] },
    hasSeconds: { type: 'boolean' },
    isAlias: { type: 'boolean' },
    dialect: { enum: ['crontab', 'quartz', null] },
    fieldCount: { type: ['number', 'null'] },
    quartzYear: { type: ['string', 'null'] },
    error: { type: ['string', 'null'] }
  }
};

const cronTemplateOutputSchema = {
  type: 'object',
  required: [
    'template',
    'title',
    'expression',
    'normalizedExpression',
    'description',
    'fields'
  ],
  additionalProperties: false,
  properties: {
    template: { enum: cronTemplateIds },
    title: { type: 'string' },
    expression: { type: 'string' },
    normalizedExpression: { type: 'string' },
    description: { type: 'string' },
    fields: cronFieldsSchema
  }
};

const cronConvertOutputSchema = {
  type: 'object',
  required: [
    'expression',
    'sourceDialect',
    'targetDialect',
    'convertedExpression',
    'normalizedExpression',
    'warnings',
    'fields'
  ],
  additionalProperties: false,
  properties: {
    expression: { type: 'string' },
    sourceDialect: { enum: ['crontab', 'quartz'] },
    targetDialect: { enum: ['crontab', 'quartz'] },
    convertedExpression: { type: 'string' },
    normalizedExpression: { type: 'string' },
    warnings: {
      type: 'array',
      items: { type: 'string' }
    },
    fields: cronFieldsSchema
  }
};

export const cronTools: ToolboxTool[] = [
  {
    name: 'cron.validate',
    title: 'Validate Cron Expression',
    description: 'Validate a cron expression and return normalized metadata.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['expression'],
      additionalProperties: false,
      properties: {
        expression: { type: 'string' },
        timezone: { type: 'string' },
        strict: { type: 'boolean' },
        dialect: { enum: ['auto', 'crontab', 'quartz'] }
      }
    },
    outputSchema: cronValidateOutputSchema,
    execute: (input) => {
      try {
        return ok(validateCronExpression(input as CronValidateInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'cron.parse',
    title: 'Parse Cron Expression',
    description: 'Parse and explain a cron expression.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['expression'],
      additionalProperties: false,
      properties: {
        expression: { type: 'string' },
        locale: { type: 'string' },
        timezone: { type: 'string' },
        strict: { type: 'boolean' },
        dialect: { enum: ['auto', 'crontab', 'quartz'] }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'valid',
        'expression',
        'normalizedExpression',
        'hasSeconds',
        'isAlias',
        'error',
        'description',
        'fields'
      ],
      additionalProperties: false,
      properties: {
        ...cronValidateOutputSchema.properties,
        description: { type: ['string', 'null'] },
        fields: {
          anyOf: [cronFieldsSchema, { type: 'null' }]
        }
      }
    },
    execute: (input) => {
      try {
        return ok(parseCronExpression(input as CronParseInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'cron.template',
    title: 'Cron Template',
    description: 'Return a common cron expression template with explanation.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['template'],
      additionalProperties: false,
      properties: {
        template: { enum: cronTemplateIds },
        locale: { type: 'string' }
      }
    },
    outputSchema: cronTemplateOutputSchema,
    execute: (input) => {
      try {
        return ok(getCronTemplate(input as CronTemplateInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'cron.next_runs',
    title: 'Cron Next Runs',
    description: 'Calculate the next run times for a cron expression.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['expression'],
      additionalProperties: false,
      properties: {
        expression: { type: 'string' },
        count: {
          type: 'integer',
          minimum: 1,
          maximum: 50
        },
        currentDate: { type: 'string' },
        timezone: { type: 'string' },
        strict: { type: 'boolean' },
        dialect: { enum: ['auto', 'crontab', 'quartz'] }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'expression',
        'normalizedExpression',
        'timezone',
        'currentDate',
        'runs'
      ],
      additionalProperties: false,
      properties: {
        expression: { type: 'string' },
        normalizedExpression: { type: 'string' },
        timezone: { type: ['string', 'null'] },
        currentDate: { type: ['string', 'null'] },
        runs: {
          type: 'array',
          items: {
            type: 'object',
            required: ['iso', 'epochMs'],
            additionalProperties: false,
            properties: {
              iso: { type: 'string' },
              epochMs: { type: 'number' }
            }
          }
        }
      }
    },
    execute: (input) => {
      try {
        return ok(getCronNextRuns(input as CronNextRunsInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'cron.convert',
    title: 'Cron Dialect Converter',
    description: 'Convert between crontab and Quartz cron expressions.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['expression', 'targetDialect'],
      additionalProperties: false,
      properties: {
        expression: { type: 'string' },
        sourceDialect: { enum: ['auto', 'crontab', 'quartz'] },
        targetDialect: { enum: ['crontab', 'quartz'] },
        includeYear: { type: 'boolean' },
        year: { type: 'string' }
      }
    },
    outputSchema: cronConvertOutputSchema,
    execute: (input) => {
      try {
        return ok(convertCronExpression(input as CronConvertInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'cron.calendar',
    title: 'Cron Calendar',
    description:
      'Render a month calendar preview for a cron expression with per-day run counts.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['expression'],
      additionalProperties: false,
      properties: {
        expression: { type: 'string' },
        timezone: { type: 'string' },
        strict: { type: 'boolean' },
        dialect: { enum: ['auto', 'crontab', 'quartz'] },
        year: {
          type: 'integer',
          minimum: 1970,
          maximum: 9999
        },
        month: {
          type: 'integer',
          minimum: 1,
          maximum: 12
        },
        weekStartsOn: {
          type: 'integer',
          enum: [0, 1],
          default: 1
        },
        maxRuns: {
          type: 'integer',
          minimum: 1,
          maximum: 20000,
          default: 5000
        },
        maxRunsPerDay: {
          type: 'integer',
          minimum: 0,
          maximum: 100,
          default: 8
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'expression',
        'normalizedExpression',
        'timezone',
        'year',
        'month',
        'weekStartsOn',
        'totalRuns',
        'truncated',
        'warnings',
        'weeks'
      ],
      additionalProperties: false,
      properties: {
        expression: { type: 'string' },
        normalizedExpression: { type: 'string' },
        timezone: { type: 'string' },
        year: { type: 'number' },
        month: { type: 'number' },
        weekStartsOn: { enum: [0, 1] },
        totalRuns: { type: 'number' },
        truncated: { type: 'boolean' },
        warnings: {
          type: 'array',
          items: { type: 'string' }
        },
        weeks: {
          type: 'array',
          items: {
            type: 'object',
            required: ['weekIndex', 'days'],
            additionalProperties: false,
            properties: {
              weekIndex: { type: 'number' },
              days: {
                type: 'array',
                items: {
                  type: 'object',
                  required: [
                    'date',
                    'dayOfMonth',
                    'weekday',
                    'inMonth',
                    'runCount',
                    'runs'
                  ],
                  additionalProperties: false,
                  properties: {
                    date: { type: 'string' },
                    dayOfMonth: { type: 'number' },
                    weekday: { type: 'number' },
                    inMonth: { type: 'boolean' },
                    runCount: { type: 'number' },
                    runs: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['iso', 'epochMs', 'localDate', 'localTime'],
                        additionalProperties: false,
                        properties: {
                          iso: { type: 'string' },
                          epochMs: { type: 'number' },
                          localDate: { type: 'string' },
                          localTime: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    execute: (input) => {
      try {
        return ok(getCronCalendar(input as CronCalendarInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
