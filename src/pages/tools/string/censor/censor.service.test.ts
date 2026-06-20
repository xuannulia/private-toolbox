import { describe, expect, it } from 'vitest';
import { censorText } from './service';

const baseOptions = {
  wordsToCensor: 'secret',
  censoredBySymbol: true,
  censorSymbol: '*',
  eachLetter: true,
  censorWord: 'REDACTED'
};

describe('censorText', () => {
  it('masks each letter with a symbol', () => {
    expect(censorText('A secret value', baseOptions)).toBe('A ****** value');
  });

  it('can replace a matched word with a fixed replacement', () => {
    expect(
      censorText('A secret value', {
        ...baseOptions,
        censoredBySymbol: false,
        censorWord: 'REDACTED'
      })
    ).toBe('A REDACTED value');
  });

  it('returns the input when no words are configured', () => {
    expect(
      censorText('A secret value', { ...baseOptions, wordsToCensor: '' })
    ).toBe('A secret value');
  });
});
