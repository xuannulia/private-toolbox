import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { imageBase64Tools, imageToBase64 } from './imageBase64';

const pngBytes = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64'
);

describe('imageToBase64', () => {
  it('encodes a PNG as a data URL by default', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'private-toolbox-image-'));
    const path = join(dir, 'pixel.png');

    try {
      await writeFile(path, pngBytes);
      const result = await imageToBase64({ path });

      expect(result.name).toBe('pixel.png');
      expect(result.sizeBytes).toBe(pngBytes.length);
      expect(result.mimeType).toBe('image/png');
      expect(result.format).toBe('data_url');
      expect(result.text).toBe(`data:image/png;base64,${pngBytes.toString('base64')}`);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('can return plain Base64', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'private-toolbox-image-'));
    const path = join(dir, 'pixel.png');

    try {
      await writeFile(path, pngBytes);
      const result = await imageToBase64({ path, format: 'base64' });

      expect(result.format).toBe('base64');
      expect(result.text).toBe(pngBytes.toString('base64'));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects unsupported files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'private-toolbox-image-'));
    const path = join(dir, 'note.txt');

    try {
      await writeFile(path, 'hello');
      await expect(imageToBase64({ path })).rejects.toMatchObject({
        code: 'IMAGE_BASE64_UNSUPPORTED_TYPE'
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects files over the size limit', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'private-toolbox-image-'));
    const path = join(dir, 'pixel.png');

    try {
      await writeFile(path, pngBytes);
      await expect(imageToBase64({ path }, 8)).rejects.toMatchObject({
        code: 'IMAGE_BASE64_TOO_LARGE'
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('imageBase64Tools', () => {
  it('registers image.to_base64 for API and MCP', () => {
    const tool = imageBase64Tools.find(
      (item) => item.name === 'image.to_base64'
    );

    expect(tool?.channels).toEqual(['api', 'mcp']);
    expect(tool?.risks).toEqual(['file-read']);
  });
});
