import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { imageExifTools, inspectImageExif } from './imageExif';

const sampleJpegPath = join(
  process.cwd(),
  'node_modules/exif-parser/test/starfish.jpg'
);

describe('inspectImageExif', () => {
  it('reads EXIF tags and thumbnail metadata from a JPEG path', async () => {
    const result = await inspectImageExif({ path: sampleJpegPath });

    expect(result.name).toBe('starfish.jpg');
    expect(result.hasExif).toBe(true);
    expect(result.tagCount).toBeGreaterThan(10);
    expect(result.imageSize).toEqual({
      width: 1278,
      height: 720
    });
    expect(result.tags.Make).toBe('Nokia');
    expect(result.tags.Model).toBe('Lumia 820');
    expect(result.tags.GPSLatitudeRef).toBe('N');
    expect(result.thumbnail).toMatchObject({
      exists: true,
      mimeType: 'image/jpeg',
      width: 320,
      height: 192
    });
    expect(result.thumbnail.sizeBytes).toBeGreaterThan(0);
  });

  it('rejects files over the size limit', async () => {
    await expect(
      inspectImageExif({ path: sampleJpegPath }, 8)
    ).rejects.toMatchObject({
      code: 'IMAGE_EXIF_TOO_LARGE'
    });
  });

  it('returns a structured parse error for unsupported files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'private-toolbox-exif-'));
    const filePath = join(dir, 'note.txt');

    try {
      await writeFile(filePath, 'hello');
      await expect(inspectImageExif({ path: filePath })).rejects.toMatchObject({
        code: 'IMAGE_EXIF_PARSE_FAILED'
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('imageExifTools', () => {
  it('registers image.exif for API and MCP', () => {
    const tool = imageExifTools.find((item) => item.name === 'image.exif');

    expect(tool?.channels).toEqual(['api', 'mcp']);
    expect(tool?.risks).toEqual(['file-read']);
  });
});
