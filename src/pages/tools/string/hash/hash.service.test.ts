import { describe, expect, it } from 'vitest';
import { createTextHash } from './service';

describe('createTextHash', () => {
  it('creates MD5 hashes', async () => {
    await expect(
      createTextHash({ text: 'hello', algorithm: 'MD5' })
    ).resolves.toBe('5d41402abc4b2a76b9719d911017c592');
  });

  it('creates SHA hashes', async () => {
    await expect(
      createTextHash({ text: 'hello', algorithm: 'SHA-1' })
    ).resolves.toBe('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d');
  });

  it('returns empty output for empty input', async () => {
    await expect(
      createTextHash({ text: '', algorithm: 'SHA-256' })
    ).resolves.toBe('');
  });
});
