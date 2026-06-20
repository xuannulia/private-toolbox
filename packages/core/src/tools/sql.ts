import type { KeywordCase, SqlLanguage } from 'sql-formatter';
import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type SqlDialect = SqlLanguage;
export type SqlKeywordCase = KeywordCase;

export type SqlFormatInput = {
  text: string;
  dialect?: SqlDialect;
  keywordCase?: SqlKeywordCase;
  tabWidth?: number;
  useTabs?: boolean;
  linesBetweenQueries?: number;
};

export type SqlTextOutput = {
  dialect: SqlDialect;
  text: string;
  changed: boolean;
};

export type SqlMinifyOutput = SqlTextOutput & {
  originalBytes: number;
  resultBytes: number;
  savedBytes: number;
  savedPercent: number;
};

export const supportedSqlDialects = [
  'sql',
  'postgresql',
  'mysql',
  'mariadb',
  'sqlite',
  'bigquery',
  'clickhouse',
  'db2',
  'db2i',
  'duckdb',
  'hive',
  'n1ql',
  'plsql',
  'redshift',
  'spark',
  'tidb',
  'trino',
  'transactsql',
  'tsql',
  'singlestoredb',
  'snowflake'
] as const satisfies readonly SqlDialect[];

const keywordCases = ['preserve', 'upper', 'lower'] as const;

const normalizeSqlText = (text: unknown): string => {
  if (typeof text !== 'string') {
    throw new ToolboxError('INVALID_SQL_INPUT', 'text must be a string');
  }

  if (!text.trim()) {
    throw new ToolboxError('INVALID_SQL_INPUT', 'text is required');
  }

  return text;
};

const normalizeDialect = (dialect: unknown): SqlDialect => {
  if (dialect === undefined || dialect === null || dialect === '') return 'sql';
  if (
    typeof dialect === 'string' &&
    (supportedSqlDialects as readonly string[]).includes(dialect)
  ) {
    return dialect as SqlDialect;
  }

  throw new ToolboxError(
    'INVALID_SQL_DIALECT',
    `dialect must be one of: ${supportedSqlDialects.join(', ')}`
  );
};

const normalizeKeywordCase = (keywordCase: unknown): SqlKeywordCase => {
  if (
    typeof keywordCase === 'string' &&
    (keywordCases as readonly string[]).includes(keywordCase)
  ) {
    return keywordCase as SqlKeywordCase;
  }

  return 'upper';
};

const normalizeInteger = (
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value)));
};

const byteLength = (text: string): number =>
  new TextEncoder().encode(text).length;

const roundPercent = (value: number): number => Math.round(value * 100) / 100;

const toSqlError = (error: unknown, dialect: SqlDialect): ToolboxError => {
  if (error instanceof ToolboxError) return error;

  const message = error instanceof Error ? error.message : 'SQL format failed';
  return new ToolboxError('INVALID_SQL', message, { dialect });
};

export const formatSql = async (
  input: SqlFormatInput
): Promise<SqlTextOutput> => {
  const text = normalizeSqlText(input.text);
  const dialect = normalizeDialect(input.dialect);

  try {
    const { format } = await import('sql-formatter');
    const formatted = format(text, {
      language: dialect,
      keywordCase: normalizeKeywordCase(input.keywordCase),
      tabWidth: normalizeInteger(input.tabWidth, 2, 1, 8),
      useTabs: input.useTabs === true,
      linesBetweenQueries: normalizeInteger(input.linesBetweenQueries, 1, 0, 5)
    });

    return {
      dialect,
      text: formatted,
      changed: formatted !== text
    };
  } catch (error) {
    throw toSqlError(error, dialect);
  }
};

const getDollarQuoteDelimiter = (
  text: string,
  index: number
): string | null => {
  const match = text.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/);
  return match?.[0] ?? null;
};

const copyQuotedSql = (
  text: string,
  start: number,
  quote: "'" | '"' | '`' | '['
): { value: string; end: number } => {
  const closeQuote = quote === '[' ? ']' : quote;
  let index = start + 1;

  while (index < text.length) {
    const char = text[index];
    const next = text[index + 1];

    if (char === closeQuote) {
      if (quote !== '`' && next === closeQuote) {
        index += 2;
        continue;
      }

      return {
        value: text.slice(start, index + 1),
        end: index
      };
    }

    index += 1;
  }

  return {
    value: text.slice(start),
    end: text.length - 1
  };
};

const copyDollarQuotedSql = (
  text: string,
  start: number,
  delimiter: string
): { value: string; end: number } => {
  const closeIndex = text.indexOf(delimiter, start + delimiter.length);

  if (closeIndex === -1) {
    return {
      value: text.slice(start),
      end: text.length - 1
    };
  }

  return {
    value: text.slice(start, closeIndex + delimiter.length),
    end: closeIndex + delimiter.length - 1
  };
};

const stripSqlComments = (text: string): string => {
  let result = '';

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    const dollarDelimiter =
      char === '$' ? getDollarQuoteDelimiter(text, index) : null;

    if (dollarDelimiter) {
      const quoted = copyDollarQuotedSql(text, index, dollarDelimiter);
      result += quoted.value;
      index = quoted.end;
      continue;
    }

    if (char === "'" || char === '"' || char === '`' || char === '[') {
      const quoted = copyQuotedSql(text, index, char);
      result += quoted.value;
      index = quoted.end;
      continue;
    }

    if (char === '-' && next === '-') {
      const newlineIndex = text.indexOf('\n', index + 2);
      result += ' ';
      index = newlineIndex === -1 ? text.length : newlineIndex;
      continue;
    }

    if (char === '/' && next === '*') {
      const end = text.indexOf('*/', index + 2);
      const comment = text.slice(index, end === -1 ? text.length : end + 2);
      if (comment.startsWith('/*+') || comment.startsWith('/*!')) {
        result += comment;
      } else {
        result += ' ';
      }
      index = end === -1 ? text.length : end + 1;
      continue;
    }

    result += char;
  }

  return result;
};

const sqlNoSpaceBefore = new Set([',', ';', ')', '.']);
const sqlNoSpaceAfter = new Set(['(', ',', '.']);
const sqlOperatorPattern = /^[=<>!+\-*/%|&^~]$/;
const sqlWordPattern = /^[\p{L}\p{N}_$]$/u;

const shouldKeepSqlSpace = (
  previous: string | undefined,
  next: string
): boolean =>
  Boolean(
    previous &&
      !sqlNoSpaceAfter.has(previous) &&
      !sqlNoSpaceBefore.has(next) &&
      (sqlWordPattern.test(previous) ||
        sqlWordPattern.test(next) ||
        sqlOperatorPattern.test(previous) ||
        sqlOperatorPattern.test(next))
  );

const compactSqlWhitespace = (text: string): string => {
  let result = '';
  let pendingSpace = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const dollarDelimiter =
      char === '$' ? getDollarQuoteDelimiter(text, index) : null;

    if (dollarDelimiter) {
      if (pendingSpace && shouldKeepSqlSpace(result.at(-1), char)) {
        result += ' ';
      }
      const quoted = copyDollarQuotedSql(text, index, dollarDelimiter);
      result += quoted.value;
      index = quoted.end;
      pendingSpace = false;
      continue;
    }

    if (char === "'" || char === '"' || char === '`' || char === '[') {
      if (pendingSpace && shouldKeepSqlSpace(result.at(-1), char)) {
        result += ' ';
      }
      const quoted = copyQuotedSql(text, index, char);
      result += quoted.value;
      index = quoted.end;
      pendingSpace = false;
      continue;
    }

    if (/\s/.test(char)) {
      pendingSpace = true;
      continue;
    }

    if (pendingSpace && shouldKeepSqlSpace(result.at(-1), char)) {
      result += ' ';
    }

    if (sqlNoSpaceBefore.has(char)) {
      result = result.trimEnd();
    }

    result += char;
    pendingSpace = false;
  }

  return result.trim();
};

export const minifySql = async (
  input: SqlFormatInput
): Promise<SqlMinifyOutput> => {
  const text = normalizeSqlText(input.text);
  const dialect = normalizeDialect(input.dialect);

  try {
    const formatted = (await formatSql({ ...input, text, dialect })).text;
    const minified = compactSqlWhitespace(stripSqlComments(formatted));
    const originalBytes = byteLength(text);
    const resultBytes = byteLength(minified);
    const savedBytes = originalBytes - resultBytes;

    return {
      dialect,
      text: minified,
      changed: minified !== text,
      originalBytes,
      resultBytes,
      savedBytes,
      savedPercent:
        originalBytes === 0
          ? 0
          : roundPercent((savedBytes / originalBytes) * 100)
    };
  } catch (error) {
    throw toSqlError(error, dialect);
  }
};

const sqlDialectSchema = {
  type: 'string',
  enum: supportedSqlDialects
};

const sqlTextOutputSchema = {
  type: 'object',
  required: ['dialect', 'text', 'changed'],
  additionalProperties: false,
  properties: {
    dialect: sqlDialectSchema,
    text: { type: 'string' },
    changed: { type: 'boolean' }
  }
};

export const sqlTools: ToolboxTool[] = [
  {
    name: 'sql.format',
    title: 'Format SQL',
    description: 'Format SQL with dialect and keyword-case options.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        dialect: sqlDialectSchema,
        keywordCase: { type: 'string', enum: keywordCases, default: 'upper' },
        tabWidth: { type: 'number', default: 2 },
        useTabs: { type: 'boolean', default: false },
        linesBetweenQueries: { type: 'number', default: 1 }
      }
    },
    outputSchema: sqlTextOutputSchema,
    execute: async (input) => {
      try {
        return ok(await formatSql(input as SqlFormatInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'sql.minify',
    title: 'Minify SQL',
    description: 'Minify SQL by removing comments and compacting whitespace.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        dialect: sqlDialectSchema,
        keywordCase: { type: 'string', enum: keywordCases, default: 'upper' }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'dialect',
        'text',
        'changed',
        'originalBytes',
        'resultBytes',
        'savedBytes',
        'savedPercent'
      ],
      additionalProperties: false,
      properties: {
        ...sqlTextOutputSchema.properties,
        originalBytes: { type: 'number' },
        resultBytes: { type: 'number' },
        savedBytes: { type: 'number' },
        savedPercent: { type: 'number' }
      }
    },
    execute: async (input) => {
      try {
        return ok(await minifySql(input as SqlFormatInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
