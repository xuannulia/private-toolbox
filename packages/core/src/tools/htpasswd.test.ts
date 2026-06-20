import { describe, expect, it } from 'vitest';
import { generateHtpasswd, htpasswdTools } from './htpasswd';

describe('generateHtpasswd', () => {
  it('generates Apache apr1 htpasswd lines', async () => {
    await expect(
      generateHtpasswd({
        username: 'alice',
        password: 'password',
        scheme: 'apr1',
        salt: 'hfT7jp2q'
      })
    ).resolves.toEqual({
      username: 'alice',
      scheme: 'apr1',
      salt: 'hfT7jp2q',
      hash: '$apr1$hfT7jp2q$two3QJlp/Qr/L8kifGFHF1',
      line: 'alice:$apr1$hfT7jp2q$two3QJlp/Qr/L8kifGFHF1'
    });
  });

  it('generates sha1 htpasswd lines', async () => {
    await expect(
      generateHtpasswd({
        username: 'alice',
        password: 'password',
        scheme: 'sha1'
      })
    ).resolves.toEqual({
      username: 'alice',
      scheme: 'sha1',
      salt: null,
      hash: '{SHA}W6ph5Mm5Pz8GgiULbPgzG37mj9g=',
      line: 'alice:{SHA}W6ph5Mm5Pz8GgiULbPgzG37mj9g='
    });
  });

  it('generates random apr1 salt by default', async () => {
    const result = await generateHtpasswd({
      username: 'alice',
      password: 'secret'
    });

    expect(result.scheme).toBe('apr1');
    expect(result.salt).toMatch(/^[./A-Za-z0-9]{8}$/);
    expect(result.hash).toMatch(
      /^\$apr1\$[./A-Za-z0-9]{8}\$[./A-Za-z0-9]{22}$/
    );
    expect(result.line).toBe(`alice:${result.hash}`);
  });

  it('rejects invalid usernames and salts', async () => {
    await expect(
      generateHtpasswd({
        username: 'bad:name',
        password: 'password'
      })
    ).rejects.toThrow('username must not contain colon or line breaks');

    await expect(
      generateHtpasswd({
        username: 'alice',
        password: 'password',
        salt: 'bad salt'
      })
    ).rejects.toThrow('apr1 salt must use 1 to 8 characters');
  });
});

describe('htpasswdTools', () => {
  it('registers htpasswd.generate for Web, API, and MCP', () => {
    expect(
      htpasswdTools.find((tool) => tool.name === 'htpasswd.generate')?.channels
    ).toEqual(['web', 'api', 'mcp']);
  });
});
