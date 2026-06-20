import { describe, expect, it } from 'vitest';
import { createPemInspectionText, examplePem } from './service';

describe('PEM inspector service', () => {
  it('formats PEM inspection as JSON text', async () => {
    const result = await createPemInspectionText({ pem: examplePem });

    expect(result).toContain('"blockCount": 1');
    expect(result).toContain('"label": "PUBLIC KEY"');
    expect(result).toContain('"type": "public_key"');
    expect(result).toContain('"publicExponent": "65537"');
  });

  it('returns empty text for blank input', async () => {
    await expect(createPemInspectionText({ pem: '   ' })).resolves.toBe('');
  });
});
