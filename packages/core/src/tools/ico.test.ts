import { describe, expect, it } from 'vitest';
import {
  createIcoFromPngImages,
  defaultIconSizes,
  normalizeIconSizes
} from './ico';

const pngHeader = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
]);

describe('normalizeIconSizes', () => {
  it('uses default icon sizes when no sizes are provided', () => {
    expect(normalizeIconSizes()).toEqual(defaultIconSizes);
  });

  it('deduplicates and sorts supported sizes', () => {
    expect(normalizeIconSizes([64, 16, 64, 32])).toEqual([16, 32, 64]);
  });

  it('rejects unsupported sizes', () => {
    expect(() => normalizeIconSizes([20])).toThrow('Unsupported icon size');
  });
});

describe('createIcoFromPngImages', () => {
  it('packs PNG images into an ICO file', () => {
    const ico = createIcoFromPngImages([
      { width: 16, height: 16, pngData: pngHeader },
      { width: 256, height: 256, pngData: pngHeader }
    ]);
    const view = new DataView(ico.buffer);

    expect(view.getUint16(0, true)).toBe(0);
    expect(view.getUint16(2, true)).toBe(1);
    expect(view.getUint16(4, true)).toBe(2);
    expect(ico[6]).toBe(16);
    expect(ico[7]).toBe(16);
    expect(view.getUint32(14, true)).toBe(pngHeader.byteLength);
    expect(view.getUint32(18, true)).toBe(38);
    expect(ico[22]).toBe(0);
    expect(ico[23]).toBe(0);
    expect(view.getUint32(30, true)).toBe(pngHeader.byteLength);
    expect(view.getUint32(34, true)).toBe(46);
    expect(Array.from(ico.slice(38, 46))).toEqual(Array.from(pngHeader));
  });

  it('requires at least one PNG image', () => {
    expect(() => createIcoFromPngImages([])).toThrow(
      'At least one PNG image is required'
    );
  });
});
