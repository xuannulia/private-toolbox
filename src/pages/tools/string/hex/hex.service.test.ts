import { describe, expect, it } from 'vitest';
import { convertHex } from './service';

describe('convertHex', () => {
  it('encodes UTF-8 text to hexadecimal bytes', () => {
    expect(
      convertHex('Hello 世界', {
        mode: 'encode',
        uppercase: false,
        separator: ''
      })
    ).toBe('48656c6c6f20e4b896e7958c');
  });

  it('supports uppercase output and separators', () => {
    expect(
      convertHex('OK', {
        mode: 'encode',
        uppercase: true,
        separator: ':'
      })
    ).toBe('4F:4B');
  });

  it('decodes hexadecimal bytes to UTF-8 text', () => {
    expect(
      convertHex('48 65 6c 6c 6f 20 e4 b8 96 e7 95 8c', {
        mode: 'decode',
        uppercase: false,
        separator: ''
      })
    ).toBe('Hello 世界');
  });

  it('rejects invalid hexadecimal text', () => {
    expect(() =>
      convertHex('hello', {
        mode: 'decode',
        uppercase: false,
        separator: ''
      })
    ).toThrow('Hex input can only contain hexadecimal digits');
  });
});
