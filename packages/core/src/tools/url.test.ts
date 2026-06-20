import { describe, expect, it } from 'vitest';
import { decodeUrlComponent, encodeUrlComponent, urlTools } from './url';

describe('encodeUrlComponent', () => {
  it('encodes text for URL components', () => {
    expect(encodeUrlComponent({ text: 'a b/中文' })).toBe(
      'a%20b%2F%E4%B8%AD%E6%96%87'
    );
  });

  it('can encode every UTF-8 byte', () => {
    expect(
      encodeUrlComponent({
        text: 'Az-中',
        encodeEveryCharacter: true
      })
    ).toBe('%41%7A%2D%E4%B8%AD');
  });
});

describe('decodeUrlComponent', () => {
  it('decodes percent-encoded URL component text', () => {
    expect(decodeUrlComponent({ text: 'a%20b%2F%E4%B8%AD%E6%96%87' })).toBe(
      'a b/中文'
    );
  });
});

describe('urlTools', () => {
  it('registers URL tools for Web, API, and MCP', () => {
    const encodeTool = urlTools.find((tool) => tool.name === 'url.encode');
    const decodeTool = urlTools.find((tool) => tool.name === 'url.decode');

    expect(encodeTool?.channels).toEqual(['web', 'api', 'mcp']);
    expect(decodeTool?.channels).toEqual(['web', 'api', 'mcp']);
    expect(encodeTool?.risks).toEqual(['local']);
    expect(decodeTool?.risks).toEqual(['local']);
  });
});
