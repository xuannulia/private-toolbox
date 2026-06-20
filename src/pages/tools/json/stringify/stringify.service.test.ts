import { describe, expect, it } from 'vitest';
import { stringifyJson } from './service';

describe('stringifyJson page service', () => {
  it('converts object-like text to formatted JSON', () => {
    expect(stringifyJson("{ name: 'Ada', tags: ['mcp'] }", 'space', 2, false))
      .toBe(`{
  "name": "Ada",
  "tags": [
    "mcp"
  ]
}`);
  });

  it('supports tabs and HTML escaping', () => {
    const result = stringifyJson('{ html: "<div>" }', 'tab', 2, true);

    expect(result).toContain('&quot;html&quot;');
    expect(result).toContain('&lt;div&gt;');
  });

  it('rejects invalid object-like input', () => {
    expect(() => stringifyJson('{ name: ', 'space', 2, false)).toThrow();
  });
});
