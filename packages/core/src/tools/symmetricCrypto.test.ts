import { describe, expect, it } from 'vitest';
import { runSymmetricCrypto, symmetricCryptoTools } from './symmetricCrypto';
import type { SymmetricCryptoAlgorithm } from './symmetricCrypto';

const fixtures: Record<
  SymmetricCryptoAlgorithm,
  {
    key: string;
    iv?: string;
  }
> = {
  AES: {
    key: '1234567890123456',
    iv: '1234567890123456'
  },
  DES: {
    key: '12345678',
    iv: '12345678'
  },
  TripleDES: {
    key: '123456789012345678901234',
    iv: '12345678'
  },
  RC4: {
    key: 'secret'
  },
  Rabbit: {
    key: '1234567890123456'
  }
};

describe('runSymmetricCrypto', () => {
  it('round-trips text with supported algorithms', () => {
    for (const [algorithm, fixture] of Object.entries(fixtures)) {
      const encrypted = runSymmetricCrypto({
        text: 'private toolbox 中文',
        key: fixture.key,
        iv: fixture.iv,
        algorithm: algorithm as SymmetricCryptoAlgorithm,
        operation: 'encrypt',
        mode: 'CBC',
        padding: 'Pkcs7'
      });

      expect(encrypted.text).not.toBe('private toolbox 中文');

      const decrypted = runSymmetricCrypto({
        text: encrypted.text,
        key: fixture.key,
        iv: fixture.iv,
        algorithm: algorithm as SymmetricCryptoAlgorithm,
        operation: 'decrypt',
        mode: 'CBC',
        padding: 'Pkcs7'
      });

      expect(decrypted.text).toBe('private toolbox 中文');
    }
  });

  it('round-trips hex encoded AES ciphertext with hex key and IV', () => {
    const encrypted = runSymmetricCrypto({
      text: 'hello',
      key: '31323334353637383930313233343536',
      iv: '31323334353637383930313233343536',
      keyEncoding: 'hex',
      ivEncoding: 'hex',
      algorithm: 'AES',
      operation: 'encrypt',
      mode: 'CBC',
      padding: 'Pkcs7',
      outputEncoding: 'hex'
    });

    expect(encrypted.encoding).toBe('hex');
    expect(encrypted.mode).toBe('CBC');
    expect(encrypted.padding).toBe('Pkcs7');
    expect(encrypted.text).toMatch(/^[0-9a-f]+$/);

    const decrypted = runSymmetricCrypto({
      text: encrypted.text,
      key: '31323334353637383930313233343536',
      iv: '31323334353637383930313233343536',
      keyEncoding: 'hex',
      ivEncoding: 'hex',
      algorithm: 'AES',
      operation: 'decrypt',
      mode: 'CBC',
      padding: 'Pkcs7',
      inputEncoding: 'hex'
    });

    expect(decrypted.text).toBe('hello');
  });

  it('supports ECB mode without IV', () => {
    const encrypted = runSymmetricCrypto({
      text: 'hello',
      key: fixtures.AES.key,
      algorithm: 'AES',
      operation: 'encrypt',
      mode: 'ECB',
      padding: 'Pkcs7'
    });

    expect(encrypted.iv).toBeUndefined();

    const decrypted = runSymmetricCrypto({
      text: encrypted.text,
      key: fixtures.AES.key,
      algorithm: 'AES',
      operation: 'decrypt',
      mode: 'ECB',
      padding: 'Pkcs7'
    });

    expect(decrypted.text).toBe('hello');
  });

  it('rejects invalid key lengths', () => {
    expect(() =>
      runSymmetricCrypto({
        text: 'hello',
        key: 'short',
        iv: fixtures.AES.iv,
        algorithm: 'AES',
        operation: 'encrypt'
      })
    ).toThrow('AES key must be 16 or 24 or 32 bytes');
  });

  it('rejects invalid hex ciphertext', () => {
    expect(() =>
      runSymmetricCrypto({
        text: 'not-hex',
        key: fixtures.AES.key,
        iv: fixtures.AES.iv,
        algorithm: 'AES',
        operation: 'decrypt',
        inputEncoding: 'hex'
      })
    ).toThrow('Invalid hex value');
  });
});

describe('symmetricCryptoTools', () => {
  it('registers crypto.symmetric for Web, API, and MCP', () => {
    const tool = symmetricCryptoTools.find(
      (item) => item.name === 'crypto.symmetric'
    );

    expect(tool?.channels).toEqual(['web', 'api', 'mcp']);
    expect(tool?.risks).toEqual(['local', 'secret']);
    expect(tool?.inputSchema.properties).toMatchObject({
      iv: { type: 'string' },
      mode: { type: 'string' },
      padding: { type: 'string' },
      keyEncoding: { type: 'string' },
      ivEncoding: { type: 'string' }
    });
  });
});
