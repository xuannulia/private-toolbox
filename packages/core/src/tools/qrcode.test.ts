import { describe, expect, it } from 'vitest';
import { generateQrCode, qrcodeTools } from './qrcode';

describe('generateQrCode', () => {
  it('generates SVG by default', async () => {
    const result = await generateQrCode({ text: 'https://example.com' });

    expect(result.format).toBe('svg');
    expect(result.mimeType).toBe('image/svg+xml');
    expect(result.text).toContain('<svg');
    expect(result.text).toContain('viewBox');
  });

  it('generates a PNG data URL', async () => {
    const result = await generateQrCode({
      text: 'hello',
      format: 'data_url',
      size: 128,
      margin: 1,
      darkColor: '#111111',
      lightColor: '#ffffff',
      errorCorrectionLevel: 'H'
    });

    expect(result.format).toBe('data_url');
    expect(result.mimeType).toBe('image/png');
    expect(result.text).toMatch(/^data:image\/png;base64,/);
  });

  it('generates styled SVG with dots, transparent background, and logo', async () => {
    const result = await generateQrCode({
      text: 'hello',
      format: 'svg',
      moduleStyle: 'dots',
      transparentBackground: true,
      logoDataUrl:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lIF9DQAAAABJRU5ErkJggg==',
      logoSizePercent: 20,
      logoPadding: 2
    });

    expect(result.format).toBe('svg');
    expect(result.mimeType).toBe('image/svg+xml');
    expect(result.text).toContain('<circle');
    expect(result.text).toContain('<image');
    expect(result.text).not.toContain('d="M0 0h');
  });

  it('generates UTF-8 text output', async () => {
    const result = await generateQrCode({
      text: 'hello',
      format: 'utf8'
    });

    expect(result.format).toBe('utf8');
    expect(result.mimeType).toBe('text/plain');
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('preserves leading and trailing whitespace in content', async () => {
    const plain = await generateQrCode({ text: 'hello' });
    const padded = await generateQrCode({ text: ' hello ' });

    expect(padded.text).not.toBe(plain.text);
  });

  it('rejects invalid colors', async () => {
    await expect(
      generateQrCode({ text: 'hello', darkColor: 'black' })
    ).rejects.toMatchObject({
      code: 'QRCODE_INVALID_COLOR'
    });
  });

  it('rejects visual styling for PNG data URL output', async () => {
    await expect(
      generateQrCode({
        text: 'hello',
        format: 'data_url',
        moduleStyle: 'dots'
      })
    ).rejects.toMatchObject({
      code: 'QRCODE_SVG_REQUIRED_FOR_STYLE'
    });
  });

  it('rejects empty text', async () => {
    await expect(generateQrCode({ text: '   ' })).rejects.toMatchObject({
      code: 'QRCODE_TEXT_REQUIRED'
    });
  });
});

describe('qrcodeTools', () => {
  it('registers qrcode.generate for Web, API, and MCP', () => {
    const tool = qrcodeTools.find((item) => item.name === 'qrcode.generate');

    expect(tool?.channels).toEqual(['web', 'api', 'mcp']);
    expect(tool?.risks).toEqual(['local']);
  });
});
