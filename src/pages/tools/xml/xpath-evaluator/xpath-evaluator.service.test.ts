import { describe, expect, it } from 'vitest';
import { runXPathTool } from './service';

describe('runXPathTool', () => {
  it('evaluates XPath and returns formatted JSON', () => {
    const output = runXPathTool({
      text: '<root><item id="a">A</item></root>',
      expression: '//item/@id',
      includeXml: true,
      maxResults: 10
    });

    expect(JSON.parse(output)).toMatchObject({
      valid: true,
      resultType: 'nodes',
      matchCount: 1,
      nodes: [
        {
          type: 'attribute',
          name: 'id',
          value: 'a'
        }
      ]
    });
  });

  it('parses namespace JSON', () => {
    const output = runXPathTool({
      text: '<feed xmlns="https://example.test/feed"><entry id="a"/></feed>',
      expression: '//f:entry',
      namespacesText: '{"f":"https://example.test/feed"}',
      includeXml: false,
      maxResults: 10
    });

    expect(JSON.parse(output)).toMatchObject({
      valid: true,
      matchCount: 1
    });
  });
});
