import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Jimp from 'jimp';
import { describe, expect, it } from 'vitest';
import { imageInfoTools, inspectImageInfo } from './imageInfo';

const writeTestImage = async (path: string) => {
  const image = await new Jimp(3, 2, 0x00000000);
  await image.writeAsync(path);
};

describe('inspectImageInfo', () => {
  it('reads basic image metadata from a PNG path', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'private-toolbox-image-info-'));
    const path = join(dir, 'transparent.png');

    try {
      await writeTestImage(path);
      const result = await inspectImageInfo({ path });

      expect(result.name).toBe('transparent.png');
      expect(result.sizeBytes).toBeGreaterThan(0);
      expect(result.mimeType).toBe('image/png');
      expect(result.extension).toBe('png');
      expect(result.width).toBe(3);
      expect(result.height).toBe(2);
      expect(result.aspectRatio).toBe(1.5);
      expect(result.aspectRatioText).toBe('3:2');
      expect(result.orientation).toBe('landscape');
      expect(result.pixelCount).toBe(6);
      expect(result.megapixels).toBe(0);
      expect(result.hasAlpha).toBe(true);
      expect(new Date(result.modifiedAt).toString()).not.toBe('Invalid Date');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects files over the size limit', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'private-toolbox-image-info-'));
    const path = join(dir, 'transparent.png');

    try {
      await writeTestImage(path);
      await expect(inspectImageInfo({ path }, 8)).rejects.toMatchObject({
        code: 'IMAGE_INFO_TOO_LARGE'
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('returns a structured decode error for unsupported files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'private-toolbox-image-info-'));
    const path = join(dir, 'note.txt');

    try {
      await writeFile(path, 'hello');
      await expect(inspectImageInfo({ path })).rejects.toMatchObject({
        code: 'IMAGE_INFO_DECODE_FAILED'
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('imageInfoTools', () => {
  it('registers image.info for API and MCP', () => {
    const tool = imageInfoTools.find((item) => item.name === 'image.info');

    expect(tool?.channels).toEqual(['api', 'mcp']);
    expect(tool?.risks).toEqual(['file-read']);
  });
});
