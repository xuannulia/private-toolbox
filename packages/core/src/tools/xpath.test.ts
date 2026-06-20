import { describe, expect, it } from 'vitest';
import { callCoreTool, coreToolNames } from '../registry.js';
import { evaluateXPath } from './xpath.js';

const xml = `<catalog>
  <book id="b1">
    <title>Private Toolbox</title>
    <price currency="CNY">99</price>
  </book>
  <book id="b2">
    <title>OmniTools Notes</title>
    <price currency="USD">29</price>
  </book>
</catalog>`;

describe('evaluateXPath', () => {
  it('returns structured node matches', () => {
    const result = evaluateXPath({
      text: xml,
      expression: '//book[@id="b2"]/title',
      maxResults: 5
    });

    expect(result.valid).toBe(true);
    expect(result.resultType).toBe('nodes');
    expect(result.matchCount).toBe(1);
    expect(result.nodes[0]).toMatchObject({
      type: 'element',
      name: 'title',
      text: 'OmniTools Notes'
    });
    expect(result.nodes[0].path).toBe('/catalog[1]/book[2]/title[1]');
    expect(result.nodes[0].xml).toBe('<title>OmniTools Notes</title>');
  });

  it('supports scalar XPath expressions', () => {
    expect(
      evaluateXPath({ text: xml, expression: 'count(//book)' })
    ).toMatchObject({
      valid: true,
      resultType: 'number',
      value: 2
    });

    expect(
      evaluateXPath({ text: xml, expression: 'string(//book[@id="b1"]/title)' })
    ).toMatchObject({
      valid: true,
      resultType: 'string',
      value: 'Private Toolbox'
    });

    expect(
      evaluateXPath({ text: xml, expression: 'boolean(//book[@id="missing"])' })
    ).toMatchObject({
      valid: true,
      resultType: 'boolean',
      matchCount: 0,
      value: false
    });
  });

  it('supports namespace mappings', () => {
    const result = evaluateXPath({
      text: `<feed xmlns="https://example.test/feed"><entry id="a"/></feed>`,
      expression: '//f:entry/@id',
      namespaces: {
        f: 'https://example.test/feed'
      }
    });

    expect(result.valid).toBe(true);
    expect(result.nodes[0]).toMatchObject({
      type: 'attribute',
      name: 'id',
      value: 'a',
      path: '/feed[1]/entry[1]/@id'
    });
  });

  it('limits node output without hiding match count', () => {
    const result = evaluateXPath({
      text: xml,
      expression: '//book',
      maxResults: 1,
      includeXml: false
    });

    expect(result.valid).toBe(true);
    expect(result.matchCount).toBe(2);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].xml).toBeNull();
    expect(result.truncated).toBe(true);
  });

  it('returns invalid output for invalid XML or XPath', () => {
    expect(
      evaluateXPath({ text: '<root>', expression: '//root' })
    ).toMatchObject({
      valid: false,
      resultType: null
    });

    expect(evaluateXPath({ text: xml, expression: '//*[' })).toMatchObject({
      valid: false,
      resultType: null
    });
  });
});

describe('xpathTools', () => {
  it('is registered for shared channels', async () => {
    expect(coreToolNames).toContain('xpath.evaluate');

    const result = await callCoreTool('xpath.evaluate', {
      text: xml,
      expression: 'count(//book)'
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result).toMatchObject({
        valid: true,
        resultType: 'number',
        value: 2
      });
    }
  });
});
