import { describe, expect, it } from 'vitest';
import { convertJsonToXml } from './service';

describe('convertJsonToXml page service', () => {
  it('converts JSON to formatted XML with an XML declaration', () => {
    expect(
      convertJsonToXml('{"user":{"name":"Ada","tag":"<admin>"}}', {
        indentationType: 'space',
        addMetaTag: true
      })
    ).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<root>
  <user>
    <name>Ada</name>
    <tag>&lt;admin&gt;</tag>
  </user>
</root>`);
  });

  it('supports compact XML output', () => {
    expect(
      convertJsonToXml('{"ok":true}', {
        indentationType: 'none',
        addMetaTag: false
      })
    ).toBe('<root><ok>true</ok></root>');
  });

  it('rejects invalid JSON', () => {
    expect(() =>
      convertJsonToXml('{ ok: true }', {
        indentationType: 'space',
        addMetaTag: false
      })
    ).toThrow();
  });
});
