import { stringify as stringifyYaml } from 'yaml';
import {
  type JsonValue,
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type CsvParseInput = {
  text?: string;
  delimiter?: string;
  quote?: string;
  comment?: string;
  skipEmptyLines?: boolean;
};

export type CsvToJsonInput = CsvParseInput & {
  useHeaders?: boolean;
  dynamicTypes?: boolean;
  spaces?: number;
};

export type CsvToJsonOutput = {
  json: JsonValue[];
  text: string;
  rows: string[][];
  headers: string[] | null;
};

export type CsvTextOutput = {
  text: string;
  rows: string[][];
  rowCount: number;
};

export type CsvToMarkupOutput = CsvTextOutput & {
  headers: string[] | null;
};

export type CsvToXmlInput = CsvParseInput & {
  useHeaders?: boolean;
  rootName?: string;
  rowName?: string;
};

export type CsvToYamlInput = CsvParseInput & {
  useHeaders?: boolean;
  spaces?: number;
};

export type CsvToTsvInput = CsvParseInput & {
  includeHeader?: boolean;
};

export type CsvChangeSeparatorInput = CsvParseInput & {
  outputDelimiter?: string;
  outputQuote?: string;
  quoteAll?: boolean;
};

export type CsvTransposeInput = CsvParseInput & {
  fillMissing?: boolean;
  fillValue?: string;
};

export type CsvIssue = {
  line: number;
  title: string;
  message: string;
  missingColumns: number;
  emptyColumns: number[];
};

export type CsvIncompleteInput = CsvParseInput & {
  checkEmptyValues?: boolean;
  limit?: number;
};

export type CsvIncompleteOutput = {
  complete: boolean;
  expectedColumns: number;
  issues: CsvIssue[];
  result: string;
};

type CsvParsedRow = {
  line: number;
  cells: string[];
};

const maxRows = 10000;

const normalizeObject = (input: unknown): Record<string, unknown> => {
  if (input === undefined || input === null) return {};
  if (typeof input !== 'object' || Array.isArray(input)) {
    throw new ToolboxError('INVALID_CSV_INPUT', 'input must be an object');
  }

  return input as Record<string, unknown>;
};

const normalizeString = (
  value: unknown,
  fallback: string,
  name: string
): string => {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string') {
    throw new ToolboxError('INVALID_CSV_INPUT', `${name} must be a string`);
  }

  return value;
};

const normalizeRequiredText = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new ToolboxError('INVALID_CSV_INPUT', 'text must be a string');
  }

  return value;
};

const normalizeSingleChar = (
  value: unknown,
  fallback: string,
  name: string
): string => {
  const selected = normalizeString(value, fallback, name);
  if (selected.length !== 1) {
    throw new ToolboxError(
      'INVALID_CSV_INPUT',
      `${name} must be exactly one character`
    );
  }

  return selected;
};

const normalizeBoolean = (value: unknown, fallback: boolean): boolean => {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'boolean') {
    throw new ToolboxError('INVALID_CSV_INPUT', 'boolean option is invalid');
  }

  return value;
};

const normalizeInteger = (
  value: unknown,
  fallback: number,
  name: string,
  min: number,
  max: number
): number => {
  if (value === undefined || value === null) return fallback;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new ToolboxError(
      'INVALID_CSV_INPUT',
      `${name} must be an integer from ${min} to ${max}`
    );
  }

  return value;
};

const normalizeParseOptions = (input: CsvParseInput = {}) => {
  const object = normalizeObject(input);

  return {
    text: normalizeRequiredText(object.text),
    delimiter: normalizeSingleChar(object.delimiter, ',', 'delimiter'),
    quote: normalizeSingleChar(object.quote, '"', 'quote'),
    comment: normalizeString(object.comment, '#', 'comment'),
    skipEmptyLines: normalizeBoolean(object.skipEmptyLines, true)
  };
};

const isEmptyRow = (cells: string[]): boolean =>
  cells.every((cell) => cell.trim() === '');

const isCommentRow = (cells: string[], comment: string): boolean =>
  Boolean(comment) && (cells[0] ?? '').trim().startsWith(comment);

const parseCsvRowsWithLines = (input: CsvParseInput = {}): CsvParsedRow[] => {
  const options = normalizeParseOptions(input);
  const rows: CsvParsedRow[] = [];
  let cells: string[] = [];
  let current = '';
  let inQuotes = false;
  let line = 1;
  let rowLine = 1;

  const pushCell = () => {
    cells.push(current.trim());
    current = '';
  };

  const pushRow = () => {
    pushCell();
    if (
      !(options.skipEmptyLines && isEmptyRow(cells)) &&
      !isCommentRow(cells, options.comment)
    ) {
      rows.push({
        line: rowLine,
        cells
      });
    }
    cells = [];
    rowLine = line + 1;
  };

  for (let index = 0; index < options.text.length; index += 1) {
    const char = options.text[index];
    const next = options.text[index + 1];

    if (char === options.quote) {
      if (inQuotes && next === options.quote) {
        current += options.quote;
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === options.delimiter && !inQuotes) {
      pushCell();
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      pushRow();
      line += 1;
      continue;
    }

    if (char === '\n') {
      line += 1;
    }
    current += char;
  }

  if (inQuotes) {
    throw new ToolboxError(
      'INVALID_CSV',
      'CSV contains an unclosed quoted field'
    );
  }

  if (current !== '' || cells.length > 0 || options.text.length > 0) {
    pushRow();
  }

  if (rows.length > maxRows) {
    throw new ToolboxError(
      'CSV_TOO_LARGE',
      `CSV supports at most ${maxRows} rows`
    );
  }

  return rows;
};

export const parseCsvRows = (input: CsvParseInput = {}): string[][] =>
  parseCsvRowsWithLines(input).map((row) => row.cells);

const parseDynamicValue = (value: string): JsonValue => {
  const normalized = value.trim();
  if (/^true$/i.test(normalized)) return true;
  if (/^false$/i.test(normalized)) return false;
  if (normalized === 'null') return null;
  if (normalized !== '' && Number.isFinite(Number(normalized))) {
    return Number(normalized);
  }

  return value;
};

const toJsonValue = (value: string, dynamicTypes: boolean): JsonValue =>
  dynamicTypes ? parseDynamicValue(value) : value;

export const csvToJson = (input: CsvToJsonInput = {}): CsvToJsonOutput => {
  const object = normalizeObject(input);
  const useHeaders = normalizeBoolean(object.useHeaders, true);
  const dynamicTypes = normalizeBoolean(object.dynamicTypes, true);
  const spaces = normalizeInteger(object.spaces, 2, 'spaces', 0, 8);
  const rows = parseCsvRows(input);
  const headers = useHeaders ? rows[0] ?? [] : null;
  const dataRows = useHeaders ? rows.slice(1) : rows;
  const json = dataRows.map((row) => {
    if (!headers) {
      return row.map((value) => toJsonValue(value, dynamicTypes));
    }

    return Object.fromEntries(
      headers.map((header, index) => [
        header,
        toJsonValue(row[index] ?? '', dynamicTypes)
      ])
    );
  }) as JsonValue[];

  return {
    json,
    text: JSON.stringify(json, null, spaces),
    rows,
    headers
  };
};

export const tsvToJson = (
  input: Omit<CsvToJsonInput, 'delimiter'> & { delimiter?: string } = {}
): CsvToJsonOutput =>
  csvToJson({
    ...input,
    delimiter: input.delimiter ?? '\t'
  });

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const toXmlName = (value: string, fallback: string): string => {
  const normalized = value.trim().replace(/[^A-Za-z0-9_.:-]/g, '_');
  const withFallback = normalized || fallback;
  return /^[A-Za-z_:]/.test(withFallback) ? withFallback : `_${withFallback}`;
};

export const csvToXml = (input: CsvToXmlInput = {}): CsvToMarkupOutput => {
  const object = normalizeObject(input);
  const useHeaders = normalizeBoolean(object.useHeaders, true);
  const rootName = toXmlName(
    normalizeString(object.rootName, 'root', 'rootName'),
    'root'
  );
  const rowName = toXmlName(
    normalizeString(object.rowName, 'row', 'rowName'),
    'row'
  );
  const rows = parseCsvRows(input);
  const headers = useHeaders ? rows[0] ?? [] : null;
  const dataRows = useHeaders ? rows.slice(1) : rows;

  if (rows.length === 0) {
    return {
      text: `<?xml version="1.0" encoding="UTF-8" ?>\n<${rootName}></${rootName}>`,
      rows,
      rowCount: 0,
      headers
    };
  }

  const lines = [`<?xml version="1.0" encoding="UTF-8" ?>`, `<${rootName}>`];
  dataRows.forEach((row, rowIndex) => {
    lines.push(`  <${rowName} id="${rowIndex}">`);
    const names = headers ?? row.map((_, index) => `column_${index + 1}`);
    names.forEach((name, index) => {
      const elementName = toXmlName(name, `column_${index + 1}`);
      lines.push(
        `    <${elementName}>${escapeXml(row[index] ?? '')}</${elementName}>`
      );
    });
    lines.push(`  </${rowName}>`);
  });
  lines.push(`</${rootName}>`);

  return {
    text: lines.join('\n'),
    rows,
    rowCount: dataRows.length,
    headers
  };
};

export const csvToYaml = (input: CsvToYamlInput = {}): CsvToMarkupOutput => {
  const object = normalizeObject(input);
  const useHeaders = normalizeBoolean(object.useHeaders, true);
  const spaces = normalizeInteger(object.spaces, 2, 'spaces', 1, 8);
  const json = csvToJson({
    ...input,
    useHeaders,
    dynamicTypes: false
  });

  return {
    text: stringifyYaml(json.json, {
      indent: spaces
    }).trimEnd(),
    rows: json.rows,
    rowCount: useHeaders ? Math.max(0, json.rows.length - 1) : json.rows.length,
    headers: json.headers
  };
};

const serializeCell = (
  value: string,
  delimiter: string,
  quote: string,
  quoteAll: boolean
): string => {
  const shouldQuote =
    quoteAll ||
    value.includes(delimiter) ||
    value.includes('\n') ||
    value.includes('\r') ||
    value.includes(quote);

  if (!shouldQuote) return value;

  return `${quote}${value.replaceAll(quote, `${quote}${quote}`)}${quote}`;
};

const serializeRows = (
  rows: string[][],
  delimiter: string,
  quote: string,
  quoteAll: boolean = false
): string =>
  rows
    .map((row) =>
      row
        .map((cell) => serializeCell(cell, delimiter, quote, quoteAll))
        .join(delimiter)
    )
    .join('\n');

export const csvToTsv = (input: CsvToTsvInput = {}): CsvTextOutput => {
  const object = normalizeObject(input);
  const includeHeader = normalizeBoolean(object.includeHeader, true);
  const rows = parseCsvRows(input);
  const selectedRows = includeHeader ? rows : rows.slice(1);

  return {
    text: serializeRows(selectedRows, '\t', '"', false),
    rows: selectedRows,
    rowCount: selectedRows.length
  };
};

export const changeCsvSeparator = (
  input: CsvChangeSeparatorInput = {}
): CsvTextOutput => {
  const object = normalizeObject(input);
  const outputDelimiter = normalizeSingleChar(
    object.outputDelimiter,
    ';',
    'outputDelimiter'
  );
  const outputQuote = normalizeSingleChar(
    object.outputQuote,
    '"',
    'outputQuote'
  );
  const quoteAll = normalizeBoolean(object.quoteAll, false);
  const rows = parseCsvRows(input);

  return {
    text: serializeRows(rows, outputDelimiter, outputQuote, quoteAll),
    rows,
    rowCount: rows.length
  };
};

const normalizeRows = (rows: string[][], fillValue: string): string[][] => {
  const width = Math.max(0, ...rows.map((row) => row.length));
  return rows.map((row) => {
    const normalized = [...row];
    while (normalized.length < width) {
      normalized.push(fillValue);
    }
    return normalized;
  });
};

export const transposeCsv = (input: CsvTransposeInput = {}): CsvTextOutput => {
  const object = normalizeObject(input);
  const fillMissing = normalizeBoolean(object.fillMissing, true);
  const fillValue = normalizeString(object.fillValue, '', 'fillValue');
  const delimiter = normalizeSingleChar(object.delimiter, ',', 'delimiter');
  const quote = normalizeSingleChar(object.quote, '"', 'quote');
  const rows = parseCsvRows(input);
  if (rows.length === 0) {
    return {
      text: '',
      rows: [],
      rowCount: 0
    };
  }

  const source = fillMissing ? normalizeRows(rows, fillValue) : rows;
  const width = Math.max(0, ...source.map((row) => row.length));
  const transposed = Array.from({ length: width }, (_, columnIndex) =>
    source.map((row) => row[columnIndex] ?? '')
  );

  return {
    text: serializeRows(transposed, delimiter, quote, false),
    rows: transposed,
    rowCount: transposed.length
  };
};

export const findIncompleteCsvRecords = (
  input: CsvIncompleteInput = {}
): CsvIncompleteOutput => {
  const object = normalizeObject(input);
  const checkEmptyValues = normalizeBoolean(object.checkEmptyValues, true);
  const limit = normalizeInteger(object.limit, 100, 'limit', 1, maxRows);
  const rows = parseCsvRowsWithLines(input);
  const expectedColumns = Math.max(0, ...rows.map((row) => row.cells.length));
  const issues: CsvIssue[] = [];

  for (const row of rows) {
    if (row.cells.length < expectedColumns) {
      const missingColumns = expectedColumns - row.cells.length;
      issues.push({
        line: row.line,
        title: `Found missing column(s) on line ${row.line}`,
        message: `Line ${row.line} has ${missingColumns} missing column(s).`,
        missingColumns,
        emptyColumns: []
      });
      continue;
    }

    if (checkEmptyValues) {
      const emptyColumns = row.cells
        .map((cell, index) => (cell.trim() === '' ? index + 1 : null))
        .filter((index): index is number => index !== null);

      if (emptyColumns.length > 0) {
        issues.push({
          line: row.line,
          title: `Found missing values on line ${row.line}`,
          message: `Empty values on line ${row.line}: ${emptyColumns
            .map((index) => `column ${index}`)
            .join(', ')}.`,
          missingColumns: 0,
          emptyColumns
        });
      }
    }
  }

  const limitedIssues = issues.slice(0, limit);

  return {
    complete: issues.length === 0,
    expectedColumns,
    issues: limitedIssues,
    result:
      issues.length === 0
        ? 'The CSV input is complete.'
        : limitedIssues
            .map((issue) => `Title: ${issue.title}\nMessage: ${issue.message}`)
            .join('\n\n')
  };
};

const csvRowsSchema = {
  type: 'array',
  items: {
    type: 'array',
    items: { type: 'string' }
  }
};

const csvBaseInputSchema = {
  text: { type: 'string' },
  delimiter: { type: 'string', default: ',' },
  quote: { type: 'string', default: '"' },
  comment: { type: 'string', default: '#' },
  skipEmptyLines: { type: 'boolean', default: true }
};

const csvTextOutputSchema = {
  type: 'object',
  required: ['text', 'rows', 'rowCount'],
  additionalProperties: false,
  properties: {
    text: { type: 'string' },
    rows: csvRowsSchema,
    rowCount: { type: 'number' }
  }
};

const textTool = (
  name: string,
  title: string,
  description: string,
  properties: Record<string, unknown>,
  execute: (input: unknown) => CsvTextOutput
): ToolboxTool => ({
  name,
  title,
  description,
  channels: ['web', 'api', 'mcp'],
  risks: ['local'],
  inputSchema: {
    type: 'object',
    required: ['text'],
    additionalProperties: false,
    properties: {
      ...csvBaseInputSchema,
      ...properties
    }
  },
  outputSchema: csvTextOutputSchema,
  execute: (input) => {
    try {
      return ok(execute(input ?? {}));
    } catch (error) {
      return normalizeError(error);
    }
  }
});

export const csvTools: ToolboxTool[] = [
  {
    name: 'csv.to_json',
    title: 'CSV to JSON',
    description: 'Convert CSV text to JSON.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        ...csvBaseInputSchema,
        useHeaders: { type: 'boolean', default: true },
        dynamicTypes: { type: 'boolean', default: true },
        spaces: {
          type: 'integer',
          minimum: 0,
          maximum: 8,
          default: 2
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['json', 'text', 'rows', 'headers'],
      additionalProperties: false,
      properties: {
        json: { type: 'array' },
        text: { type: 'string' },
        rows: csvRowsSchema,
        headers: {
          anyOf: [
            {
              type: 'array',
              items: { type: 'string' }
            },
            { type: 'null' }
          ]
        }
      }
    },
    execute: (input) => {
      try {
        return ok(csvToJson((input ?? {}) as CsvToJsonInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'tsv.to_json',
    title: 'TSV to JSON',
    description: 'Convert TSV text to JSON.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        ...csvBaseInputSchema,
        delimiter: { type: 'string', default: '\t' },
        useHeaders: { type: 'boolean', default: true },
        dynamicTypes: { type: 'boolean', default: true },
        spaces: {
          type: 'integer',
          minimum: 0,
          maximum: 8,
          default: 2
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['json', 'text', 'rows', 'headers'],
      additionalProperties: false,
      properties: {
        json: { type: 'array' },
        text: { type: 'string' },
        rows: csvRowsSchema,
        headers: {
          anyOf: [
            {
              type: 'array',
              items: { type: 'string' }
            },
            { type: 'null' }
          ]
        }
      }
    },
    execute: (input) => {
      try {
        return ok(tsvToJson((input ?? {}) as CsvToJsonInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'csv.to_xml',
    title: 'CSV to XML',
    description: 'Convert CSV text to XML.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        ...csvBaseInputSchema,
        useHeaders: { type: 'boolean', default: true },
        rootName: { type: 'string', default: 'root' },
        rowName: { type: 'string', default: 'row' }
      }
    },
    outputSchema: {
      ...csvTextOutputSchema,
      required: ['text', 'rows', 'rowCount', 'headers'],
      properties: {
        ...csvTextOutputSchema.properties,
        headers: {
          anyOf: [
            {
              type: 'array',
              items: { type: 'string' }
            },
            { type: 'null' }
          ]
        }
      }
    },
    execute: (input) => {
      try {
        return ok(csvToXml((input ?? {}) as CsvToXmlInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'csv.to_yaml',
    title: 'CSV to YAML',
    description: 'Convert CSV text to YAML.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        ...csvBaseInputSchema,
        useHeaders: { type: 'boolean', default: true },
        spaces: {
          type: 'integer',
          minimum: 1,
          maximum: 8,
          default: 2
        }
      }
    },
    outputSchema: {
      ...csvTextOutputSchema,
      required: ['text', 'rows', 'rowCount', 'headers'],
      properties: {
        ...csvTextOutputSchema.properties,
        headers: {
          anyOf: [
            {
              type: 'array',
              items: { type: 'string' }
            },
            { type: 'null' }
          ]
        }
      }
    },
    execute: (input) => {
      try {
        return ok(csvToYaml((input ?? {}) as CsvToYamlInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  textTool(
    'csv.to_tsv',
    'CSV to TSV',
    'Convert CSV text to tab-separated values.',
    {
      includeHeader: { type: 'boolean', default: true }
    },
    (input) => csvToTsv(input as CsvToTsvInput)
  ),
  textTool(
    'csv.change_separator',
    'Change CSV Separator',
    'Change the delimiter used by CSV text.',
    {
      outputDelimiter: { type: 'string', default: ';' },
      outputQuote: { type: 'string', default: '"' },
      quoteAll: { type: 'boolean', default: false }
    },
    (input) => changeCsvSeparator(input as CsvChangeSeparatorInput)
  ),
  textTool(
    'csv.transpose',
    'Transpose CSV',
    'Transpose CSV rows and columns.',
    {
      fillMissing: { type: 'boolean', default: true },
      fillValue: { type: 'string', default: '' }
    },
    (input) => transposeCsv(input as CsvTransposeInput)
  ),
  {
    name: 'csv.find_incomplete_records',
    title: 'Find Incomplete CSV Records',
    description: 'Find rows with missing columns or empty values.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        ...csvBaseInputSchema,
        checkEmptyValues: { type: 'boolean', default: true },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: maxRows,
          default: 100
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['complete', 'expectedColumns', 'issues', 'result'],
      additionalProperties: false,
      properties: {
        complete: { type: 'boolean' },
        expectedColumns: { type: 'number' },
        issues: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'line',
              'title',
              'message',
              'missingColumns',
              'emptyColumns'
            ],
            additionalProperties: false,
            properties: {
              line: { type: 'number' },
              title: { type: 'string' },
              message: { type: 'string' },
              missingColumns: { type: 'number' },
              emptyColumns: {
                type: 'array',
                items: { type: 'number' }
              }
            }
          }
        },
        result: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok(
          findIncompleteCsvRecords((input ?? {}) as CsvIncompleteInput)
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
