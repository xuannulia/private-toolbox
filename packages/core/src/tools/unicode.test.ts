import { describe, expect, it } from 'vitest';
import { decodeUnicode, encodeUnicode, unicodeTools } from './unicode';

describe('encodeUnicode', () => {
  it('encodes ASCII text to Unicode escape sequences', () => {
    expect(encodeUnicode({ text: 'Hello!' })).toBe(
      '\\u0048\\u0065\\u006c\\u006c\\u006f\\u0021'
    );
  });

  it('supports uppercase hexadecimal output', () => {
    expect(encodeUnicode({ text: '你好，世界！', uppercase: true })).toBe(
      '\\u4F60\\u597D\\uFF0C\\u4E16\\u754C\\uFF01'
    );
  });

  it('encodes surrogate pairs as UTF-16 escape pairs', () => {
    expect(encodeUnicode({ text: '😀' })).toBe('\\ud83d\\ude00');
  });
});

describe('decodeUnicode', () => {
  it('decodes Unicode escape sequences to text', () => {
    expect(
      decodeUnicode({
        text: '\\u0048\\u0065\\u006c\\u006c\\u006f\\u0021'
      })
    ).toBe('Hello!');
  });

  it('decodes uppercase hexadecimal escape sequences', () => {
    expect(
      decodeUnicode({
        text: '\\u4F60\\u597D\\uFF0C\\u4E16\\u754C\\uFF01'
      })
    ).toBe('你好，世界！');
  });

  it('leaves non-matching text unchanged', () => {
    expect(decodeUnicode({ text: 'plain text \\u12zz' })).toBe(
      'plain text \\u12zz'
    );
  });
});

describe('unicodeTools', () => {
  it('registers Unicode tools for Web, API, and MCP', () => {
    const encodeTool = unicodeTools.find(
      (tool) => tool.name === 'unicode.encode'
    );
    const decodeTool = unicodeTools.find(
      (tool) => tool.name === 'unicode.decode'
    );

    expect(encodeTool?.channels).toEqual(['web', 'api', 'mcp']);
    expect(decodeTool?.channels).toEqual(['web', 'api', 'mcp']);
  });
});
