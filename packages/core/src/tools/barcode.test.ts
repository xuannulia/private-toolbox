import { describe, expect, it } from 'vitest';
import { barcodeTools, generateBarcode } from './barcode';

describe('generateBarcode', () => {
  it('generates Code 128 SVG by default', () => {
    const result = generateBarcode({ text: 'ABC123' });

    expect(result.format).toBe('svg');
    expect(result.mimeType).toBe('image/svg+xml');
    expect(result.text).toContain('<svg');
    expect(result.text).toContain('<rect');
    expect(result.text).toContain('ABC123');
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.checksum).toBe(67);
  });

  it('generates SVG data URLs', () => {
    const result = generateBarcode({
      text: 'ORDER-42',
      format: 'data_url',
      foregroundColor: '#111111',
      backgroundColor: '#ffffff',
      displayText: true
    });

    expect(result.format).toBe('data_url');
    expect(result.text).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    expect(decodeURIComponent(result.text)).toContain('ORDER-42');
  });

  it('rejects empty input', () => {
    expect(() => generateBarcode({ text: '' })).toThrow(
      'Barcode text is required'
    );
  });

  it('rejects non-Code-128-B characters', () => {
    expect(() => generateBarcode({ text: '中文' })).toThrow(
      'Code 128 B supports ASCII characters'
    );
  });

  it('rejects invalid colors', () => {
    expect(() =>
      generateBarcode({ text: 'ABC123', foregroundColor: 'black' })
    ).toThrow('Barcode colors must be hex colors');
  });
});

describe('barcodeTools', () => {
  it('registers barcode.generate for Web, API, and MCP', () => {
    const tool = barcodeTools.find((item) => item.name === 'barcode.generate');

    expect(tool?.channels).toEqual(['web', 'api', 'mcp']);
    expect(tool?.risks).toEqual(['local']);
  });
});
