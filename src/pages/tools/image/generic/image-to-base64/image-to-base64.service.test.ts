import { describe, expect, it } from 'vitest';
import { imageFileToBase64 } from './service';

const pngBytes = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82
]);

describe('imageFileToBase64', () => {
  it('returns a Data URL by default option', async () => {
    const file = new File([pngBytes], 'pixel.png', { type: 'image/png' });
    const result = await imageFileToBase64(file, 'data_url');

    expect(result.name).toBe('pixel.png');
    expect(result.mimeType).toBe('image/png');
    expect(result.format).toBe('data_url');
    expect(result.text).toBe(
      `data:image/png;base64,${btoa(String.fromCharCode(...pngBytes))}`
    );
  });

  it('can return plain Base64', async () => {
    const file = new File([pngBytes], 'pixel.png', { type: 'image/png' });
    const result = await imageFileToBase64(file, 'base64');

    expect(result.format).toBe('base64');
    expect(result.text).toBe(btoa(String.fromCharCode(...pngBytes)));
  });

  it('rejects non-image files', async () => {
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });

    await expect(imageFileToBase64(file, 'base64')).rejects.toThrow(
      'Please select an image file'
    );
  });
});
