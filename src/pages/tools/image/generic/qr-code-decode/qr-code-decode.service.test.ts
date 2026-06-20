import { describe, expect, it } from 'vitest';
import { formatDecodedQrCode } from './service';

describe('formatDecodedQrCode', () => {
  it('returns decoded text without adding UI metadata', () => {
    expect(
      formatDecodedQrCode({
        text: 'https://example.com',
        version: 2
      })
    ).toBe('https://example.com');
  });
});
