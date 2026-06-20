import { describe, expect, it } from 'vitest';
import { createHtpasswdLine } from './service';

describe('htpasswd generator service', () => {
  it('creates deterministic apr1 htpasswd lines when salt is provided', async () => {
    await expect(
      createHtpasswdLine({
        username: 'alice',
        password: 'password',
        scheme: 'apr1',
        salt: 'hfT7jp2q'
      })
    ).resolves.toBe('alice:$apr1$hfT7jp2q$two3QJlp/Qr/L8kifGFHF1');
  });

  it('creates sha1 htpasswd lines', async () => {
    await expect(
      createHtpasswdLine({
        username: 'alice',
        password: 'password',
        scheme: 'sha1',
        salt: ''
      })
    ).resolves.toBe('alice:{SHA}W6ph5Mm5Pz8GgiULbPgzG37mj9g=');
  });

  it('returns empty output when required fields are missing', async () => {
    await expect(
      createHtpasswdLine({
        username: '',
        password: 'password',
        scheme: 'apr1',
        salt: ''
      })
    ).resolves.toBe('');
  });
});
