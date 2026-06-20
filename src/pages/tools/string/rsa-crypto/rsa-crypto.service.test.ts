import { generateRsaKeyPair } from '@private-toolbox/core';
import { describe, expect, it } from 'vitest';
import { runRsaCryptoTool } from './service';

describe('runRsaCryptoTool', () => {
  it('encrypts and decrypts through the shared RSA core tools', async () => {
    const keyPair = await generateRsaKeyPair({
      algorithm: 'RSA-OAEP',
      modulusLength: 2048,
      hash: 'SHA-256'
    });

    const encrypted = JSON.parse(
      await runRsaCryptoTool({
        operation: 'encrypt',
        keyPem: keyPair.publicKeyPem,
        text: 'hello rsa',
        hash: 'SHA-256',
        inputEncoding: 'utf8',
        outputEncoding: 'utf8'
      })
    ) as { ciphertextBase64: string };

    const decrypted = JSON.parse(
      await runRsaCryptoTool({
        operation: 'decrypt',
        keyPem: keyPair.privateKeyPem,
        text: encrypted.ciphertextBase64,
        hash: 'SHA-256',
        inputEncoding: 'utf8',
        outputEncoding: 'utf8'
      })
    ) as { plaintext: string };

    expect(decrypted.plaintext).toBe('hello rsa');
  });

  it('signs and verifies through the shared RSA core tools', async () => {
    const keyPair = await generateRsaKeyPair({
      algorithm: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      hash: 'SHA-256'
    });

    const signed = JSON.parse(
      await runRsaCryptoTool({
        operation: 'sign',
        keyPem: keyPair.privateKeyPem,
        text: 'hello rsa',
        hash: 'SHA-256',
        inputEncoding: 'utf8',
        outputEncoding: 'utf8'
      })
    ) as { signatureBase64: string };

    const verified = JSON.parse(
      await runRsaCryptoTool({
        operation: 'verify',
        keyPem: keyPair.publicKeyPem,
        text: 'hello rsa',
        signatureBase64: signed.signatureBase64,
        hash: 'SHA-256',
        inputEncoding: 'utf8',
        outputEncoding: 'utf8'
      })
    ) as { valid: boolean };

    expect(verified.valid).toBe(true);
  });
});
