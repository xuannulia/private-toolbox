import { describe, expect, it } from 'vitest';
import { convertColorForTool, createColorConversionText } from './service';

describe('convertColorForTool', () => {
  it('converts HEX color input', () => {
    expect(
      convertColorForTool({
        color: '#336699',
        uppercase: false
      })
    ).toMatchObject({
      hex: '#336699',
      cssRgb: 'rgb(51, 102, 153)'
    });
  });

  it('supports uppercase output', () => {
    expect(
      convertColorForTool({
        color: 'rgb(12, 34, 56)',
        uppercase: true
      })?.hex
    ).toBe('#0C2238');
  });

  it('returns empty text for empty input', () => {
    expect(
      createColorConversionText({
        color: '',
        uppercase: false
      })
    ).toBe('');
  });
});
