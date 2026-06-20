import { describe, expect, it } from 'vitest';
import { encodeString } from './service';

describe('encodeString', () => {
  it('encodes URL special characters', () => {
    expect(
      encodeString('https://private-toolbox.local/?q=hello world', {
        nonSpecialChar: false
      })
    ).toBe('https%3A%2F%2Fprivate-toolbox.local%2F%3Fq%3Dhello%20world');
  });

  it('can encode every character', () => {
    expect(encodeString('abc', { nonSpecialChar: true })).toBe('%61%62%63');
  });
});
