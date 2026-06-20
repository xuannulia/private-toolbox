import { describe, expect, it } from 'vitest';
import { minifyJson } from './service';

describe('minifyJson', () => {
  it('removes formatting whitespace from valid JSON', () => {
    expect(
      minifyJson(`{
        "name": "Alice",
        "items": [1, 2]
      }`)
    ).toBe('{"name":"Alice","items":[1,2]}');
  });

  it('throws a compact error for invalid JSON', () => {
    expect(() => minifyJson('{bad')).toThrow('Invalid JSON string');
  });
});
