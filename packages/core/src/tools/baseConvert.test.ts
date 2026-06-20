import { describe, expect, it } from 'vitest';
import { baseConvertTools, convertNumberBase } from './baseConvert';

describe('convertNumberBase', () => {
  it('converts hexadecimal to decimal', () => {
    expect(
      convertNumberBase({ value: 'ff', fromBase: 16, toBase: 10 })
    ).toMatchObject({
      input: 'ff',
      normalizedInput: 'ff',
      fromBase: 16,
      toBase: 10,
      value: '255',
      prefixedValue: '255',
      decimal: '255',
      binary: '11111111',
      octal: '377',
      hexadecimal: 'ff',
      isNegative: false
    });
  });

  it('auto-detects prefixed input and supports uppercase prefixed output', () => {
    expect(
      convertNumberBase({
        value: '0b101010',
        toBase: 16,
        uppercase: true,
        outputPrefix: true
      })
    ).toMatchObject({
      fromBase: 2,
      toBase: 16,
      value: '2A',
      prefixedValue: '0x2A',
      decimal: '42',
      hexadecimal: '2A'
    });
  });

  it('supports large negative integers', () => {
    expect(
      convertNumberBase({ value: '-zzzzzzzzzz', fromBase: 36, toBase: 10 })
    ).toMatchObject({
      value: '-3656158440062975',
      decimal: '-3656158440062975',
      isNegative: true
    });
  });

  it('rejects invalid base', () => {
    expect(() =>
      convertNumberBase({ value: '10', fromBase: 1, toBase: 10 })
    ).toThrow('Base must be an integer between 2 and 36');
  });

  it('rejects invalid digit', () => {
    expect(() =>
      convertNumberBase({ value: '102', fromBase: 2, toBase: 10 })
    ).toThrow('Digit "2" is not valid for base 2');
  });

  it('rejects prefix/base mismatch', () => {
    expect(() =>
      convertNumberBase({ value: '0x10', fromBase: 10, toBase: 2 })
    ).toThrow('Input prefix implies base 16');
  });
});

describe('baseConvertTools', () => {
  it('registers number.base_convert for Web, API, and MCP', () => {
    const tool = baseConvertTools.find(
      (item) => item.name === 'number.base_convert'
    );

    expect(tool?.channels).toEqual(['web', 'api', 'mcp']);
    expect(tool?.risks).toEqual(['local']);
  });
});
