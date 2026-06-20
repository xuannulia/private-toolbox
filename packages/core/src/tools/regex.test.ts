import { describe, expect, it } from 'vitest';
import {
  explainRegex,
  regexToCode,
  regexTools,
  replaceRegex,
  testRegex,
  visualizeRegex
} from './regex';

describe('testRegex', () => {
  it('finds global matches with captures and named groups', () => {
    const result = testRegex({
      pattern: '(?<year>\\d{4})-(\\d{2})-(\\d{2})',
      flags: 'g',
      text: 'Created 2026-06-19 and updated 2027-01-02.'
    });

    expect(result).toEqual({
      matched: true,
      matchCount: 2,
      matches: [
        {
          match: '2026-06-19',
          index: 8,
          captures: ['2026', '06', '19'],
          namedGroups: { year: '2026' }
        },
        {
          match: '2027-01-02',
          index: 31,
          captures: ['2027', '01', '02'],
          namedGroups: { year: '2027' }
        }
      ]
    });
  });

  it('supports /pattern/flags input', () => {
    const result = testRegex({
      pattern: '/codex/gi',
      text: 'Codex and codex'
    });

    expect(result.matchCount).toBe(2);
  });

  it('limits match collection', () => {
    const result = testRegex({
      pattern: '\\w+',
      text: 'one two three',
      maxMatches: 2
    });

    expect(result.matches.map((match) => match.match)).toEqual(['one', 'two']);
  });
});

describe('replaceRegex', () => {
  it('replaces matches with capture references', () => {
    const result = replaceRegex({
      pattern: '(\\d{4})-(\\d{2})-(\\d{2})',
      flags: 'g',
      text: '2026-06-19',
      replacement: '$2/$3/$1'
    });

    expect(result).toEqual({
      output: '06/19/2026',
      matchCount: 1
    });
  });

  it('can replace only the first match', () => {
    const result = replaceRegex({
      pattern: 'cat',
      text: 'cat cat cat',
      replacement: 'dog',
      global: false
    });

    expect(result).toEqual({
      output: 'dog cat cat',
      matchCount: 1
    });
  });
});

describe('explainRegex', () => {
  it('explains common regex syntax', () => {
    const result = explainRegex({
      pattern: '^(?<word>\\w+)\\s+\\d{2,4}$',
      flags: 'im'
    });

    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
    expect(result.summary).toContain('anchor');
    expect(result.tokens.map((item) => item.type)).toEqual([
      'anchor',
      'group',
      'escape',
      'quantifier',
      'group',
      'escape',
      'quantifier',
      'escape',
      'quantifier',
      'anchor'
    ]);
  });

  it('explains open-ended range quantifiers', () => {
    const result = explainRegex({
      pattern: '\\w{5,}'
    });

    expect(result.tokens.at(-1)?.description).toBe('Repeat at least 5 times.');
  });

  it('returns invalid output for malformed regex', () => {
    const result = explainRegex({
      pattern: '('
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid regular expression');
  });
});

describe('regexToCode', () => {
  it('generates JavaScript snippets from literal input', () => {
    const result = regexToCode({
      pattern: '/(?<year>\\d{4})/gi',
      language: 'javascript'
    });

    expect(result).toMatchObject({
      language: 'javascript',
      pattern: '(?<year>\\d{4})',
      flags: 'gi',
      warnings: []
    });
    expect(result.code).toContain('new RegExp("(?<year>\\\\d{4})", "gi")');
  });

  it('generates Python snippets and warns about unsupported flags', () => {
    const result = regexToCode({
      pattern: '\\w+',
      flags: 'dgim',
      language: 'python',
      variableName: 'wordRegex',
      textVariableName: 'body'
    });

    expect(result.code).toContain('wordRegex = re.compile');
    expect(result.code).toContain('re.IGNORECASE | re.MULTILINE');
    expect(result.warnings[0]).toContain('d, g');
  });

  it('registers regex.to_code for Web, API, and MCP', () => {
    const tool = regexTools.find((item) => item.name === 'regex.to_code');

    expect(tool?.channels).toEqual(['web', 'api', 'mcp']);
    expect(tool?.risks).toEqual(['local']);
  });
});

describe('visualizeRegex', () => {
  it('builds a graph and mermaid output from regex tokens', () => {
    const result = visualizeRegex({
      pattern: '^(foo|bar)+$',
      maxNodes: 20
    });

    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
    expect(result.nodes[0]).toMatchObject({ id: 'start', label: 'Start' });
    expect(result.nodes.at(-1)).toMatchObject({ id: 'end', label: 'End' });
    expect(result.nodes.some((node) => node.type === 'alternation')).toBe(true);
    expect(result.edges.length).toBe(result.nodes.length - 1);
    expect(result.mermaid).toContain('flowchart LR');
  });

  it('truncates large graphs by maxNodes', () => {
    const result = visualizeRegex({
      pattern: 'abcdef',
      maxNodes: 2
    });

    expect(result.nodes.some((node) => node.id === 'truncated')).toBe(true);
    expect(result.warnings[0]).toContain('truncated');
  });

  it('registers regex.visualize for Web, API, and MCP', () => {
    const tool = regexTools.find((item) => item.name === 'regex.visualize');

    expect(tool?.channels).toEqual(['web', 'api', 'mcp']);
    expect(tool?.risks).toEqual(['local']);
  });
});
