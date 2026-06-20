import { describe, expect, it } from 'vitest';
import { convertBaseForTool, createBaseConversionText } from './service';

describe('convertBaseForTool', () => {
  it('converts hexadecimal to decimal', () => {
    expect(
      convertBaseForTool({
        value: 'ff',
        fromBase: '16',
        toBase: '10',
        uppercase: false,
        outputPrefix: false
      })
    ).toMatchObject({
      fromBase: 16,
      toBase: 10,
      value: '255',
      decimal: '255'
    });
  });

  it('auto-detects prefixed input', () => {
    expect(
      convertBaseForTool({
        value: '0b1010',
        fromBase: '',
        toBase: '16',
        uppercase: false,
        outputPrefix: false
      })?.value
    ).toBe('a');
  });

  it('returns empty text for empty input', () => {
    expect(
      createBaseConversionText({
        value: '',
        fromBase: '',
        toBase: '10',
        uppercase: false,
        outputPrefix: false
      })
    ).toBe('');
  });
});
