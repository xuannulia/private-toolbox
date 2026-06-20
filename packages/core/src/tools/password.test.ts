import { describe, expect, it } from 'vitest';
import { generatePassword } from './password';

describe('generatePassword', () => {
  it('generates a password with the requested character groups', () => {
    const result = generatePassword({
      length: 32,
      includeLowercase: true,
      includeUppercase: true,
      includeNumbers: true,
      includeSymbols: false
    });

    expect(result.password).toHaveLength(32);
    expect(result.password).toMatch(/^[a-zA-Z0-9]+$/);
    expect(result.characterSetSize).toBe(62);
  });

  it('can avoid ambiguous characters', () => {
    const result = generatePassword({
      length: 64,
      includeLowercase: true,
      includeUppercase: true,
      includeNumbers: true,
      includeSymbols: true,
      avoidAmbiguous: true
    });

    expect(result.password).not.toMatch(/[iIl0O]/);
  });

  it('throws when no character group is selected', () => {
    expect(() =>
      generatePassword({
        includeLowercase: false,
        includeUppercase: false,
        includeNumbers: false,
        includeSymbols: false
      })
    ).toThrow('Select at least one character group');
  });
});
