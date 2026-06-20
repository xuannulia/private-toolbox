import { describe, expect, it } from 'vitest';
import { base64Tools, decodeBase64, encodeBase64 } from './base64';

describe('encodeBase64', () => {
  it('encodes UTF-8 text', () => {
    expect(encodeBase64({ text: 'Hello 世界' })).toBe('SGVsbG8g5LiW55WM');
  });
});

describe('decodeBase64', () => {
  it('decodes UTF-8 text', () => {
    expect(decodeBase64({ text: 'SGVsbG8g5LiW55WM' })).toBe('Hello 世界');
  });

  it('allows whitespace in encoded input', () => {
    expect(decodeBase64({ text: 'SGVs bG8g\n5LiW55WM' })).toBe('Hello 世界');
  });

  it('rejects malformed base64 input', () => {
    expect(() => decodeBase64({ text: 'abcde' })).toThrow(
      'Invalid Base64 string'
    );
  });
});

describe('base64Tools', () => {
  it('registers Base64 tools for Web, API, and MCP', () => {
    const encodeTool = base64Tools.find(
      (tool) => tool.name === 'base64.encode'
    );
    const decodeTool = base64Tools.find(
      (tool) => tool.name === 'base64.decode'
    );

    expect(encodeTool?.channels).toEqual(['web', 'api', 'mcp']);
    expect(decodeTool?.channels).toEqual(['web', 'api', 'mcp']);
    expect(encodeTool?.risks).toEqual(['local']);
    expect(decodeTool?.risks).toEqual(['local']);
  });
});
