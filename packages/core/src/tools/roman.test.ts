import { describe, expect, it } from 'vitest';
import {
  convertRoman,
  numberToRoman,
  romanToNumber,
  romanTools
} from './roman';

describe('roman.convert', () => {
  it('converts numbers to roman numerals', () => {
    expect(numberToRoman(1994)).toBe('MCMXCIV');
    expect(convertRoman({ value: 3999 })).toMatchObject({
      direction: 'to_roman',
      number: 3999,
      roman: 'MMMCMXCIX',
      result: 'MMMCMXCIX'
    });
  });

  it('converts roman numerals to numbers', () => {
    expect(romanToNumber('MCMXCIV')).toBe(1994);
    expect(convertRoman({ value: 'mmxxvi' })).toMatchObject({
      direction: 'from_roman',
      number: 2026,
      roman: 'MMXXVI',
      result: '2026'
    });
  });

  it('respects explicit direction', () => {
    expect(convertRoman({ value: '42', direction: 'to_roman' }).result).toBe(
      'XLII'
    );
  });

  it('rejects numbers outside the standard range', () => {
    expect(() => convertRoman({ value: 0 })).toThrow(
      'number must be an integer from 1 to 3999'
    );
  });

  it('rejects non-standard roman numerals', () => {
    expect(() => convertRoman({ value: 'IIII' })).toThrow(
      'standard subtractive notation'
    );
  });

  it('registers one local MCP-safe tool', () => {
    expect(romanTools.map((tool) => tool.name)).toEqual(['roman.convert']);
    expect(romanTools[0].channels).toEqual(['web', 'api', 'mcp']);
    expect(romanTools[0].risks).toEqual(['local']);
  });
});
