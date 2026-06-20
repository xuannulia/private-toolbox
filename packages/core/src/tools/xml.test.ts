import { describe, expect, it } from 'vitest';
import {
  formatXmlDocument,
  minifyXmlDocument,
  validateXmlDocument,
  xmlTools
} from './xml';

describe('validateXmlDocument', () => {
  it('validates well-formed XML', () => {
    expect(
      validateXmlDocument({
        text: '<root><a>1</a><b>2</b></root>'
      })
    ).toEqual({
      valid: true,
      message: 'Valid XML',
      error: null
    });
  });

  it('returns structured errors for invalid XML', () => {
    const result = validateXmlDocument({
      text: '<root><a>1</b></root>'
    });

    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/Invalid XML/i);
    expect(result.error?.message).toMatch(/Expected closing tag/);
    expect(result.error?.line).toBeTypeOf('number');
    expect(result.error?.column).toBeTypeOf('number');
  });
});

describe('formatXmlDocument', () => {
  it('formats valid XML with default indentation', () => {
    const result = formatXmlDocument({
      text: '<root><a>1</a><b>2</b></root>'
    });

    expect(result.valid).toBe(true);
    expect(result.text).toContain('<root>');
    expect(result.text).toContain('  <a>1</a>');
    expect(result.text).toContain('  <b>2</b>');
  });

  it('supports custom indentation', () => {
    const result = formatXmlDocument({
      text: '<root><a>1</a></root>',
      indent: '\t'
    });

    expect(result.text).toContain('\t<a>1</a>');
  });

  it('returns invalid output without throwing for malformed XML', () => {
    const result = formatXmlDocument({
      text: '<root><a>1</b></root>'
    });

    expect(result.valid).toBe(false);
    expect(result.text).toBe('');
  });

  it('exposes XML tools to web, API, and MCP', () => {
    expect(xmlTools.map((tool) => tool.name)).toEqual([
      'xml.validate',
      'xml.format',
      'xml.minify'
    ]);
    expect(
      xmlTools.every((tool) => tool.channels.join(',') === 'web,api,mcp')
    ).toBe(true);
  });
});

describe('minifyXmlDocument', () => {
  it('minifies valid XML', () => {
    const result = minifyXmlDocument({
      text: `<root>
  <a>1</a>
  <b enabled="true">2</b>
</root>`
    });

    expect(result.valid).toBe(true);
    expect(result.text).toBe('<root><a>1</a><b enabled="true">2</b></root>');
  });

  it('returns invalid output without throwing for malformed XML', () => {
    const result = minifyXmlDocument({
      text: '<root><a>1</b></root>'
    });

    expect(result.valid).toBe(false);
    expect(result.text).toBe('');
  });
});
