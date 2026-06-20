import { rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Jimp from 'jimp';
import { describe, expect, it } from 'vitest';
import { generateQrCode } from '@private-toolbox/core';
import { decodeQrCode, qrcodeDecodeTools } from './qrcodeDecode';

const createTempQrCode = async (text: string) => {
  const dir = await import('node:fs/promises').then(({ mkdtemp }) =>
    mkdtemp(join(tmpdir(), 'private-toolbox-qr-decode-'))
  );
  const filePath = join(dir, 'sample.png');
  const result = await generateQrCode({
    text,
    format: 'data_url',
    size: 256,
    margin: 2
  });
  const base64 = result.text.replace(/^data:image\/png;base64,/, '');
  await writeFile(filePath, Buffer.from(base64, 'base64'));

  return { dir, filePath };
};

describe('decodeQrCode', () => {
  it('decodes a QR code image from a local path', async () => {
    const { dir, filePath } = await createTempQrCode('https://example.com/a?b=1');

    try {
      const result = await decodeQrCode({ path: filePath });

      expect(result.path).toBe(filePath);
      expect(result.name).toBe('sample.png');
      expect(result.text).toBe('https://example.com/a?b=1');
      expect(result.version).toBeGreaterThan(0);
      expect(result.location.topLeft.x).toBeGreaterThanOrEqual(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects images without a QR code', async () => {
    const dir = await import('node:fs/promises').then(({ mkdtemp }) =>
      mkdtemp(join(tmpdir(), 'private-toolbox-qr-decode-'))
    );
    const filePath = join(dir, 'plain.png');

    try {
      const image = await new Jimp(64, 64, 0xffffffff);
      await image.writeAsync(filePath);

      await expect(decodeQrCode({ path: filePath })).rejects.toMatchObject({
        code: 'QRCODE_NOT_FOUND'
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('qrcodeDecodeTools', () => {
  it('registers qrcode.decode for API and MCP', () => {
    const tool = qrcodeDecodeTools.find((item) => item.name === 'qrcode.decode');

    expect(tool?.channels).toEqual(['api', 'mcp']);
    expect(tool?.risks).toEqual(['file-read']);
  });
});
