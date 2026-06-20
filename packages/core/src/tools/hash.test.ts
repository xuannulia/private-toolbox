import { describe, expect, it } from 'vitest';
import { hashText, hashTools } from './hash';

describe('hashText', () => {
  it('creates MD5 hashes for common test vectors', async () => {
    await expect(hashText({ text: '', algorithm: 'MD5' })).resolves.toEqual({
      algorithm: 'MD5',
      hex: 'd41d8cd98f00b204e9800998ecf8427e'
    });

    await expect(
      hashText({ text: 'hello', algorithm: 'MD5' })
    ).resolves.toEqual({
      algorithm: 'MD5',
      hex: '5d41402abc4b2a76b9719d911017c592'
    });
  });

  it('hashes UTF-8 text with MD5', async () => {
    await expect(
      hashText({ text: 'Hello 世界', algorithm: 'MD5' })
    ).resolves.toEqual({
      algorithm: 'MD5',
      hex: 'af91c2603879085df0cb545dd0366dcd'
    });
  });

  it('keeps SHA hashing support', async () => {
    await expect(
      hashText({ text: 'hello', algorithm: 'SHA-256' })
    ).resolves.toEqual({
      algorithm: 'SHA-256',
      hex: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
    });
  });

  it('rejects unsupported algorithms', async () => {
    await expect(
      hashText({ text: 'hello', algorithm: 'SHA-3' as never })
    ).rejects.toThrow('Unsupported hash algorithm: SHA-3');
  });
});

describe('hashTools', () => {
  it('registers hash.text for Web, API, and MCP with MD5 support', () => {
    const tool = hashTools.find((item) => item.name === 'hash.text');
    const inputProperties = tool?.inputSchema.properties as
      | Record<string, unknown>
      | undefined;

    expect(tool?.channels).toEqual(['web', 'api', 'mcp']);
    expect(inputProperties?.algorithm).toMatchObject({
      enum: ['MD5', 'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512']
    });
  });
});
