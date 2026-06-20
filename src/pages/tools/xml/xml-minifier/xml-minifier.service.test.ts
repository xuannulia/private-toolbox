import { describe, expect, it } from 'vitest';
import { minifyXml } from './service';

describe('xml-minifier', () => {
  it('minifies valid XML', () => {
    const input = `<root>
  <a>1</a>
  <b>2</b>
</root>`;
    const result = minifyXml(input, {});

    expect(result).toBe('<root><a>1</a><b>2</b></root>');
  });

  it('returns error for invalid XML', () => {
    const result = minifyXml('<root><a>1</b></root>', {});

    expect(result).toMatch(/Invalid XML/i);
  });
});
