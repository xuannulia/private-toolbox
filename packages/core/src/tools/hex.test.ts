import { describe, expect, it } from 'vitest';
import { decodeHex, encodeHex, hexTools } from './hex';

describe('encodeHex', () => {
  it('encodes UTF-8 text to lowercase hex', () => {
    expect(encodeHex({ text: 'Hello 世界' })).toBe(
      '48656c6c6f20e4b896e7958c'
    );
  });

  it('supports uppercase output and separators', () => {
    expect(
      encodeHex({
        text: 'OK',
        uppercase: true,
        separator: ':'
      })
    ).toBe('4F:4B');
  });
});

describe('decodeHex', () => {
  it('decodes lowercase hex to UTF-8 text', () => {
    expect(decodeHex({ text: '48656c6c6f20e4b896e7958c' })).toBe('Hello 世界');
  });

  it('accepts common separators and 0x prefixes', () => {
    expect(decodeHex({ text: '0x48 0x65:6c-6c,6f' })).toBe('Hello');
  });

  it('rejects non-hex characters', () => {
    expect(() => decodeHex({ text: 'hello' })).toThrow(
      'Hex input can only contain hexadecimal digits'
    );
  });

  it('rejects odd length input', () => {
    expect(() => decodeHex({ text: 'abc' })).toThrow(
      'Hex input must contain an even number of digits'
    );
  });

  it('rejects invalid UTF-8 bytes', () => {
    expect(() => decodeHex({ text: 'ff' })).toThrow(
      'Hex input is not valid UTF-8 text'
    );
  });
});

describe('hexTools', () => {
  it('registers hex tools for Web, API, and MCP', () => {
    const encodeTool = hexTools.find((tool) => tool.name === 'hex.encode');
    const decodeTool = hexTools.find((tool) => tool.name === 'hex.decode');

    expect(encodeTool?.channels).toEqual(['web', 'api', 'mcp']);
    expect(decodeTool?.channels).toEqual(['web', 'api', 'mcp']);
  });
});
