import { describe, expect, it } from 'vitest';
import { generateRsaKeyPair } from '@private-toolbox/core';
import {
  createExtractedPublicKeyText,
  createRsaPrivateKeyInfoText,
  inspectRsaPrivateKeyForTool
} from './service';

describe('RSA private key service', () => {
  it('inspects and extracts a generated private key', async () => {
    const keyPair = await generateRsaKeyPair({
      algorithm: 'RSA-OAEP',
      modulusLength: 2048,
      hash: 'SHA-256'
    });

    expect(
      inspectRsaPrivateKeyForTool({
        privateKeyPem: keyPair.privateKeyPem
      })
    ).toMatchObject({
      format: 'pkcs8',
      modulusLength: 2048,
      publicExponent: '65537'
    });

    expect(
      createExtractedPublicKeyText({
        privateKeyPem: keyPair.privateKeyPem
      })
    ).toBe(keyPair.publicKeyPem);
  });

  it('returns empty text for empty input', () => {
    expect(createRsaPrivateKeyInfoText({ privateKeyPem: '' })).toBe('');
    expect(createExtractedPublicKeyText({ privateKeyPem: '' })).toBe('');
  });
});
