import { describe, expect, it } from 'vitest';
import {
  decryptRsa,
  encryptRsa,
  extractRsaPublicKey,
  generateRsaKeyPair,
  inspectRsaPrivateKey,
  rsaTools,
  signRsa,
  verifyRsa
} from './rsa';

describe('generateRsaKeyPair', () => {
  it('exports an RSA key pair as PEM', async () => {
    const result = await generateRsaKeyPair({
      algorithm: 'RSA-OAEP',
      modulusLength: 2048,
      hash: 'SHA-256'
    });

    expect(result.publicKeyPem).toContain('-----BEGIN PUBLIC KEY-----');
    expect(result.publicKeyPem).toContain('-----END PUBLIC KEY-----');
    expect(result.privateKeyPem).toContain('-----BEGIN PRIVATE KEY-----');
    expect(result.privateKeyPem).toContain('-----END PRIVATE KEY-----');
  });
});

describe('inspectRsaPrivateKey', () => {
  it('inspects generated PKCS#8 private keys', async () => {
    const keyPair = await generateRsaKeyPair({
      algorithm: 'RSA-OAEP',
      modulusLength: 2048,
      hash: 'SHA-256'
    });

    expect(
      inspectRsaPrivateKey({
        privateKeyPem: keyPair.privateKeyPem
      })
    ).toMatchObject({
      keyType: 'rsa',
      format: 'pkcs8',
      pemLabel: 'PRIVATE KEY',
      algorithmOid: '1.2.840.113549.1.1.1',
      modulusLength: 2048,
      publicExponent: '65537',
      multiPrime: false
    });
  });

  it('rejects encrypted private keys', () => {
    expect(() =>
      inspectRsaPrivateKey({
        privateKeyPem:
          '-----BEGIN ENCRYPTED PRIVATE KEY-----\nAA==\n-----END ENCRYPTED PRIVATE KEY-----'
      })
    ).toThrow('Encrypted private keys are not supported');
  });
});

describe('extractRsaPublicKey', () => {
  it('extracts a public key that matches the generated key pair', async () => {
    const keyPair = await generateRsaKeyPair({
      algorithm: 'RSA-OAEP',
      modulusLength: 2048,
      hash: 'SHA-256'
    });

    expect(
      extractRsaPublicKey({
        privateKeyPem: keyPair.privateKeyPem
      })
    ).toMatchObject({
      modulusLength: 2048,
      publicExponent: '65537',
      publicKeyPem: keyPair.publicKeyPem
    });
  });
});

describe('RSA crypto operations', () => {
  it('encrypts and decrypts UTF-8 text with RSA-OAEP', async () => {
    const keyPair = await generateRsaKeyPair({
      algorithm: 'RSA-OAEP',
      modulusLength: 2048,
      hash: 'SHA-256'
    });

    const encrypted = await encryptRsa({
      publicKeyPem: keyPair.publicKeyPem,
      text: 'private toolbox',
      hash: 'SHA-256'
    });

    expect(encrypted).toMatchObject({
      algorithm: 'RSA-OAEP',
      hash: 'SHA-256',
      inputEncoding: 'utf8'
    });
    expect(encrypted.ciphertextBase64).not.toContain('private toolbox');

    await expect(
      decryptRsa({
        privateKeyPem: keyPair.privateKeyPem,
        ciphertextBase64: encrypted.ciphertextBase64,
        hash: 'SHA-256'
      })
    ).resolves.toMatchObject({
      algorithm: 'RSA-OAEP',
      hash: 'SHA-256',
      outputEncoding: 'utf8',
      plaintext: 'private toolbox'
    });
  });

  it('signs and verifies UTF-8 text with RSASSA-PKCS1-v1_5', async () => {
    const keyPair = await generateRsaKeyPair({
      algorithm: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      hash: 'SHA-256'
    });

    const signed = await signRsa({
      privateKeyPem: keyPair.privateKeyPem,
      text: 'message to sign',
      hash: 'SHA-256'
    });

    expect(signed.signatureBase64.length).toBeGreaterThan(100);

    await expect(
      verifyRsa({
        publicKeyPem: keyPair.publicKeyPem,
        text: 'message to sign',
        signatureBase64: signed.signatureBase64,
        hash: 'SHA-256'
      })
    ).resolves.toMatchObject({
      valid: true
    });

    await expect(
      verifyRsa({
        publicKeyPem: keyPair.publicKeyPem,
        text: 'changed message',
        signatureBase64: signed.signatureBase64,
        hash: 'SHA-256'
      })
    ).resolves.toMatchObject({
      valid: false
    });
  });
});

describe('rsaTools', () => {
  it('registers RSA tools for Web, API, and MCP', () => {
    for (const name of [
      'rsa.generate_keypair',
      'rsa.inspect_private_key',
      'rsa.extract_public_key',
      'rsa.encrypt',
      'rsa.decrypt',
      'rsa.sign',
      'rsa.verify'
    ]) {
      expect(rsaTools.find((item) => item.name === name)?.channels).toEqual([
        'web',
        'api',
        'mcp'
      ]);
    }
  });
});
