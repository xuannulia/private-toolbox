import {
  type JsonValue,
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';
import JSZip from 'jszip';
import { parseDocument, stringify as stringifyYaml } from 'yaml';

export type JsonFormatInput = {
  text: string;
  indentationType?: 'tab' | 'space';
  spacesCount?: number;
};

export type JsonTextOutput = {
  text: string;
};

export type JsonValidateInput = {
  text: string;
};

export type JsonValidateOutput = {
  valid: boolean;
  error?: string;
};

export type JsonToYamlInput = {
  text: string;
  indent?: number;
};

export type YamlToJsonInput = {
  text: string;
  spacesCount?: number;
};

export type JsonToQueryArrayFormat = 'repeat' | 'bracket' | 'comma';

export type JsonToQueryInput = {
  text: string;
  arrayFormat?: JsonToQueryArrayFormat;
  sortKeys?: boolean;
};

export type QueryToJsonInput = {
  text: string;
  inferTypes?: boolean;
  nestDotKeys?: boolean;
  spacesCount?: number;
};

export type JsonSortMode = 'key' | 'value';
export type JsonSortOrder = 'asc' | 'desc';

export type JsonSortInput = {
  text: string;
  mode?: JsonSortMode;
  key?: string;
  order?: JsonSortOrder;
  spacesCount?: number;
};

export type JsonEscapeInput = {
  text: string;
  wrapInQuotes?: boolean;
};

export type JsonStringifyInput = {
  text: string;
  indentationType?: 'tab' | 'space';
  spacesCount?: number;
  escapeHtml?: boolean;
};

export type JsonCompareFormat = 'text' | 'json';

export type JsonCompareInput = {
  left: string;
  right: string;
  format?: JsonCompareFormat;
};

export type JsonDifference = {
  path: string;
  type: 'missing_left' | 'missing_right' | 'type_mismatch' | 'value_mismatch';
  left?: JsonValue;
  right?: JsonValue;
  message: string;
};

export type JsonCompareOutput = {
  equal: boolean;
  differences: JsonDifference[];
  result: string;
  format: JsonCompareFormat;
};

export type JsonToCsvQuoteMode = 'always' | 'auto';

export type JsonToCsvInput = {
  text: string;
  delimiter?: string;
  includeHeaders?: boolean;
  quoteStrings?: JsonToCsvQuoteMode;
};

export type JsonToExcelFormat = 'base64' | 'data_url';

export type JsonToExcelInput = {
  text: string;
  sheetName?: string;
  fileName?: string;
  includeHeaders?: boolean;
  format?: JsonToExcelFormat;
};

export type JsonToExcelOutput = {
  fileName: string;
  sheetName: string;
  rowCount: number;
  columnCount: number;
  mimeType: string;
  format: JsonToExcelFormat;
  text: string;
};

export type JsonToXmlIndentationType = 'space' | 'tab' | 'none';

export type JsonToXmlInput = {
  text: string;
  indentationType?: JsonToXmlIndentationType;
  addMetaTag?: boolean;
  rootName?: string;
};

export type JsonToTypesLanguage = 'typescript' | 'java' | 'go' | 'csharp';

export type JsonToTypesInput = {
  text: string;
  language?: JsonToTypesLanguage;
  rootName?: string;
};

export type JsonToTypesOutput = {
  language: JsonToTypesLanguage;
  rootName: string;
  typeCount: number;
  text: string;
};

type JsonObject = { [key: string]: JsonValue };

const parseJson = (text: string): JsonValue => {
  try {
    return JSON.parse(text) as JsonValue;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid JSON string';
    throw new ToolboxError('INVALID_JSON', message);
  }
};

const isJsonObject = (value: JsonValue): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizePositiveInteger = (
  value: unknown,
  fallback: number,
  max: number
): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(0, Math.trunc(value)));
};

const toJsonValue = (value: unknown): JsonValue => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        toJsonValue(item)
      ])
    );
  }

  return null;
};

const parseYaml = (text: string): JsonValue => {
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new ToolboxError('INVALID_YAML', 'YAML text is required');
  }

  try {
    const document = parseDocument(text, {
      prettyErrors: false,
      uniqueKeys: true
    });
    if (document.errors.length > 0) {
      throw document.errors[0];
    }

    return toJsonValue(document.toJSON());
  } catch (error) {
    if (error instanceof ToolboxError) {
      throw error;
    }
    const message =
      error instanceof Error ? error.message : 'Invalid YAML string';
    throw new ToolboxError('INVALID_YAML', message);
  }
};

export const formatJson = ({
  text,
  indentationType = 'space',
  spacesCount = 2
}: JsonFormatInput): string => {
  const parsedJson = parseJson(text);
  const indent =
    indentationType === 'tab'
      ? '\t'
      : normalizePositiveInteger(spacesCount, 2, 8);

  return JSON.stringify(parsedJson, null, indent);
};

export const minifyJson = ({ text }: JsonValidateInput): string =>
  JSON.stringify(parseJson(text));

export const jsonToYaml = ({ text, indent = 2 }: JsonToYamlInput): string =>
  stringifyYaml(parseJson(text), {
    indent: normalizePositiveInteger(indent, 2, 8),
    lineWidth: 0
  });

export const yamlToJson = ({
  text,
  spacesCount = 2
}: YamlToJsonInput): string =>
  JSON.stringify(
    parseYaml(text),
    null,
    normalizePositiveInteger(spacesCount, 2, 8)
  );

const supportedJsonToQueryArrayFormats: JsonToQueryArrayFormat[] = [
  'repeat',
  'bracket',
  'comma'
];

const getObjectEntries = (
  value: JsonObject,
  sortKeys: boolean
): [string, JsonValue][] => {
  const entries = Object.entries(value);
  return sortKeys
    ? entries.sort(([left], [right]) => left.localeCompare(right))
    : entries;
};

const toQueryScalar = (value: JsonValue): string => {
  if (Array.isArray(value) || isJsonObject(value)) {
    return JSON.stringify(value);
  }

  return value === null ? 'null' : String(value);
};

const appendQueryPairs = (
  pairs: [string, string][],
  key: string,
  value: JsonValue,
  arrayFormat: JsonToQueryArrayFormat,
  sortKeys: boolean
) => {
  if (!key) {
    throw new ToolboxError(
      'INVALID_QUERY_KEY',
      'Query parameter key cannot be empty'
    );
  }

  if (Array.isArray(value)) {
    if (arrayFormat === 'comma') {
      pairs.push([key, value.map(toQueryScalar).join(',')]);
      return;
    }

    const pairKey = arrayFormat === 'bracket' ? `${key}[]` : key;
    value.forEach((item) => pairs.push([pairKey, toQueryScalar(item)]));
    return;
  }

  if (isJsonObject(value)) {
    getObjectEntries(value, sortKeys).forEach(([childKey, childValue]) => {
      appendQueryPairs(
        pairs,
        `${key}.${childKey}`,
        childValue,
        arrayFormat,
        sortKeys
      );
    });
    return;
  }

  pairs.push([key, toQueryScalar(value)]);
};

export const jsonToQuery = ({
  text,
  arrayFormat = 'repeat',
  sortKeys = false
}: JsonToQueryInput): string => {
  if (!supportedJsonToQueryArrayFormats.includes(arrayFormat)) {
    throw new ToolboxError(
      'UNSUPPORTED_QUERY_ARRAY_FORMAT',
      `Unsupported array format: ${arrayFormat}`
    );
  }

  const parsedJson = parseJson(text);
  if (!isJsonObject(parsedJson)) {
    throw new ToolboxError(
      'INVALID_QUERY_JSON',
      'JSON to query requires a top-level object'
    );
  }

  const pairs: [string, string][] = [];
  getObjectEntries(parsedJson, sortKeys).forEach(([key, value]) => {
    appendQueryPairs(pairs, key, value, arrayFormat, sortKeys);
  });

  return new URLSearchParams(pairs).toString();
};

const extractQueryText = (text: string): string => {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new ToolboxError('INVALID_QUERY_STRING', 'Query string is required');
  }

  try {
    const url = new URL(trimmed);
    return url.search.startsWith('?') ? url.search.slice(1) : url.search;
  } catch {
    const [withoutHash] = trimmed.split('#');
    return withoutHash.startsWith('?') ? withoutHash.slice(1) : withoutHash;
  }
};

const inferQueryValue = (value: string, inferTypes: boolean): JsonValue => {
  if (!inferTypes) {
    return value;
  }

  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;

  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(trimmed)) {
    const numberValue = Number(trimmed);
    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return toJsonValue(JSON.parse(trimmed));
    } catch {
      return value;
    }
  }

  return value;
};

const appendJsonObjectValue = (
  target: JsonObject,
  key: string,
  value: JsonValue
) => {
  if (Object.prototype.hasOwnProperty.call(target, key)) {
    const existing = target[key];
    target[key] = Array.isArray(existing)
      ? [...existing, value]
      : [existing, value];
    return;
  }

  target[key] = value;
};

const setQueryJsonValue = (
  target: JsonObject,
  rawKey: string,
  value: JsonValue,
  nestDotKeys: boolean
) => {
  const key = rawKey.endsWith('[]') ? rawKey.slice(0, -2) : rawKey;
  const path = nestDotKeys ? key.split('.').filter(Boolean) : [key];
  if (path.length === 0) {
    throw new ToolboxError(
      'INVALID_QUERY_KEY',
      'Query parameter key cannot be empty'
    );
  }

  let cursor = target;
  path.slice(0, -1).forEach((segment) => {
    const existing = cursor[segment];
    if (isJsonObject(existing)) {
      cursor = existing;
      return;
    }

    const next: JsonObject = {};
    cursor[segment] = next;
    cursor = next;
  });

  appendJsonObjectValue(cursor, path[path.length - 1], value);
};

export const queryToJson = ({
  text,
  inferTypes = true,
  nestDotKeys = true,
  spacesCount = 2
}: QueryToJsonInput): string => {
  const params = new URLSearchParams(extractQueryText(text));
  const result: JsonObject = {};

  params.forEach((value, key) => {
    setQueryJsonValue(
      result,
      key,
      inferQueryValue(value, inferTypes),
      nestDotKeys
    );
  });

  return JSON.stringify(
    result,
    null,
    normalizePositiveInteger(spacesCount, 2, 8)
  );
};

const sortOrders: JsonSortOrder[] = ['asc', 'desc'];
const sortModes: JsonSortMode[] = ['key', 'value'];

const normalizeSortOrder = (value: unknown): JsonSortOrder => {
  if (value === undefined || value === null || value === '') return 'asc';
  if (
    typeof value !== 'string' ||
    !sortOrders.includes(value as JsonSortOrder)
  ) {
    throw new ToolboxError(
      'INVALID_JSON_SORT_ORDER',
      'order must be asc or desc'
    );
  }

  return value as JsonSortOrder;
};

const normalizeSortMode = (value: unknown): JsonSortMode => {
  if (value === undefined || value === null || value === '') return 'key';
  if (typeof value !== 'string' || !sortModes.includes(value as JsonSortMode)) {
    throw new ToolboxError(
      'INVALID_JSON_SORT_MODE',
      'mode must be key or value'
    );
  }

  return value as JsonSortMode;
};

const sortJsonObjectKeys = (
  value: JsonObject,
  order: JsonSortOrder
): JsonObject => {
  const sorted: JsonObject = {};
  Object.keys(value)
    .sort((left, right) =>
      order === 'asc' ? left.localeCompare(right) : right.localeCompare(left)
    )
    .forEach((key) => {
      sorted[key] = value[key];
    });

  return sorted;
};

const compareJsonValues = (
  left: JsonValue,
  right: JsonValue,
  order: JsonSortOrder
): number => {
  const leftComparable =
    isJsonObject(left) || Array.isArray(left) ? JSON.stringify(left) : left;
  const rightComparable =
    isJsonObject(right) || Array.isArray(right) ? JSON.stringify(right) : right;

  if (leftComparable === null && rightComparable !== null) return 1;
  if (rightComparable === null && leftComparable !== null) return -1;
  if (leftComparable === rightComparable) return 0;

  const result =
    typeof leftComparable === 'number' && typeof rightComparable === 'number'
      ? leftComparable - rightComparable
      : String(leftComparable).localeCompare(String(rightComparable));

  return order === 'asc' ? result : -result;
};

export const sortJson = ({
  text,
  mode = 'key',
  key = '',
  order = 'asc',
  spacesCount = 2
}: JsonSortInput): string => {
  const parsed = parseJson(text);
  const sortMode = normalizeSortMode(mode);
  const sortOrder = normalizeSortOrder(order);
  const indent = normalizePositiveInteger(spacesCount, 2, 8);

  if (sortMode === 'key') {
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) {
        throw new ToolboxError('JSON_SORT_EMPTY_ARRAY', 'Array is empty');
      }

      return JSON.stringify(
        parsed.map((item) => {
          if (!isJsonObject(item)) {
            throw new ToolboxError(
              'JSON_SORT_INVALID_ARRAY',
              'Key sort requires an object or array of objects'
            );
          }
          return sortJsonObjectKeys(item, sortOrder);
        }),
        null,
        indent
      );
    }

    if (!isJsonObject(parsed)) {
      throw new ToolboxError(
        'JSON_SORT_INVALID_INPUT',
        'Key sort requires an object or array of objects'
      );
    }

    return JSON.stringify(sortJsonObjectKeys(parsed, sortOrder), null, indent);
  }

  if (!Array.isArray(parsed)) {
    throw new ToolboxError(
      'JSON_SORT_INVALID_INPUT',
      'Value sort requires a JSON array'
    );
  }
  if (parsed.length === 0) {
    throw new ToolboxError('JSON_SORT_EMPTY_ARRAY', 'Array is empty');
  }
  if (!key) {
    throw new ToolboxError('JSON_SORT_KEY_REQUIRED', 'key is required');
  }

  const sorted = [...parsed].sort((left, right) => {
    const leftValue = isJsonObject(left) ? left[key] : null;
    const rightValue = isJsonObject(right) ? right[key] : null;
    return compareJsonValues(leftValue ?? null, rightValue ?? null, sortOrder);
  });

  return JSON.stringify(sorted, null, indent);
};

export const escapeJson = ({
  text,
  wrapInQuotes = false
}: JsonEscapeInput): string => {
  const escaped = JSON.stringify(text);
  return wrapInQuotes ? escaped : escaped.slice(1, -1);
};

const unescapeSingleQuotedString = (value: string): string =>
  value
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t');

const normalizeJsonLikeText = (text: string): string =>
  text
    .replace(/'((?:\\.|[^'\\])*)'/g, (_match, body: string) =>
      JSON.stringify(unescapeSingleQuotedString(body))
    )
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3')
    .replace(/,\s*([}\]])/g, '$1');

const parseJsonLike = (text: string): JsonValue => {
  try {
    return parseJson(text);
  } catch {
    try {
      return JSON.parse(normalizeJsonLikeText(text)) as JsonValue;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Invalid JavaScript object/array';
      throw new ToolboxError('INVALID_JSON_LIKE', message);
    }
  }
};

const escapeHtmlEntities = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const stringifyJson = ({
  text,
  indentationType = 'space',
  spacesCount = 2,
  escapeHtml = false
}: JsonStringifyInput): string => {
  const indent =
    indentationType === 'tab'
      ? '\t'
      : normalizePositiveInteger(spacesCount, 2, 8);
  const result = JSON.stringify(parseJsonLike(text), null, indent);
  return escapeHtml ? escapeHtmlEntities(result) : result;
};

const fixTrailingCommas = (json: string): string =>
  json.replace(/,\s*([}\]])/g, '$1');

const parseComparableJson = (json: string): JsonValue => {
  if (!json.trim()) return {};
  return parseJson(fixTrailingCommas(json));
};

const jsonPath = (path: string[]): string =>
  path.length ? path.join('.') : 'root';

const typeOfJsonValue = (value: JsonValue): string =>
  Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;

const describeJsonValue = (value: JsonValue | undefined): string =>
  value === undefined
    ? 'undefined'
    : typeof value === 'string'
      ? value
      : JSON.stringify(value);

const addDifference = (
  differences: JsonDifference[],
  difference: JsonDifference
) => {
  differences.push(difference);
};

const diffJsonValues = (
  left: JsonValue,
  right: JsonValue,
  path: string[] = [],
  differences: JsonDifference[] = []
): JsonDifference[] => {
  const leftType = typeOfJsonValue(left);
  const rightType = typeOfJsonValue(right);
  const currentPath = jsonPath(path);

  if (leftType !== rightType) {
    addDifference(differences, {
      path: currentPath,
      type: 'type_mismatch',
      left,
      right,
      message: `${currentPath}: Type mismatch: ${leftType} != ${rightType}`
    });
    return differences;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    const maxLength = Math.max(left.length, right.length);
    for (let index = 0; index < maxLength; index += 1) {
      const childPath = [...path, String(index)];
      if (index >= left.length) {
        addDifference(differences, {
          path: jsonPath(childPath),
          type: 'missing_left',
          right: right[index],
          message: `${jsonPath(childPath)}: Missing in first JSON`
        });
      } else if (index >= right.length) {
        addDifference(differences, {
          path: jsonPath(childPath),
          type: 'missing_right',
          left: left[index],
          message: `${jsonPath(childPath)}: Missing in second JSON`
        });
      } else {
        diffJsonValues(left[index], right[index], childPath, differences);
      }
    }
    return differences;
  }

  if (isJsonObject(left) && isJsonObject(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of keys) {
      const childPath = [...path, key];
      if (!Object.prototype.hasOwnProperty.call(left, key)) {
        addDifference(differences, {
          path: jsonPath(childPath),
          type: 'missing_left',
          right: right[key],
          message: `${jsonPath(childPath)}: Missing in first JSON`
        });
      } else if (!Object.prototype.hasOwnProperty.call(right, key)) {
        addDifference(differences, {
          path: jsonPath(childPath),
          type: 'missing_right',
          left: left[key],
          message: `${jsonPath(childPath)}: Missing in second JSON`
        });
      } else {
        diffJsonValues(left[key], right[key], childPath, differences);
      }
    }
    return differences;
  }

  if (left !== right) {
    addDifference(differences, {
      path: currentPath,
      type: 'value_mismatch',
      left,
      right,
      message: `${currentPath}: Mismatch: ${describeJsonValue(
        left
      )} != ${describeJsonValue(right)}`
    });
  }

  return differences;
};

const compareFormats: JsonCompareFormat[] = ['text', 'json'];

const normalizeCompareFormat = (value: unknown): JsonCompareFormat => {
  if (value === undefined || value === null || value === '') return 'text';
  if (
    typeof value !== 'string' ||
    !compareFormats.includes(value as JsonCompareFormat)
  ) {
    throw new ToolboxError(
      'INVALID_JSON_COMPARE_FORMAT',
      'format must be text or json'
    );
  }

  return value as JsonCompareFormat;
};

export const compareJsonDocuments = ({
  left,
  right,
  format = 'text'
}: JsonCompareInput): JsonCompareOutput => {
  const outputFormat = normalizeCompareFormat(format);
  const differences = diffJsonValues(
    parseComparableJson(left),
    parseComparableJson(right)
  );
  const result =
    outputFormat === 'json'
      ? JSON.stringify(differences, null, 2)
      : differences.length
        ? differences.map((difference) => difference.message).join('\n')
        : 'No differences found';

  return {
    equal: differences.length === 0,
    differences,
    result,
    format: outputFormat
  };
};

export const compareJson = (
  left: string,
  right: string,
  format: JsonCompareFormat = 'text'
): string => compareJsonDocuments({ left, right, format }).result;

const flattenJsonValue = (
  value: JsonValue,
  prefix = '',
  result: Record<string, string> = {}
): Record<string, string> => {
  if (value === null) {
    if (prefix) result[prefix] = '';
    return result;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      flattenJsonValue(
        item,
        prefix ? `${prefix}[${index}]` : `[${index}]`,
        result
      );
    });
    return result;
  }

  if (isJsonObject(value)) {
    Object.entries(value).forEach(([key, item]) => {
      flattenJsonValue(item, prefix ? `${prefix}.${key}` : key, result);
    });
    return result;
  }

  if (prefix) result[prefix] = String(value);
  return result;
};

const flattenJsonToRows = (value: JsonValue): Record<string, string>[] => {
  if (Array.isArray(value)) return value.map((item) => flattenJsonValue(item));
  if (isJsonObject(value)) return [flattenJsonValue(value)];

  throw new ToolboxError(
    'JSON_TO_CSV_INVALID_INPUT',
    'JSON input must be an object or array of objects, not a bare primitive.'
  );
};

const getCsvHeaders = (rows: Record<string, string>[]): string[] => {
  const headers: string[] = [];
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (!headers.includes(key)) headers.push(key);
    });
  });

  return headers;
};

const normalizeCsvDelimiter = (value: unknown): string => {
  if (value === undefined || value === null) return ',';
  if (typeof value !== 'string' || value.length === 0) {
    throw new ToolboxError(
      'JSON_TO_CSV_INVALID_DELIMITER',
      'No CSV delimiter.'
    );
  }

  return value;
};

const quoteJsonCsvCell = (
  value: string,
  delimiter: string,
  quoteStrings: JsonToCsvQuoteMode
): string => {
  const escaped = value.replace(/"/g, '""');
  const needsQuoting =
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r');

  return quoteStrings === 'always' || needsQuoting ? `"${escaped}"` : value;
};

export const jsonToCsv = ({
  text,
  delimiter = ',',
  includeHeaders = true,
  quoteStrings = 'auto'
}: JsonToCsvInput): string => {
  if (quoteStrings !== 'auto' && quoteStrings !== 'always') {
    throw new ToolboxError(
      'JSON_TO_CSV_INVALID_QUOTE_MODE',
      'quoteStrings must be auto or always'
    );
  }

  const csvDelimiter = normalizeCsvDelimiter(delimiter);
  const rows = flattenJsonToRows(parseJson(text)).filter(
    (row) => Object.keys(row).length > 0
  );
  if (rows.length === 0) {
    throw new ToolboxError(
      'JSON_TO_CSV_EMPTY',
      'No data found in the provided JSON.'
    );
  }

  const headers = getCsvHeaders(rows);
  const lines: string[] = [];

  if (includeHeaders) {
    lines.push(
      headers
        .map((header) => quoteJsonCsvCell(header, csvDelimiter, quoteStrings))
        .join(csvDelimiter)
    );
  }

  rows.forEach((row) => {
    lines.push(
      headers
        .map((header) =>
          quoteJsonCsvCell(row[header] ?? '', csvDelimiter, quoteStrings)
        )
        .join(csvDelimiter)
    );
  });

  return lines.join('\r\n');
};

export const convertJsonToCsv = (
  text: string,
  options: Omit<JsonToCsvInput, 'text'>
): string => jsonToCsv({ text, ...options });

const excelMimeType =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const jsonToExcelFormats: JsonToExcelFormat[] = ['base64', 'data_url'];
const maxExcelRows = 10000;
const maxExcelColumns = 256;

type ExcelCellValue = string | number | boolean | null;
type ExcelRow = Record<string, ExcelCellValue>;

type BufferLike = {
  from(
    input: Uint8Array,
    encoding?: string
  ): {
    toString(encoding?: string): string;
  };
};

const getBuffer = (): BufferLike | undefined =>
  (globalThis as typeof globalThis & { Buffer?: BufferLike }).Buffer;

const bytesToBase64 = (bytes: Uint8Array): string => {
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  if (typeof btoa === 'function') return btoa(binary);

  const buffer = getBuffer();
  if (buffer) return buffer.from(bytes).toString('base64');

  throw new ToolboxError(
    'JSON_TO_EXCEL_BASE64_UNSUPPORTED',
    'Base64 encoding is not available'
  );
};

const normalizeExcelFormat = (value: unknown): JsonToExcelFormat => {
  if (value === undefined || value === null || value === '') return 'base64';
  if (
    typeof value !== 'string' ||
    !jsonToExcelFormats.includes(value as JsonToExcelFormat)
  ) {
    throw new ToolboxError(
      'JSON_TO_EXCEL_INVALID_FORMAT',
      'format must be base64 or data_url'
    );
  }

  return value as JsonToExcelFormat;
};

const normalizeExcelSheetName = (value: unknown): string => {
  if (value !== undefined && value !== null && typeof value !== 'string') {
    throw new ToolboxError(
      'JSON_TO_EXCEL_INVALID_SHEET_NAME',
      'sheetName must be a string'
    );
  }

  const normalized = (value || 'Sheet1')
    .toString()
    .replace(/[\[\]:*?/\\]/g, '_')
    .trim()
    .slice(0, 31);
  return normalized || 'Sheet1';
};

const normalizeExcelFileName = (value: unknown): string => {
  if (value !== undefined && value !== null && typeof value !== 'string') {
    throw new ToolboxError(
      'JSON_TO_EXCEL_INVALID_FILE_NAME',
      'fileName must be a string'
    );
  }

  const normalized = (value || 'private-toolbox.xlsx')
    .toString()
    .replace(/[\u0000<>:"/\\|?*]/g, '_')
    .trim()
    .slice(0, 120);
  const fileName = normalized || 'private-toolbox.xlsx';
  return /\.xlsx$/i.test(fileName) ? fileName : `${fileName}.xlsx`;
};

const flattenJsonValueForExcel = (
  value: JsonValue,
  prefix = '',
  result: ExcelRow = {}
): ExcelRow => {
  if (value === null) {
    if (prefix) result[prefix] = null;
    return result;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      flattenJsonValueForExcel(
        item,
        prefix ? `${prefix}[${index}]` : `[${index}]`,
        result
      );
    });
    return result;
  }

  if (isJsonObject(value)) {
    Object.entries(value).forEach(([key, item]) => {
      flattenJsonValueForExcel(item, prefix ? `${prefix}.${key}` : key, result);
    });
    return result;
  }

  if (prefix) result[prefix] = value;
  return result;
};

const flattenJsonToExcelRows = (value: JsonValue): ExcelRow[] => {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (!isJsonObject(item)) {
        throw new ToolboxError(
          'JSON_TO_EXCEL_INVALID_INPUT',
          'JSON to Excel requires an object or an array of objects'
        );
      }
      return flattenJsonValueForExcel(item);
    });
  }

  if (isJsonObject(value)) return [flattenJsonValueForExcel(value)];

  throw new ToolboxError(
    'JSON_TO_EXCEL_INVALID_INPUT',
    'JSON to Excel requires an object or an array of objects'
  );
};

const getExcelHeaders = (rows: ExcelRow[]): string[] => {
  const headers: string[] = [];
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (!headers.includes(key)) headers.push(key);
    });
  });

  return headers;
};

const escapeSpreadsheetXml = (value: string): string =>
  value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const getExcelColumnName = (index: number): string => {
  let value = index + 1;
  let name = '';

  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }

  return name;
};

const renderExcelTextCell = (reference: string, value: string): string => {
  const preserve = /^\s|\s$|\n|\r/.test(value) ? ' xml:space="preserve"' : '';
  return `<c r="${reference}" t="inlineStr"><is><t${preserve}>${escapeSpreadsheetXml(
    value
  )}</t></is></c>`;
};

const renderExcelCell = (
  columnIndex: number,
  rowIndex: number,
  value: ExcelCellValue
): string => {
  if (value === null) return '';

  const reference = `${getExcelColumnName(columnIndex)}${rowIndex}`;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${reference}"><v>${value}</v></c>`;
  }
  if (typeof value === 'boolean') {
    return `<c r="${reference}" t="b"><v>${value ? 1 : 0}</v></c>`;
  }

  return renderExcelTextCell(reference, String(value));
};

const renderExcelRow = (rowIndex: number, values: ExcelCellValue[]): string =>
  `<row r="${rowIndex}">${values
    .map((value, columnIndex) => renderExcelCell(columnIndex, rowIndex, value))
    .join('')}</row>`;

const createWorksheetXml = (
  rows: ExcelRow[],
  headers: string[],
  includeHeaders: boolean
): string => {
  const sheetRows: string[] = [];
  let rowIndex = 1;

  if (includeHeaders) {
    sheetRows.push(renderExcelRow(rowIndex, headers));
    rowIndex += 1;
  }

  rows.forEach((row) => {
    sheetRows.push(
      renderExcelRow(
        rowIndex,
        headers.map((header) => row[header] ?? null)
      )
    );
    rowIndex += 1;
  });

  const lastRow = Math.max(1, rowIndex - 1);
  const lastColumn = getExcelColumnName(Math.max(0, headers.length - 1));

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:${lastColumn}${lastRow}"/>
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <sheetData>${sheetRows.join('')}</sheetData>
</worksheet>`;
};

const createWorkbookXml = (sheetName: string): string =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="${escapeSpreadsheetXml(
    sheetName
  )}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

const createXlsxBytes = async (
  rows: ExcelRow[],
  headers: string[],
  sheetName: string,
  includeHeaders: boolean
): Promise<Uint8Array> => {
  const zip = new JSZip();

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`
  );
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`
  );
  zip.file(
    'docProps/app.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Private Toolbox</Application>
</Properties>`
  );
  zip.file(
    'docProps/core.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>Private Toolbox</dc:creator>
  <cp:lastModifiedBy>Private Toolbox</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">1970-01-01T00:00:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">1970-01-01T00:00:00Z</dcterms:modified>
</cp:coreProperties>`
  );
  zip.file('xl/workbook.xml', createWorkbookXml(sheetName));
  zip.file(
    'xl/_rels/workbook.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
  );
  zip.file(
    'xl/styles.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="1"><fill><patternFill patternType="none"/></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>
</styleSheet>`
  );
  zip.file(
    'xl/worksheets/sheet1.xml',
    createWorksheetXml(rows, headers, includeHeaders)
  );

  return zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6
    }
  });
};

export const jsonToExcel = async ({
  text,
  sheetName,
  fileName,
  includeHeaders = true,
  format = 'base64'
}: JsonToExcelInput): Promise<JsonToExcelOutput> => {
  const rows = flattenJsonToExcelRows(parseJson(text)).filter(
    (row) => Object.keys(row).length > 0
  );
  if (rows.length === 0) {
    throw new ToolboxError(
      'JSON_TO_EXCEL_EMPTY',
      'No data found in the provided JSON.'
    );
  }
  if (rows.length > maxExcelRows) {
    throw new ToolboxError(
      'JSON_TO_EXCEL_TOO_MANY_ROWS',
      `JSON to Excel supports up to ${maxExcelRows} rows`
    );
  }

  const headers = getExcelHeaders(rows);
  if (headers.length === 0) {
    throw new ToolboxError(
      'JSON_TO_EXCEL_EMPTY',
      'No data found in the provided JSON.'
    );
  }
  if (headers.length > maxExcelColumns) {
    throw new ToolboxError(
      'JSON_TO_EXCEL_TOO_MANY_COLUMNS',
      `JSON to Excel supports up to ${maxExcelColumns} columns`
    );
  }

  const outputFormat = normalizeExcelFormat(format);
  const outputSheetName = normalizeExcelSheetName(sheetName);
  const outputFileName = normalizeExcelFileName(fileName);
  const bytes = await createXlsxBytes(
    rows,
    headers,
    outputSheetName,
    includeHeaders
  );
  const base64 = bytesToBase64(bytes);

  return {
    fileName: outputFileName,
    sheetName: outputSheetName,
    rowCount: rows.length,
    columnCount: headers.length,
    mimeType: excelMimeType,
    format: outputFormat,
    text:
      outputFormat === 'data_url'
        ? `data:${excelMimeType};base64,${base64}`
        : base64
  };
};

const normalizeXmlName = (key: string): string => {
  const fallback = 'item';
  const normalized = key
    .replace(/^[^A-Za-z_\u00C0-\uFFFF]+/, '')
    .replace(/[^A-Za-z0-9_.:\-\u00C0-\uFFFF]/g, '_');
  return normalized || fallback;
};

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const xmlIndent = (
  indentationType: JsonToXmlIndentationType,
  depth: number
): string =>
  indentationType === 'none'
    ? ''
    : indentationType === 'tab'
      ? '\t'.repeat(depth)
      : '  '.repeat(depth);

const jsonValueToXml = (
  key: string,
  value: JsonValue,
  indentationType: JsonToXmlIndentationType,
  depth: number
): string => {
  const newline = indentationType === 'none' ? '' : '\n';
  const tagName = normalizeXmlName(key);
  const indent = xmlIndent(indentationType, depth);

  if (value === null) return `${indent}<${tagName}></${tagName}>${newline}`;

  if (Array.isArray(value)) {
    return value
      .map((item) => jsonValueToXml(tagName, item, indentationType, depth))
      .join('');
  }

  if (isJsonObject(value)) {
    const children = Object.entries(value)
      .map(([childKey, childValue]) =>
        jsonValueToXml(childKey, childValue, indentationType, depth + 1)
      )
      .join('');
    return `${indent}<${tagName}>${newline}${children}${indent}</${tagName}>${newline}`;
  }

  return `${indent}<${tagName}>${escapeXml(
    String(value)
  )}</${tagName}>${newline}`;
};

export const jsonToXml = ({
  text,
  indentationType = 'space',
  addMetaTag = false,
  rootName = 'root'
}: JsonToXmlInput): string => {
  const parsed = parseJson(text);
  const safeRootName = normalizeXmlName(rootName);
  const newline = indentationType === 'none' ? '' : '\n';
  const body = isJsonObject(parsed)
    ? Object.entries(parsed)
        .map(([key, value]) => jsonValueToXml(key, value, indentationType, 1))
        .join('')
    : Array.isArray(parsed)
      ? parsed
          .map((item) => jsonValueToXml('item', item, indentationType, 1))
          .join('')
      : jsonValueToXml('value', parsed, indentationType, 1);
  const meta = addMetaTag
    ? `<?xml version="1.0" encoding="UTF-8"?>${newline}`
    : '';

  return `${meta}<${safeRootName}>${newline}${body}</${safeRootName}>`;
};

export const convertJsonToXml = (
  text: string,
  options: Omit<JsonToXmlInput, 'text'>
): string => jsonToXml({ text, ...options });

type InferredKind =
  | 'any'
  | 'null'
  | 'boolean'
  | 'number'
  | 'string'
  | 'array'
  | 'object'
  | 'union';

type InferredType = {
  kind: InferredKind;
  item?: InferredType;
  properties?: Map<string, InferredProperty>;
  variants?: InferredType[];
};

type InferredProperty = {
  type: InferredType;
  optional: boolean;
};

type NamedType = {
  name: string;
  properties: Map<string, InferredProperty>;
  parentName?: string;
  propertyName?: string;
};

const supportedJsonToTypesLanguages: JsonToTypesLanguage[] = [
  'typescript',
  'java',
  'go',
  'csharp'
];

const primitiveType = (kind: InferredKind): InferredType => ({ kind });

const normalizeTypesLanguage = (value: unknown): JsonToTypesLanguage => {
  if (value === undefined || value === null || value === '') {
    return 'typescript';
  }

  if (
    typeof value !== 'string' ||
    !supportedJsonToTypesLanguages.includes(value as JsonToTypesLanguage)
  ) {
    throw new ToolboxError(
      'JSON_TO_TYPES_INVALID_LANGUAGE',
      'language must be typescript, java, go, or csharp'
    );
  }

  return value as JsonToTypesLanguage;
};

const toPascalCase = (value: string): string => {
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  const result = words
    .map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
    .join('');

  return /^[A-Za-z_]/.test(result) ? result : `Type${result || 'Root'}`;
};

const toCamelCase = (value: string): string => {
  const pascal = toPascalCase(value);
  return `${pascal[0].toLowerCase()}${pascal.slice(1)}`;
};

const toGoFieldName = (value: string): string => {
  const pascal = toPascalCase(value);
  return pascal === 'Id' ? 'ID' : pascal.replace(/Id$/u, 'ID');
};

const normalizeRootTypeName = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return 'Root';
  if (typeof value !== 'string') {
    throw new ToolboxError(
      'JSON_TO_TYPES_INVALID_ROOT_NAME',
      'rootName must be a string'
    );
  }

  return toPascalCase(value).slice(0, 80) || 'Root';
};

const typeSignature = (type: InferredType): string => {
  switch (type.kind) {
    case 'array':
      return `array<${typeSignature(type.item ?? primitiveType('any'))}>`;
    case 'object':
      return 'object';
    case 'union':
      return `union<${(type.variants ?? []).map(typeSignature).join('|')}>`;
    default:
      return type.kind;
  }
};

const mergeTypes = (left: InferredType, right: InferredType): InferredType => {
  if (left.kind === right.kind) {
    if (left.kind === 'array') {
      return {
        kind: 'array',
        item: mergeTypes(
          left.item ?? primitiveType('any'),
          right.item ?? primitiveType('any')
        )
      };
    }

    if (left.kind === 'object') {
      const merged = new Map<string, InferredProperty>();
      const keys = new Set([
        ...Array.from(left.properties?.keys() ?? []),
        ...Array.from(right.properties?.keys() ?? [])
      ]);

      keys.forEach((key) => {
        const leftProperty = left.properties?.get(key);
        const rightProperty = right.properties?.get(key);

        if (leftProperty && rightProperty) {
          merged.set(key, {
            type: mergeTypes(leftProperty.type, rightProperty.type),
            optional: leftProperty.optional || rightProperty.optional
          });
        } else {
          merged.set(key, {
            type: (leftProperty ?? rightProperty)?.type ?? primitiveType('any'),
            optional: true
          });
        }
      });

      return {
        kind: 'object',
        properties: merged
      };
    }

    return left;
  }

  const variants = [
    ...(left.kind === 'union' ? left.variants ?? [] : [left]),
    ...(right.kind === 'union' ? right.variants ?? [] : [right])
  ];
  const unique = new Map<string, InferredType>();
  variants.forEach((variant) => unique.set(typeSignature(variant), variant));

  return {
    kind: 'union',
    variants: Array.from(unique.values())
  };
};

const inferJsonType = (value: JsonValue): InferredType => {
  if (value === null) return primitiveType('null');
  if (typeof value === 'boolean') return primitiveType('boolean');
  if (typeof value === 'number') return primitiveType('number');
  if (typeof value === 'string') return primitiveType('string');

  if (Array.isArray(value)) {
    const item = value.length
      ? value.map(inferJsonType).reduce(mergeTypes)
      : primitiveType('any');

    return {
      kind: 'array',
      item
    };
  }

  const properties = new Map<string, InferredProperty>();
  Object.entries(value).forEach(([key, item]) => {
    properties.set(key, {
      type: inferJsonType(item),
      optional: false
    });
  });

  return {
    kind: 'object',
    properties
  };
};

const getRootInferredType = (value: JsonValue): InferredType => {
  const inferred = inferJsonType(value);
  if (inferred.kind === 'array') return inferred.item ?? primitiveType('any');
  return inferred;
};

const buildNamedTypes = (
  rootName: string,
  rootType: InferredType
): NamedType[] => {
  const namedTypes: NamedType[] = [];
  const usedNames = new Set<string>();

  const uniqueName = (name: string): string => {
    let candidate = toPascalCase(name);
    let suffix = 2;

    while (usedNames.has(candidate)) {
      candidate = `${toPascalCase(name)}${suffix}`;
      suffix += 1;
    }

    usedNames.add(candidate);
    return candidate;
  };

  const visit = (
    name: string,
    type: InferredType,
    parentName?: string,
    propertyName?: string
  ) => {
    if (type.kind !== 'object' || !type.properties) return;

    const typeName = uniqueName(name);
    namedTypes.push({
      name: typeName,
      properties: type.properties,
      parentName,
      propertyName
    });

    type.properties.forEach((property, key) => {
      const childType =
        property.type.kind === 'array' ? property.type.item : property.type;
      if (childType?.kind === 'object') {
        visit(`${typeName}${toPascalCase(key)}`, childType, typeName, key);
      }
    });
  };

  if (rootType.kind === 'object') visit(rootName, rootType);

  return namedTypes;
};

const findNestedTypeName = (
  namedTypes: NamedType[],
  parentName: string,
  propertyName: string
): string | null => {
  return (
    namedTypes.find(
      (type) =>
        type.parentName === parentName && type.propertyName === propertyName
    )?.name ?? null
  );
};

const isIdentifier = (value: string): boolean =>
  /^[A-Za-z_$][\w$]*$/.test(value);

const tsTypeFor = (
  type: InferredType,
  namedTypes: NamedType[],
  parentName: string,
  propertyName: string
): string => {
  switch (type.kind) {
    case 'boolean':
      return 'boolean';
    case 'number':
      return 'number';
    case 'string':
      return 'string';
    case 'null':
      return 'null';
    case 'array': {
      const item = type.item ?? primitiveType('any');
      const itemType = tsTypeFor(item, namedTypes, parentName, propertyName);
      return `${item.kind === 'union' ? `(${itemType})` : itemType}[]`;
    }
    case 'object':
      return (
        findNestedTypeName(namedTypes, parentName, propertyName) ??
        'Record<string, unknown>'
      );
    case 'union':
      return (type.variants ?? [])
        .map((variant) =>
          tsTypeFor(variant, namedTypes, parentName, propertyName)
        )
        .join(' | ');
    default:
      return 'unknown';
  }
};

const javaTypeFor = (
  type: InferredType,
  namedTypes: NamedType[],
  parentName: string,
  propertyName: string
): string => {
  switch (type.kind) {
    case 'boolean':
      return 'Boolean';
    case 'number':
      return 'Double';
    case 'string':
      return 'String';
    case 'array':
      return `List<${javaTypeFor(
        type.item ?? primitiveType('any'),
        namedTypes,
        parentName,
        propertyName
      )}>`;
    case 'object':
      return (
        findNestedTypeName(namedTypes, parentName, propertyName) ??
        'Map<String, Object>'
      );
    default:
      return 'Object';
  }
};

const csharpTypeFor = (
  type: InferredType,
  namedTypes: NamedType[],
  parentName: string,
  propertyName: string
): string => {
  switch (type.kind) {
    case 'boolean':
      return 'bool';
    case 'number':
      return 'double';
    case 'string':
      return 'string';
    case 'array':
      return `List<${csharpTypeFor(
        type.item ?? primitiveType('any'),
        namedTypes,
        parentName,
        propertyName
      )}>`;
    case 'object':
      return (
        findNestedTypeName(namedTypes, parentName, propertyName) ??
        'Dictionary<string, object>'
      );
    default:
      return 'object';
  }
};

const goTypeFor = (
  type: InferredType,
  namedTypes: NamedType[],
  parentName: string,
  propertyName: string
): string => {
  switch (type.kind) {
    case 'boolean':
      return 'bool';
    case 'number':
      return 'float64';
    case 'string':
      return 'string';
    case 'array':
      return `[]${goTypeFor(
        type.item ?? primitiveType('any'),
        namedTypes,
        parentName,
        propertyName
      )}`;
    case 'object':
      return (
        findNestedTypeName(namedTypes, parentName, propertyName) ??
        'map[string]any'
      );
    default:
      return 'any';
  }
};

const generateTypeScriptTypes = (namedTypes: NamedType[]): string =>
  namedTypes
    .map((type) => {
      const lines = [`export interface ${type.name} {`];
      type.properties.forEach((property, key) => {
        const propertyName = isIdentifier(key) ? key : JSON.stringify(key);
        const optional = property.optional ? '?' : '';
        lines.push(
          `  ${propertyName}${optional}: ${tsTypeFor(
            property.type,
            namedTypes,
            type.name,
            key
          )};`
        );
      });
      lines.push('}');
      return lines.join('\n');
    })
    .join('\n\n');

const generateJavaTypes = (namedTypes: NamedType[]): string => {
  const bodyLines: string[] = [];

  namedTypes.forEach((type, typeIndex) => {
    if (typeIndex > 0) bodyLines.push('');
    bodyLines.push(`public class ${type.name} {`);
    type.properties.forEach((property, key) => {
      bodyLines.push(
        `  private ${javaTypeFor(
          property.type,
          namedTypes,
          type.name,
          key
        )} ${toCamelCase(key)};`
      );
    });
    bodyLines.push('}');
  });

  const imports = [
    bodyLines.some((line) => line.includes('List<')) &&
      'import java.util.List;',
    bodyLines.some((line) => line.includes('Map<')) && 'import java.util.Map;'
  ].filter(Boolean) as string[];

  return [...imports, ...(imports.length ? [''] : []), ...bodyLines].join('\n');
};

const generateCSharpTypes = (namedTypes: NamedType[]): string => {
  const bodyLines: string[] = [];

  namedTypes.forEach((type, typeIndex) => {
    if (typeIndex > 0) bodyLines.push('');
    bodyLines.push(`public class ${type.name}`);
    bodyLines.push('{');
    type.properties.forEach((property, key) => {
      bodyLines.push(
        `  public ${csharpTypeFor(
          property.type,
          namedTypes,
          type.name,
          key
        )} ${toPascalCase(key)} { get; set; }`
      );
    });
    bodyLines.push('}');
  });

  const needsCollections = bodyLines.some(
    (line) => line.includes('List<') || line.includes('Dictionary<')
  );

  return [
    ...(needsCollections ? ['using System.Collections.Generic;', ''] : []),
    ...bodyLines
  ].join('\n');
};

const generateGoTypes = (namedTypes: NamedType[]): string =>
  [
    'package models',
    '',
    ...namedTypes.flatMap((type, typeIndex) => {
      const lines = typeIndex > 0 ? [''] : [];
      lines.push(`type ${type.name} struct {`);
      type.properties.forEach((property, key) => {
        lines.push(
          `  ${toGoFieldName(key)} ${goTypeFor(
            property.type,
            namedTypes,
            type.name,
            key
          )} \`json:"${key}${property.optional ? ',omitempty' : ''}"\``
        );
      });
      lines.push('}');
      return lines;
    })
  ].join('\n');

const generateTypes = (
  language: JsonToTypesLanguage,
  namedTypes: NamedType[]
): string => {
  switch (language) {
    case 'java':
      return generateJavaTypes(namedTypes);
    case 'go':
      return generateGoTypes(namedTypes);
    case 'csharp':
      return generateCSharpTypes(namedTypes);
    default:
      return generateTypeScriptTypes(namedTypes);
  }
};

export const jsonToTypes = ({
  text,
  language = 'typescript',
  rootName = 'Root'
}: JsonToTypesInput): JsonToTypesOutput => {
  const normalizedLanguage = normalizeTypesLanguage(language);
  const normalizedRootName = normalizeRootTypeName(rootName);
  const rootType = getRootInferredType(parseJson(text));

  if (rootType.kind !== 'object') {
    throw new ToolboxError(
      'JSON_TO_TYPES_INVALID_INPUT',
      'JSON to types requires an object or an array of objects'
    );
  }

  const namedTypes = buildNamedTypes(normalizedRootName, rootType);

  return {
    language: normalizedLanguage,
    rootName: normalizedRootName,
    typeCount: namedTypes.length,
    text: generateTypes(normalizedLanguage, namedTypes)
  };
};

export const validateJson = ({
  text
}: JsonValidateInput): JsonValidateOutput => {
  try {
    parseJson(text);
    return { valid: true };
  } catch (error) {
    if (error instanceof ToolboxError) {
      return { valid: false, error: error.message };
    }
    return { valid: false, error: 'Unknown error occurred' };
  }
};

export const jsonTools: ToolboxTool[] = [
  {
    name: 'json.format',
    title: 'Format JSON',
    description: 'Parse JSON text and return a formatted JSON string.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        indentationType: {
          type: 'string',
          enum: ['tab', 'space'],
          default: 'space'
        },
        spacesCount: { type: 'number', default: 2 }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok({ text: formatJson(input as JsonFormatInput) });
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'json.minify',
    title: 'Minify JSON',
    description: 'Parse JSON text and return compact JSON.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok({ text: minifyJson(input as JsonValidateInput) });
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'json.validate',
    title: 'Validate JSON',
    description: 'Validate JSON text and return a structured result.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['valid'],
      additionalProperties: false,
      properties: {
        valid: { type: 'boolean' },
        error: { type: 'string' }
      }
    },
    execute: (input) => ok(validateJson(input as JsonValidateInput))
  },
  {
    name: 'json.sort',
    title: 'Sort JSON',
    description: 'Sort JSON object keys or an array by a selected object key.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        mode: { type: 'string', enum: sortModes, default: 'key' },
        key: { type: 'string' },
        order: { type: 'string', enum: sortOrders, default: 'asc' },
        spacesCount: { type: 'number', default: 2 }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok({ text: sortJson(input as JsonSortInput) });
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'json.escape',
    title: 'Escape JSON String',
    description: 'Escape text so it can be embedded as a JSON string value.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        wrapInQuotes: { type: 'boolean', default: false }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok({ text: escapeJson(input as JsonEscapeInput) });
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'json.stringify',
    title: 'Stringify JSON-like Input',
    description:
      'Convert JSON or simple JavaScript object literal text to formatted JSON without evaluating code.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        indentationType: {
          type: 'string',
          enum: ['tab', 'space'],
          default: 'space'
        },
        spacesCount: { type: 'number', default: 2 },
        escapeHtml: { type: 'boolean', default: false }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok({ text: stringifyJson(input as JsonStringifyInput) });
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'json.compare',
    title: 'Compare JSON',
    description:
      'Compare two JSON documents and return structured differences.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['left', 'right'],
      additionalProperties: false,
      properties: {
        left: { type: 'string' },
        right: { type: 'string' },
        format: { type: 'string', enum: compareFormats, default: 'text' }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['equal', 'differences', 'result', 'format'],
      additionalProperties: false,
      properties: {
        equal: { type: 'boolean' },
        differences: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: true
          }
        },
        result: { type: 'string' },
        format: { type: 'string', enum: compareFormats }
      }
    },
    execute: (input) => {
      try {
        return ok(compareJsonDocuments(input as JsonCompareInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'json.to_csv',
    title: 'JSON to CSV',
    description: 'Flatten a JSON object or array of objects to CSV.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        delimiter: { type: 'string', default: ',' },
        includeHeaders: { type: 'boolean', default: true },
        quoteStrings: {
          type: 'string',
          enum: ['always', 'auto'],
          default: 'auto'
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok({ text: jsonToCsv(input as JsonToCsvInput) });
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'json.to_excel',
    title: 'JSON to Excel',
    description: 'Flatten a JSON object or array of objects to an XLSX file.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        sheetName: { type: 'string', default: 'Sheet1' },
        fileName: { type: 'string', default: 'private-toolbox.xlsx' },
        includeHeaders: { type: 'boolean', default: true },
        format: {
          type: 'string',
          enum: jsonToExcelFormats,
          default: 'base64'
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'fileName',
        'sheetName',
        'rowCount',
        'columnCount',
        'mimeType',
        'format',
        'text'
      ],
      additionalProperties: false,
      properties: {
        fileName: { type: 'string' },
        sheetName: { type: 'string' },
        rowCount: { type: 'number' },
        columnCount: { type: 'number' },
        mimeType: { type: 'string' },
        format: { type: 'string', enum: jsonToExcelFormats },
        text: { type: 'string' }
      }
    },
    execute: async (input) => {
      try {
        return ok(
          (await jsonToExcel(input as JsonToExcelInput)) as unknown as JsonValue
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'json.to_xml',
    title: 'JSON to XML',
    description: 'Convert JSON text to XML.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        indentationType: {
          type: 'string',
          enum: ['space', 'tab', 'none'],
          default: 'space'
        },
        addMetaTag: { type: 'boolean', default: false },
        rootName: { type: 'string', default: 'root' }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok({ text: jsonToXml(input as JsonToXmlInput) });
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'json.to_types',
    title: 'JSON to Types',
    description:
      'Infer TypeScript, Java, Go, or C# entity types from example JSON.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        language: {
          type: 'string',
          enum: supportedJsonToTypesLanguages,
          default: 'typescript'
        },
        rootName: { type: 'string', default: 'Root' }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['language', 'rootName', 'typeCount', 'text'],
      additionalProperties: false,
      properties: {
        language: { enum: supportedJsonToTypesLanguages },
        rootName: { type: 'string' },
        typeCount: { type: 'number' },
        text: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok(jsonToTypes(input as JsonToTypesInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'json.to_yaml',
    title: 'JSON to YAML',
    description: 'Parse JSON text and return YAML.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        indent: { type: 'number', default: 2 }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok({ text: jsonToYaml(input as JsonToYamlInput) });
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'yaml.to_json',
    title: 'YAML to JSON',
    description: 'Parse YAML text and return formatted JSON.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        spacesCount: { type: 'number', default: 2 }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok({ text: yamlToJson(input as YamlToJsonInput) });
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'json.to_query',
    title: 'JSON to Query String',
    description: 'Convert a JSON object to URL query parameters.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        arrayFormat: {
          type: 'string',
          enum: supportedJsonToQueryArrayFormats,
          default: 'repeat'
        },
        sortKeys: { type: 'boolean', default: false }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok({ text: jsonToQuery(input as JsonToQueryInput) });
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'query.to_json',
    title: 'Query String to JSON',
    description: 'Convert URL query parameters to formatted JSON.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        inferTypes: { type: 'boolean', default: true },
        nestDotKeys: { type: 'boolean', default: true },
        spacesCount: { type: 'number', default: 2 }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok({ text: queryToJson(input as QueryToJsonInput) });
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
