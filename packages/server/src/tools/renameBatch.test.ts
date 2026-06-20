import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renameBatch } from './renameBatch';

describe('renameBatch', () => {
  it('previews and executes a confirmed rename plan', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'private-toolbox-rename-'));

    try {
      await writeFile(join(dir, 'old-one.txt'), 'one');
      await writeFile(join(dir, 'old-two.txt'), 'two');

      const preview = await renameBatch(
        {
          directory: dir,
          pattern: '^old-',
          replacement: 'new-'
        },
        {
          rootDir: dir
        }
      );

      expect(preview.dryRun).toBe(true);
      expect(preview.matchedCount).toBe(2);
      expect(preview.renamedCount).toBe(0);
      expect(
        preview.operations.map((operation) => operation.toName).sort()
      ).toEqual(['new-one.txt', 'new-two.txt']);

      await expect(
        renameBatch(
          {
            directory: dir,
            pattern: '^old-',
            replacement: 'new-',
            dryRun: false
          },
          {
            rootDir: dir
          }
        )
      ).rejects.toThrow('Run a dry run first');

      const executed = await renameBatch(
        {
          directory: dir,
          pattern: '^old-',
          replacement: 'new-',
          dryRun: false,
          planHash: preview.planHash
        },
        {
          rootDir: dir
        }
      );

      expect(executed.renamedCount).toBe(2);
      expect((await readdir(dir)).sort()).toEqual([
        'new-one.txt',
        'new-two.txt'
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('marks conflicting targets in the preview', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'private-toolbox-rename-'));

    try {
      await writeFile(join(dir, 'one.txt'), 'one');
      await writeFile(join(dir, 'two.txt'), 'two');

      const preview = await renameBatch(
        {
          directory: dir,
          pattern: '^(one|two)',
          replacement: 'same'
        },
        {
          rootDir: dir
        }
      );

      expect(preview.operations).toHaveLength(2);
      expect(
        preview.operations.some((operation) => operation.status === 'conflict')
      ).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects directories outside the configured root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'private-toolbox-root-'));
    const outside = await mkdtemp(join(tmpdir(), 'private-toolbox-outside-'));

    try {
      await expect(
        renameBatch(
          {
            directory: outside,
            pattern: 'x',
            replacement: 'y'
          },
          {
            rootDir: root
          }
        )
      ).rejects.toThrow('outside the configured file tool root');
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });
});
