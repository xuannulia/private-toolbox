import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { writeTempFile, writeTempFileTools } from './writeTempFile';

describe('writeTempFile', () => {
  it('writes UTF-8 text into the configured output directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'private-toolbox-write-'));

    try {
      const result = await writeTempFile(
        {
          text: 'hello',
          fileName: 'result.txt'
        },
        {
          rootDir: dir,
          outputDir: join(dir, 'output')
        }
      );

      expect(result.fileName).toBe('result.txt');
      expect(result.relativePath).toBe('output/result.txt');
      expect(result.sizeBytes).toBe(5);
      expect(result.encoding).toBe('utf8');
      expect(result.sha256).toBe(
        createHash('sha256').update('hello').digest('hex')
      );
      expect(await readFile(result.path, 'utf8')).toBe('hello');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('writes Base64 content and deduplicates existing names', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'private-toolbox-write-'));

    try {
      const config = {
        rootDir: dir,
        outputDir: join(dir, 'output')
      };

      await writeTempFile(
        {
          text: 'first',
          fileName: 'data.bin'
        },
        config
      );
      const result = await writeTempFile(
        {
          text: Buffer.from('second').toString('base64'),
          fileName: 'data.bin',
          encoding: 'base64'
        },
        config
      );

      expect(result.fileName).toBe('data-2.bin');
      expect(result.encoding).toBe('base64');
      expect(await readFile(result.path, 'utf8')).toBe('second');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects output directories outside the configured root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'private-toolbox-root-'));
    const outside = await mkdtemp(join(tmpdir(), 'private-toolbox-outside-'));

    try {
      await expect(
        writeTempFile(
          {
            text: 'hello',
            fileName: 'result.txt'
          },
          {
            rootDir: root,
            outputDir: outside
          }
        )
      ).rejects.toThrow('outside the configured file tool root');
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });

  it('registers file.write_temp for API and MCP', () => {
    const tool = writeTempFileTools.find(
      (item) => item.name === 'file.write_temp'
    );

    expect(tool?.channels).toEqual(['api', 'mcp']);
    expect(tool?.risks).toEqual(['file-write']);
  });
});
