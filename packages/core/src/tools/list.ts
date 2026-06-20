import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

const splitModes = ['separator', 'regex', 'lines'] as const;
const sortMethods = ['alphabetic', 'numeric', 'length'] as const;
const sortOrders = ['asc', 'desc'] as const;
const rotateDirections = ['left', 'right'] as const;
const truncateFromValues = ['start', 'end'] as const;
const mostCommonSortMethods = ['count', 'alphabetic'] as const;

export type ListSplitMode = (typeof splitModes)[number];
export type ListSortMethod = (typeof sortMethods)[number];
export type ListSortOrder = (typeof sortOrders)[number];
export type ListRotateDirection = (typeof rotateDirections)[number];
export type ListTruncateFrom = (typeof truncateFromValues)[number];
export type ListMostCommonSortMethod = (typeof mostCommonSortMethods)[number];

export type ListBaseInput = {
  text?: string;
  items?: string[];
  splitMode?: ListSplitMode;
  separator?: string;
  joinSeparator?: string;
  trimItems?: boolean;
  removeEmpty?: boolean;
};

export type ListOutput = {
  items: string[];
  result: string;
  count: number;
};

export type ListSortInput = ListBaseInput & {
  method?: ListSortMethod;
  order?: ListSortOrder;
  caseSensitive?: boolean;
  removeDuplicates?: boolean;
};

export type ListShuffleInput = ListBaseInput & {
  limit?: number;
  seed?: string;
};

export type ListUniqueInput = ListBaseInput & {
  caseSensitive?: boolean;
  onlyUnique?: boolean;
};

export type ListMostCommonInput = ListBaseInput & {
  sortBy?: ListMostCommonSortMethod;
  ignoreCase?: boolean;
  limit?: number;
};

export type ListMostCommonEntry = {
  item: string;
  count: number;
  percentage: number;
};

export type ListMostCommonOutput = {
  entries: ListMostCommonEntry[];
  total: number;
  result: string;
};

export type ListChunkInput = ListBaseInput & {
  chunkSize?: number;
  pad?: boolean;
  paddingItem?: string;
  itemSeparator?: string;
  chunkSeparator?: string;
  leftWrap?: string;
  rightWrap?: string;
};

export type ListChunkOutput = ListOutput & {
  chunks: string[][];
};

export type ListRotateInput = ListBaseInput & {
  step?: number;
  direction?: ListRotateDirection;
};

export type ListTruncateInput = ListBaseInput & {
  length?: number;
  from?: ListTruncateFrom;
};

const maxItems = 10000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeObject = (input: unknown): Record<string, unknown> => {
  if (input === undefined || input === null) return {};
  if (!isRecord(input)) {
    throw new ToolboxError('INVALID_LIST_INPUT', 'input must be an object');
  }

  return input;
};

const normalizeString = (
  value: unknown,
  fallback: string,
  name: string
): string => {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string') {
    throw new ToolboxError('INVALID_LIST_INPUT', `${name} must be a string`);
  }

  return value;
};

const normalizeBoolean = (value: unknown, fallback: boolean): boolean => {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'boolean') {
    throw new ToolboxError('INVALID_LIST_INPUT', 'boolean option is invalid');
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
      'INVALID_LIST_INPUT',
      `${name} must be one of: ${values.join(', ')}`
    );
  }

  return value;
};

const normalizeInteger = (
  value: unknown,
  fallback: number | undefined,
  name: string,
  min: number,
  max: number = maxItems
): number => {
  const selected = value === undefined || value === null ? fallback : value;
  if (
    typeof selected !== 'number' ||
    !Number.isInteger(selected) ||
    selected < min ||
    selected > max
  ) {
    throw new ToolboxError(
      'INVALID_LIST_INPUT',
      `${name} must be an integer from ${min} to ${max}`
    );
  }

  return selected;
};

const normalizeOptionalInteger = (
  value: unknown,
  name: string,
  min: number,
  max: number = maxItems
): number | undefined => {
  if (value === undefined || value === null) return undefined;
  return normalizeInteger(value, undefined, name, min, max);
};

const compileSplitRegex = (pattern: string): RegExp => {
  try {
    return new RegExp(pattern);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid regex';
    throw new ToolboxError('INVALID_LIST_REGEX', message);
  }
};

export const splitListInput = (input: ListBaseInput = {}): string[] => {
  const object = normalizeObject(input);
  const trimItems = normalizeBoolean(object.trimItems, false);
  const removeEmpty = normalizeBoolean(object.removeEmpty, false);
  const rawItems = object.items;

  let items: string[];
  if (rawItems !== undefined) {
    if (
      !Array.isArray(rawItems) ||
      rawItems.some((item) => typeof item !== 'string')
    ) {
      throw new ToolboxError(
        'INVALID_LIST_INPUT',
        'items must be an array of strings'
      );
    }
    items = [...rawItems];
  } else {
    const text = normalizeString(object.text, '', 'text');
    const splitMode = normalizeEnum(
      object.splitMode,
      'lines',
      splitModes,
      'splitMode'
    );
    const separator = normalizeString(object.separator, '\n', 'separator');

    if (splitMode === 'lines') {
      items = text.split(/\r?\n/);
    } else if (splitMode === 'regex') {
      items = text.split(compileSplitRegex(separator));
    } else {
      items = text.split(separator);
    }
  }

  if (items.length > maxItems) {
    throw new ToolboxError(
      'LIST_TOO_LARGE',
      `list tools support at most ${maxItems} items`
    );
  }

  if (trimItems) {
    items = items.map((item) => item.trim());
  }
  if (removeEmpty) {
    items = items.filter((item) => item !== '');
  }

  return items;
};

const joinItems = (items: string[], input: ListBaseInput = {}): string => {
  const joinSeparator = normalizeString(
    normalizeObject(input).joinSeparator,
    '\n',
    'joinSeparator'
  );

  return items.join(joinSeparator);
};

const toListOutput = (
  items: string[],
  input: ListBaseInput = {}
): ListOutput => ({
  items,
  result: joinItems(items, input),
  count: items.length
});

const isNumericText = (value: string): boolean =>
  /^[-+]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(value.trim());

const numericCompare = (left: string, right: string, order: ListSortOrder) => {
  const leftIsNumber = isNumericText(left);
  const rightIsNumber = isNumericText(right);

  if (leftIsNumber && rightIsNumber) {
    const difference = Number(left) - Number(right);
    return order === 'asc' ? difference : -difference;
  }
  if (leftIsNumber) return -1;
  if (rightIsNumber) return 1;

  return left.localeCompare(right);
};

const uniqueByExactValue = (items: string[]): string[] =>
  items.filter((item, index) => items.indexOf(item) === index);

export const sortList = (input: ListSortInput = {}): ListOutput => {
  const object = normalizeObject(input);
  const method = normalizeEnum(
    object.method,
    'alphabetic',
    sortMethods,
    'method'
  );
  const order = normalizeEnum(object.order, 'asc', sortOrders, 'order');
  const caseSensitive = normalizeBoolean(object.caseSensitive, false);
  const removeDuplicates = normalizeBoolean(object.removeDuplicates, false);
  let items = splitListInput(input);

  items.sort((left, right) => {
    if (method === 'numeric') {
      return numericCompare(left, right, order);
    }
    if (method === 'length') {
      const difference = left.length - right.length;
      return order === 'asc' ? difference : -difference;
    }

    const leftValue = caseSensitive ? left : left.toLowerCase();
    const rightValue = caseSensitive ? right : right.toLowerCase();
    const difference = leftValue.localeCompare(rightValue);
    return order === 'asc' ? difference : -difference;
  });

  if (removeDuplicates) {
    items = uniqueByExactValue(items);
  }

  return toListOutput(items, input);
};

export const reverseListItems = (input: ListBaseInput = {}): ListOutput =>
  toListOutput(splitListInput(input).reverse(), input);

const hashSeed = (seed: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const seededRandom = (seed: string): (() => number) => {
  let state = hashSeed(seed);

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

export const shuffleListItems = (input: ListShuffleInput = {}): ListOutput => {
  const object = normalizeObject(input);
  const limit = normalizeOptionalInteger(object.limit, 'limit', 1);
  const seed = normalizeString(object.seed, '', 'seed');
  const random = seed ? seededRandom(seed) : Math.random;
  const items = splitListInput(input);

  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }

  return toListOutput(
    limit === undefined ? items : items.slice(0, limit),
    input
  );
};

export const uniqueListItems = (input: ListUniqueInput = {}): ListOutput => {
  const object = normalizeObject(input);
  const caseSensitive = normalizeBoolean(object.caseSensitive, false);
  const onlyUnique = normalizeBoolean(object.onlyUnique, false);
  const items = splitListInput(input);
  const counts = new Map<string, number>();
  const firstItems = new Map<string, string>();

  for (const item of items) {
    const key = caseSensitive ? item : item.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!firstItems.has(key)) {
      firstItems.set(key, item);
    }
  }

  const result = [...firstItems.entries()]
    .filter(([key]) => !onlyUnique || counts.get(key) === 1)
    .map(([, item]) => item);

  return toListOutput(result, input);
};

export const getMostCommonItems = (
  input: ListMostCommonInput = {}
): ListMostCommonOutput => {
  const object = normalizeObject(input);
  const sortBy = normalizeEnum(
    object.sortBy,
    'count',
    mostCommonSortMethods,
    'sortBy'
  );
  const ignoreCase = normalizeBoolean(object.ignoreCase, false);
  const limit = normalizeOptionalInteger(object.limit, 'limit', 1);
  const items = splitListInput(input);
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = ignoreCase ? item.toLowerCase() : item;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  let entries: ListMostCommonEntry[] = [...counts.entries()].map(
    ([item, count]) => ({
      item,
      count,
      percentage: total === 0 ? 0 : (count / total) * 100
    })
  );

  entries.sort((left, right) =>
    sortBy === 'alphabetic'
      ? left.item.localeCompare(right.item)
      : right.count - left.count || left.item.localeCompare(right.item)
  );

  if (limit !== undefined) {
    entries = entries.slice(0, limit);
  }

  return {
    entries,
    total,
    result: entries
      .map(
        (entry) =>
          `${entry.item}: ${entry.count} (${entry.percentage.toFixed(2)}%)`
      )
      .join('\n')
  };
};

export const chunkListItems = (input: ListChunkInput = {}): ListChunkOutput => {
  const object = normalizeObject(input);
  const chunkSize = normalizeInteger(object.chunkSize, 2, 'chunkSize', 1);
  const pad = normalizeBoolean(object.pad, false);
  const paddingItem = normalizeString(object.paddingItem, '', 'paddingItem');
  const itemSeparator = normalizeString(
    object.itemSeparator,
    ',',
    'itemSeparator'
  );
  const chunkSeparator = normalizeString(
    object.chunkSeparator,
    '\n',
    'chunkSeparator'
  );
  const leftWrap = normalizeString(object.leftWrap, '', 'leftWrap');
  const rightWrap = normalizeString(object.rightWrap, '', 'rightWrap');
  const items = splitListInput(input);
  const chunks: string[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    const chunk = items.slice(index, index + chunkSize);
    if (pad && chunk.length < chunkSize) {
      while (chunk.length < chunkSize) {
        chunk.push(paddingItem);
      }
    }
    chunks.push(chunk);
  }

  return {
    chunks,
    items,
    result: chunks
      .map((chunk) => `${leftWrap}${chunk.join(itemSeparator)}${rightWrap}`)
      .join(chunkSeparator),
    count: chunks.length
  };
};

export const rotateListItems = (input: ListRotateInput = {}): ListOutput => {
  const object = normalizeObject(input);
  const step = normalizeInteger(object.step, 1, 'step', 1);
  const direction = normalizeEnum(
    object.direction,
    'right',
    rotateDirections,
    'direction'
  );
  const items = splitListInput(input);

  if (items.length === 0) return toListOutput(items, input);

  const normalizedStep = ((step % items.length) + items.length) % items.length;
  const rotated =
    direction === 'right'
      ? items.slice(-normalizedStep).concat(items.slice(0, -normalizedStep))
      : items.slice(normalizedStep).concat(items.slice(0, normalizedStep));

  return toListOutput(rotated, input);
};

export const truncateListItems = (
  input: ListTruncateInput = {}
): ListOutput => {
  const object = normalizeObject(input);
  const length = normalizeInteger(object.length, 10, 'length', 0);
  const from = normalizeEnum(object.from, 'start', truncateFromValues, 'from');
  const items = splitListInput(input);
  const truncated =
    from === 'start' ? items.slice(0, length) : items.slice(-length);

  return toListOutput(length === 0 ? [] : truncated, input);
};

const baseListInputSchema = {
  text: { type: 'string' },
  items: {
    type: 'array',
    items: { type: 'string' },
    maxItems
  },
  splitMode: { enum: splitModes, default: 'lines' },
  separator: { type: 'string', default: '\n' },
  joinSeparator: { type: 'string', default: '\n' },
  trimItems: { type: 'boolean', default: false },
  removeEmpty: { type: 'boolean', default: false }
};

const listOutputSchema = {
  type: 'object',
  required: ['items', 'result', 'count'],
  additionalProperties: false,
  properties: {
    items: {
      type: 'array',
      items: { type: 'string' }
    },
    result: { type: 'string' },
    count: { type: 'number' }
  }
};

const listTool = (
  name: string,
  title: string,
  description: string,
  properties: Record<string, unknown>,
  execute: (input: Record<string, unknown>) => ListOutput
): ToolboxTool => ({
  name,
  title,
  description,
  channels: ['web', 'api', 'mcp'],
  risks: ['local'],
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      ...baseListInputSchema,
      ...properties
    }
  },
  outputSchema: listOutputSchema,
  execute: (input) => {
    try {
      return ok(execute((input ?? {}) as Record<string, unknown>));
    } catch (error) {
      return normalizeError(error);
    }
  }
});

export const listTools: ToolboxTool[] = [
  listTool(
    'list.sort',
    'Sort List',
    'Sort list items alphabetically, numerically, or by length.',
    {
      method: { enum: sortMethods, default: 'alphabetic' },
      order: { enum: sortOrders, default: 'asc' },
      caseSensitive: { type: 'boolean', default: false },
      removeDuplicates: { type: 'boolean', default: false }
    },
    sortList
  ),
  listTool(
    'list.reverse',
    'Reverse List',
    'Reverse list item order.',
    {},
    reverseListItems
  ),
  listTool(
    'list.shuffle',
    'Shuffle List',
    'Shuffle list items, optionally with a deterministic seed.',
    {
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: maxItems
      },
      seed: { type: 'string' }
    },
    shuffleListItems
  ),
  listTool(
    'list.unique',
    'Unique List Items',
    'Return unique list items while preserving first-seen order.',
    {
      caseSensitive: { type: 'boolean', default: false },
      onlyUnique: { type: 'boolean', default: false }
    },
    uniqueListItems
  ),
  {
    name: 'list.most_common',
    title: 'Most Common List Items',
    description: 'Count and rank the most common list items.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        ...baseListInputSchema,
        sortBy: { enum: mostCommonSortMethods, default: 'count' },
        ignoreCase: { type: 'boolean', default: false },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: maxItems
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['entries', 'total', 'result'],
      additionalProperties: false,
      properties: {
        entries: {
          type: 'array',
          items: {
            type: 'object',
            required: ['item', 'count', 'percentage'],
            additionalProperties: false,
            properties: {
              item: { type: 'string' },
              count: { type: 'number' },
              percentage: { type: 'number' }
            }
          }
        },
        total: { type: 'number' },
        result: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok(getMostCommonItems((input ?? {}) as ListMostCommonInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'list.chunk',
    title: 'Chunk List',
    description: 'Split list items into fixed-size chunks.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        ...baseListInputSchema,
        chunkSize: {
          type: 'integer',
          minimum: 1,
          maximum: maxItems,
          default: 2
        },
        pad: { type: 'boolean', default: false },
        paddingItem: { type: 'string', default: '' },
        itemSeparator: { type: 'string', default: ',' },
        chunkSeparator: { type: 'string', default: '\n' },
        leftWrap: { type: 'string', default: '' },
        rightWrap: { type: 'string', default: '' }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['chunks', 'items', 'result', 'count'],
      additionalProperties: false,
      properties: {
        chunks: {
          type: 'array',
          items: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        ...listOutputSchema.properties
      }
    },
    execute: (input) => {
      try {
        return ok(chunkListItems((input ?? {}) as ListChunkInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  listTool(
    'list.rotate',
    'Rotate List',
    'Rotate list items left or right by a fixed step.',
    {
      step: {
        type: 'integer',
        minimum: 1,
        maximum: maxItems,
        default: 1
      },
      direction: { enum: rotateDirections, default: 'right' }
    },
    rotateListItems
  ),
  listTool(
    'list.truncate',
    'Truncate List',
    'Keep the first or last N list items.',
    {
      length: {
        type: 'integer',
        minimum: 0,
        maximum: maxItems,
        default: 10
      },
      from: { enum: truncateFromValues, default: 'start' }
    },
    truncateListItems
  )
];
