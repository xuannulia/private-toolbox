import { describe, expect, it } from 'vitest';
import { runSymmetricCrypto, symmetricCryptoTools } from './symmetricCrypto';
import type { SymmetricCryptoAlgorithm } from './symmetricCrypto';

const algorithms: SymmetricCryptoAlgorithm[] = [
  'AES',
  'DES',
  'TripleDES',
  'RC4',
  'Rabbit'
];

describe('runSymmetricCrypto', () => {
  it('round-trips text with supported algorithms', () => {
    for (const algorithm of algorithms) {
      const encrypted = runSymmetricCrypto({
        text: 'private toolbox 中文',
        key: 'secret',
        algorithm,
        operation: 'encrypt'
      });

      expect(encrypted.text).not.toBe('private toolbox 中文');

      const decrypted = runSymmetricCrypto({
        text: encrypted.text,
        key: 'secret',
        algorithm,
        operation: 'decrypt'
      });

      expect(decrypted.text).toBe('private toolbox 中文');
    }
  });

  it('round-trips hex encoded ciphertext', () => {
    const encrypted = runSymmetricCrypto({
      text: 'hello',
      key: 'secret',
      algorithm: 'AES',
      operation: 'encrypt',
      outputEncoding: 'hex'
    });

    expect(encrypted.encoding).toBe('hex');
    expect(encrypted.text).toMatch(/^[0-9a-f]+$/);

    const decrypted = runSymmetricCrypto({
      text: encrypted.text,
      key: 'secret',
      algorithm: 'AES',
      operation: 'decrypt',
      inputEncoding: 'hex'
    });

    expect(decrypted.text).toBe('hello');
  });

  it('rejects invalid hex ciphertext', () => {
    expect(() =>
      runSymmetricCrypto({
        text: 'not-hex',
        key: 'secret',
        algorithm: 'AES',
        operation: 'decrypt',
        inputEncoding: 'hex'
      })
    ).toThrow('Invalid hex ciphertext');
  });
});

describe('symmetricCryptoTools', () => {
  it('registers crypto.symmetric for Web, API, and MCP', () => {
    const tool = symmetricCryptoTools.find(
      (item) => item.name === 'crypto.symmetric'
    );

    expect(tool?.channels).toEqual(['web', 'api', 'mcp']);
    expect(tool?.risks).toEqual(['local', 'secret']);
  });
});
