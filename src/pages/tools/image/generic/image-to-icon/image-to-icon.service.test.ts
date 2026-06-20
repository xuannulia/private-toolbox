import { describe, expect, it } from 'vitest';
import { replaceFileExtension, webIconSizes } from './service';

describe('replaceFileExtension', () => {
  it('replaces the last extension with ico', () => {
    expect(replaceFileExtension('logo.source.png', 'ico')).toBe(
      'logo.source.ico'
    );
  });

  it('adds an extension when the file has no extension', () => {
    expect(replaceFileExtension('favicon', '.ico')).toBe('favicon.ico');
  });
});

describe('webIconSizes', () => {
  it('offers common favicon sizes', () => {
    expect(webIconSizes).toEqual([16, 24, 32, 48, 64, 128, 256]);
  });
});
