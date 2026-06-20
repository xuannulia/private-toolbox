import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { hashFile } from './fileHash';

describe('hashFile', () => {
  it('hashes a local file with selected algorithms', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'private-toolbox-'));
    const filePath = join(dir, 'sample.txt');

    try {
      await writeFile(filePath, 'hello');

      const result = await hashFile({
        path: filePath,
        algorithms: ['sha256', 'sha512']
      });

      expect(result.path).toBe(filePath);
      expect(result.sizeBytes).toBe(5);
      expect(result.hashes.sha256).toBe(
        createHash('sha256').update('hello').digest('hex')
      );
      expect(result.hashes.sha512).toBe(
        createHash('sha512').update('hello').digest('hex')
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
