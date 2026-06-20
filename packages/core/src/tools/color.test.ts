import { describe, expect, it } from 'vitest';
import { colorTools, convertColor } from './color';

describe('convertColor', () => {
  it('converts short HEX to RGB output', () => {
    expect(convertColor({ color: '#36c' })).toMatchObject({
      input: '#36c',
      sourceFormat: 'hex',
      hex: '#3366cc',
      hexa: '#3366ccff',
      rgb: {
        red: 51,
        green: 102,
        blue: 204
      },
      alpha: 1,
      cssRgb: 'rgb(51, 102, 204)',
      cssRgba: 'rgba(51, 102, 204, 1)',
      contrastText: '#ffffff'
    });
  });

  it('keeps alpha from 8-digit HEX', () => {
    const result = convertColor({ color: '#33669980' });

    expect(result).toMatchObject({
      hex: '#336699',
      hexa: '#33669980',
      rgb: {
        red: 51,
        green: 102,
        blue: 153
      },
      alpha: 0.502,
      cssRgba: 'rgba(51, 102, 153, 0.502)'
    });
  });

  it('converts RGB and RGBA strings to HEX', () => {
    expect(convertColor({ color: 'rgb(255, 128, 0)' })).toMatchObject({
      sourceFormat: 'rgb',
      hex: '#ff8000',
      hexa: '#ff8000ff'
    });

    expect(convertColor({ color: 'rgba(255 0 0 / 50%)' })).toMatchObject({
      hex: '#ff0000',
      hexa: '#ff000080',
      alpha: 0.5
    });
  });

  it('accepts component input and uppercase output', () => {
    expect(
      convertColor({
        red: 12,
        green: 34,
        blue: 56,
        alpha: 0.25,
        uppercase: true
      })
    ).toMatchObject({
      sourceFormat: 'components',
      hex: '#0C2238',
      hexa: '#0C223840',
      cssRgba: 'rgba(12, 34, 56, 0.25)'
    });
  });

  it('accepts percentage RGB channels', () => {
    expect(convertColor({ color: 'rgb(100%, 50%, 0%)' })).toMatchObject({
      hex: '#ff8000',
      rgb: {
        red: 255,
        green: 128,
        blue: 0
      }
    });
  });

  it('rejects invalid color input', () => {
    expect(() => convertColor({ color: 'blue-ish' })).toThrow(
      'Color must be a HEX value or an RGB/RGBA value'
    );
  });

  it('rejects invalid component values', () => {
    expect(() =>
      convertColor({
        red: 256,
        green: 0,
        blue: 0
      })
    ).toThrow('red must be an integer between 0 and 255');
  });
});

describe('colorTools', () => {
  it('registers color.convert for Web, API, and MCP', () => {
    const tool = colorTools.find((item) => item.name === 'color.convert');

    expect(tool?.channels).toEqual(['web', 'api', 'mcp']);
    expect(tool?.risks).toEqual(['local']);
  });
});
