export type ParsedJsonResult =
  | {
      ok: true;
      value: unknown;
    }
  | {
      ok: false;
      error: string;
    };

export const parseJsonResult = (text: string): ParsedJsonResult => {
  if (!text.trim()) {
    return {
      ok: false,
      error: 'EMPTY_JSON'
    };
  }

  try {
    return {
      ok: true,
      value: JSON.parse(text)
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid JSON'
    };
  }
};

export const getJsonNodeSummary = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.length}]`;
  }

  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).length}}`;
  }

  return '';
};

export const formatJsonPrimitive = (value: unknown): string => {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value === null) return 'null';

  return String(value);
};
