import { readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Jimp from 'jimp';
import { describe, expect, it } from 'vitest';
import { imageIconTools, imageToIcon } from './imageIcon';

const createTempPng = async () => {
  const dir = await import('node:fs/promises').then(({ mkdtemp }) =>
    mkdtemp(join(tmpdir(), 'private-toolbox-icon-'))
  );
  const imagePath = join(dir, 'sample.png');
  const image = await new Jimp(40, 20, 0x00ff00ff);
  await image.writeAsync(imagePath);
  return { dir, imagePath };
};

describe('imageToIcon', () => {
  it('converts an image to an ICO data URL with selected sizes', async () => {
    const { dir, imagePath } = await createTempPng();

    try {
      const result = await imageToIcon(
        {
          path: imagePath,
          sizes: [32, 16]
        },
        { rootDir: dir, outputDir: join(dir, 'output') }
      );
      const bytes = Buffer.from(result.text.replace(/^data:image\/x-icon;base64,/, ''), 'base64');
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

      expect(result.mimeType).toBe('image/x-icon');
      expect(result.sizes).toEqual([16, 32]);
      expect(view.getUint16(0, true)).toBe(0);
      expect(view.getUint16(2, true)).toBe(1);
      expect(view.getUint16(4, true)).toBe(2);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('writes an ICO file inside the configured file root', async () => {
    const { dir, imagePath } = await createTempPng();
    const outputPath = join(dir, 'icons', 'sample.ico');

    try {
      const result = await imageToIcon(
        {
          path: imagePath,
          sizes: [16],
          format: 'base64',
          outputPath
        },
        { rootDir: dir, outputDir: join(dir, 'output') }
      );
      const fileStat = await stat(outputPath);
      const fileBytes = await readFile(outputPath);

      expect(result.outputPath).toBe(outputPath);
      expect(result.sizeBytes).toBe(fileStat.size);
      expect(Buffer.from(result.text, 'base64').equals(fileBytes)).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects output paths outside the configured file root', async () => {
    const { dir, imagePath } = await createTempPng();

    try {
      await expect(
        imageToIcon(
          {
            path: imagePath,
            outputPath: join(tmpdir(), 'outside.ico')
          },
          { rootDir: dir, outputDir: join(dir, 'output') }
        )
      ).rejects.toMatchObject({
        code: 'IMAGE_ICON_OUTPUT_OUTSIDE_ROOT'
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('imageIconTools', () => {
  it('registers image.to_icon for API and MCP', () => {
    const tool = imageIconTools.find((item) => item.name === 'image.to_icon');

    expect(tool?.channels).toEqual(['api', 'mcp']);
    expect(tool?.risks).toEqual(['file-read', 'file-write']);
  });
});
