import { describe, expect, it } from 'vitest';
import {
  convertByteUnits,
  dataUnits,
  formatRandomNumbers,
  generateRandomNumbers,
  numberTools,
  sumNumbers
} from './number';

describe('number tools', () => {
  describe('sumNumbers', () => {
    it('sums numbers extracted from prose', () => {
      expect(
        sumNumbers({
          text: 'The 2 cats have 4 and 7 kittens'
        })
      ).toMatchObject({
        numbers: [2, 4, 7],
        sum: 13,
        result: '13'
      });
    });

    it('supports signed decimals and scientific notation', () => {
      expect(
        sumNumbers({
          text: '1.5, -2, 3e2',
          extractionType: 'smart'
        }).sum
      ).toBe(299.5);
    });

    it('sums delimited input and decodes escaped separators', () => {
      expect(
        sumNumbers({
          text: '1\n2\n3',
          extractionType: 'delimiter',
          separator: '\\n'
        }).result
      ).toBe('6');
    });

    it('returns running sums', () => {
      expect(
        sumNumbers({
          numbers: [2, 4, 7],
          printRunningSum: true
        }).result
      ).toBe('2\n6\n13\n');
    });
  });

  describe('generateRandomNumbers', () => {
    it('generates integers inside an inclusive range', () => {
      const result = generateRandomNumbers({
        min: 1,
        max: 3,
        count: 20,
        allowDuplicates: true
      });

      expect(result.numbers).toHaveLength(20);
      expect(result.numbers.every((value) => Number.isInteger(value))).toBe(
        true
      );
      expect(result.numbers.every((value) => value >= 1 && value <= 3)).toBe(
        true
      );
    });

    it('generates unique sorted integers', () => {
      const result = generateRandomNumbers({
        min: 1,
        max: 5,
        count: 5,
        allowDuplicates: false,
        sortResults: true
      });

      expect(result.numbers).toEqual([1, 2, 3, 4, 5]);
      expect(result.hasDuplicates).toBe(false);
      expect(result.isSorted).toBe(true);
    });

    it('generates decimals with the selected precision', () => {
      const result = generateRandomNumbers({
        min: 0,
        max: 1,
        count: 5,
        allowDecimals: true,
        precision: 3
      });

      expect(result.numbers).toHaveLength(5);
      expect(result.result.split(', ')).toHaveLength(5);
      expect(result.result.split(', ')[0]).toMatch(/^\d\.\d{3}$/);
    });

    it('formats random numbers for display', () => {
      expect(formatRandomNumbers([1.2, 3.456], ' | ', true, 2)).toBe(
        '1.20 | 3.46'
      );
    });
  });

  describe('convertByteUnits', () => {
    it('converts decimal units', () => {
      expect(
        convertByteUnits({
          text: '1\n2',
          fromUnit: 'GB',
          toUnit: 'MB',
          precision: 0
        }).result
      ).toBe('1000\n2000');
    });

    it('converts binary and cross-system units', () => {
      expect(
        convertByteUnits({
          value: 1,
          fromUnit: 'GiB',
          toUnit: 'MB',
          precision: 2
        }).result
      ).toBe('1073.74');
    });

    it('preserves empty lines in text input', () => {
      expect(
        convertByteUnits({
          text: '1\n\n3',
          fromUnit: 'GB',
          toUnit: 'MB',
          precision: 0
        }).result
      ).toBe('1000\n\n3000');
    });
  });

  it('registers MCP-safe local tools', () => {
    expect(numberTools.map((tool) => tool.name)).toEqual([
      'number.sum',
      'number.random',
      'number.byte_convert'
    ]);
    expect(
      numberTools.every((tool) => tool.channels.join(',') === 'web,api,mcp')
    ).toBe(true);
    expect(numberTools.every((tool) => tool.risks.join(',') === 'local')).toBe(
      true
    );
    expect(dataUnits).toContain('GiB');
  });
});
