import { describe, expect, it } from 'vitest';
import {
  formatJsonPrimitive,
  getJsonNodeSummary,
  parseJsonResult
} from './jsonResult';

describe('JSON result helpers', () => {
  it('parses formatted JSON for tree rendering', () => {
    expect(parseJsonResult('{"ok":true,"items":[1,2]}')).toEqual({
      ok: true,
      value: {
        ok: true,
        items: [1, 2]
      }
    });
  });

  it('returns a non-throwing parse state for empty or invalid JSON', () => {
    expect(parseJsonResult('')).toMatchObject({
      ok: false,
      error: 'EMPTY_JSON'
    });
    expect(parseJsonResult('{bad')).toMatchObject({
      ok: false
    });
  });

  it('summarizes arrays and objects compactly', () => {
    expect(getJsonNodeSummary([1, 2, 3])).toBe('[3]');
    expect(getJsonNodeSummary({ a: 1, b: 2 })).toBe('{2}');
    expect(getJsonNodeSummary('value')).toBe('');
  });

  it('formats primitive values as JSON-ish labels', () => {
    expect(formatJsonPrimitive('hello')).toBe('"hello"');
    expect(formatJsonPrimitive(42)).toBe('42');
    expect(formatJsonPrimitive(false)).toBe('false');
    expect(formatJsonPrimitive(null)).toBe('null');
  });
});
