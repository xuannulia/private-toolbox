import { describe, expect, it } from 'vitest';
import { convertUnit, unitTools } from './unit';

describe('unit.convert', () => {
  it('converts length units', () => {
    expect(
      convertUnit({
        value: 1,
        fromUnit: 'km',
        toUnit: 'm',
        precision: 0
      })
    ).toMatchObject({
      category: 'length',
      fromUnit: 'km',
      toUnit: 'm',
      converted: 1000,
      result: '1000'
    });
  });

  it('converts temperature units', () => {
    expect(
      convertUnit({
        value: 100,
        fromUnit: 'C',
        toUnit: 'F',
        precision: 2
      }).converted
    ).toBe(212);
  });

  it('converts pressure units', () => {
    expect(
      convertUnit({
        value: 1,
        fromUnit: 'atm',
        toUnit: 'kPa',
        precision: 3
      }).converted
    ).toBe(101.325);
  });

  it('converts speed aliases', () => {
    expect(
      convertUnit({
        value: 36,
        fromUnit: 'kmh',
        toUnit: 'm/s',
        precision: 2
      }).converted
    ).toBe(10);
  });

  it('converts data units', () => {
    expect(
      convertUnit({
        value: 1,
        fromUnit: 'GiB',
        toUnit: 'MB',
        precision: 2
      }).converted
    ).toBe(1073.74);
    expect(
      convertUnit({
        value: 8,
        fromUnit: 'b',
        toUnit: 'B',
        precision: 0
      }).converted
    ).toBe(1);
  });

  it('converts energy units', () => {
    expect(
      convertUnit({
        value: 1,
        fromUnit: 'kWh',
        toUnit: 'MJ',
        precision: 1
      }).converted
    ).toBe(3.6);
  });

  it('rejects incompatible categories', () => {
    expect(() =>
      convertUnit({
        value: 1,
        fromUnit: 'm',
        toUnit: 's'
      })
    ).toThrow('is not a length unit');
  });

  it('registers one local MCP-safe tool', () => {
    expect(unitTools.map((tool) => tool.name)).toEqual(['unit.convert']);
    expect(unitTools[0].channels).toEqual(['web', 'api', 'mcp']);
    expect(unitTools[0].risks).toEqual(['local']);
  });
});
