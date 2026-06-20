import { describe, expect, it } from 'vitest';
import { decodeString } from './service';

describe('decodeString', () => {
  it('decodes URL-escaped text', () => {
    expect(decodeString('https%3A%2F%2Fprivate-toolbox.local%2F')).toBe(
      'https://private-toolbox.local/'
    );
  });

  it('throws on malformed escape sequences', () => {
    expect(() => decodeString('%E0%A4%A')).toThrow();
  });
});
