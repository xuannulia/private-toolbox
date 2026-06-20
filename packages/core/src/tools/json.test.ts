import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import {
  compareJson,
  compareJsonDocuments,
  convertJsonToCsv,
  convertJsonToXml,
  escapeJson,
  jsonToQuery,
  jsonToExcel,
  jsonToTypes,
  jsonToYaml,
  jsonTools,
  queryToJson,
  sortJson,
  stringifyJson,
  yamlToJson
} from './json';

describe('jsonToYaml', () => {
  it('converts JSON objects to YAML', () => {
    const result = jsonToYaml({
      text: JSON.stringify({
        service: 'private-toolbox',
        ports: [4317, 5173],
        features: {
          mcp: true,
          httpRequestInMcp: false
        }
      })
    });

    expect(result).toContain('service: private-toolbox');
    expect(result).toContain('ports:');
    expect(result).toContain('  - 4317');
    expect(result).toContain('httpRequestInMcp: false');
  });
});

describe('yamlToJson', () => {
  it('converts YAML to formatted JSON', () => {
    const result = yamlToJson({
      text: `service: private-toolbox
ports:
  - 4317
  - 5173
features:
  mcp: true
  httpRequestInMcp: false
`
    });

    expect(JSON.parse(result)).toEqual({
      service: 'private-toolbox',
      ports: [4317, 5173],
      features: {
        mcp: true,
        httpRequestInMcp: false
      }
    });
    expect(result).toContain('\n  "service": "private-toolbox"');
  });

  it('rejects invalid YAML', () => {
    expect(() => yamlToJson({ text: 'name: [missing' })).toThrow(
      'Flow sequence in block collection must be sufficiently indented'
    );
  });

  it('rejects duplicate keys', () => {
    expect(() => yamlToJson({ text: 'name: Ada\nname: Bob\n' })).toThrow(
      'Map keys must be unique'
    );
  });
});

describe('jsonTools YAML conversion registry', () => {
  it('registers JSON/YAML tools for Web, API, and MCP', () => {
    const jsonToYamlTool = jsonTools.find(
      (tool) => tool.name === 'json.to_yaml'
    );
    const yamlToJsonTool = jsonTools.find(
      (tool) => tool.name === 'yaml.to_json'
    );

    expect(jsonToYamlTool?.channels).toEqual(['web', 'api', 'mcp']);
    expect(yamlToJsonTool?.channels).toEqual(['web', 'api', 'mcp']);
  });
});

describe('jsonToQuery', () => {
  it('converts a JSON object to query parameters', () => {
    const result = jsonToQuery({
      text: JSON.stringify({
        q: 'private toolbox',
        page: 2,
        active: true,
        tags: ['mcp', 'local'],
        user: {
          name: 'Ada'
        }
      }),
      sortKeys: true
    });

    expect(result).toBe(
      'active=true&page=2&q=private+toolbox&tags=mcp&tags=local&user.name=Ada'
    );
  });

  it('supports bracket and comma array formats', () => {
    const text = JSON.stringify({ tags: ['mcp', 'local'] });

    expect(jsonToQuery({ text, arrayFormat: 'bracket' })).toBe(
      'tags%5B%5D=mcp&tags%5B%5D=local'
    );
    expect(jsonToQuery({ text, arrayFormat: 'comma' })).toBe(
      'tags=mcp%2Clocal'
    );
  });

  it('rejects non-object JSON', () => {
    expect(() => jsonToQuery({ text: '[1, 2]' })).toThrow(
      'JSON to query requires a top-level object'
    );
  });
});

describe('queryToJson', () => {
  it('converts query parameters to formatted JSON', () => {
    const result = queryToJson({
      text: '?q=private+toolbox&page=2&active=true&tags=mcp&tags=local&user.name=Ada'
    });

    expect(JSON.parse(result)).toEqual({
      q: 'private toolbox',
      page: 2,
      active: true,
      tags: ['mcp', 'local'],
      user: {
        name: 'Ada'
      }
    });
  });

  it('accepts full URLs and bracket arrays', () => {
    const result = queryToJson({
      text: 'https://example.test/search?tags[]=mcp&tags[]=local&meta=%7B%22ok%22%3Atrue%7D'
    });

    expect(JSON.parse(result)).toEqual({
      tags: ['mcp', 'local'],
      meta: {
        ok: true
      }
    });
  });

  it('can keep values as strings and preserve dotted keys', () => {
    const result = queryToJson({
      text: 'page=2&active=true&user.name=Ada',
      inferTypes: false,
      nestDotKeys: false
    });

    expect(JSON.parse(result)).toEqual({
      page: '2',
      active: 'true',
      'user.name': 'Ada'
    });
  });
});

describe('jsonTools query conversion registry', () => {
  it('registers query conversion tools for Web, API, and MCP', () => {
    const jsonToQueryTool = jsonTools.find(
      (tool) => tool.name === 'json.to_query'
    );
    const queryToJsonTool = jsonTools.find(
      (tool) => tool.name === 'query.to_json'
    );

    expect(jsonToQueryTool?.channels).toEqual(['web', 'api', 'mcp']);
    expect(queryToJsonTool?.channels).toEqual(['web', 'api', 'mcp']);
  });
});

describe('extended JSON tools', () => {
  it('sorts object keys and arrays by a selected key', () => {
    expect(
      sortJson({
        text: '{"zebra":1,"apple":2,"mango":3}',
        mode: 'key',
        order: 'asc'
      })
    ).toBe(`{
  "apple": 2,
  "mango": 3,
  "zebra": 1
}`);

    expect(
      JSON.parse(
        sortJson({
          text: '[{"name":"Charlie"},{"name":"Alice"},{"name":"Bob"}]',
          mode: 'value',
          key: 'name'
        })
      )
    ).toEqual([{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }]);
  });

  it('escapes JSON string values', () => {
    expect(escapeJson({ text: '{"name":"Ada"}' })).toBe(
      '{\\"name\\":\\"Ada\\"}'
    );
    expect(escapeJson({ text: 'line\nbreak', wrapInQuotes: true })).toBe(
      '"line\\nbreak"'
    );
  });

  it('stringifies JSON-like object literals without evaluating code', () => {
    expect(
      stringifyJson({
        text: `{ name: 'Ada', active: true, tags: ['mcp'] }`,
        spacesCount: 2
      })
    ).toBe(`{
  "name": "Ada",
  "active": true,
  "tags": [
    "mcp"
  ]
}`);

    expect(
      stringifyJson({
        text: '{ "html": "<div>" }',
        escapeHtml: true
      })
    ).toContain('&lt;div&gt;');
  });

  it('compares JSON documents with text and structured output', () => {
    expect(compareJson('{"age":30}', '{"age":25}', 'text')).toContain(
      'age: Mismatch: 30 != 25'
    );

    const structured = compareJsonDocuments({
      left: '{"name":"Ada"}',
      right: '{"name":"Ada","role":"admin"}'
    });
    expect(structured.equal).toBe(false);
    expect(structured.differences[0]).toMatchObject({
      path: 'role',
      type: 'missing_left'
    });
  });

  it('converts JSON to CSV', () => {
    expect(
      convertJsonToCsv('[{"name":"Alice","age":30},{"name":"Bob","age":25}]', {
        delimiter: ',',
        includeHeaders: true,
        quoteStrings: 'auto'
      })
    ).toBe('name,age\r\nAlice,30\r\nBob,25');
  });

  it('converts JSON to XLSX bytes', async () => {
    const result = await jsonToExcel({
      text: JSON.stringify([
        {
          id: 1,
          name: 'Alice',
          active: true,
          address: {
            city: 'Paris'
          }
        },
        {
          id: 2,
          name: 'Bob',
          active: false
        }
      ]),
      sheetName: 'Users',
      fileName: 'users',
      format: 'base64'
    });
    const zip = await JSZip.loadAsync(Buffer.from(result.text, 'base64'));
    const worksheet = await zip.file('xl/worksheets/sheet1.xml')?.async('text');
    const workbook = await zip.file('xl/workbook.xml')?.async('text');

    expect(result).toMatchObject({
      fileName: 'users.xlsx',
      sheetName: 'Users',
      rowCount: 2,
      columnCount: 4,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      format: 'base64'
    });
    expect(worksheet).toContain('<dimension ref="A1:D3"/>');
    expect(worksheet).toContain('<t>address.city</t>');
    expect(worksheet).toContain('<v>1</v>');
    expect(worksheet).toContain('<v>0</v>');
    expect(worksheet).toContain('<t>Alice</t>');
    expect(workbook).toContain('name="Users"');
  });

  it('converts JSON to XML', () => {
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

  it('registers extended JSON tools for Web, API, and MCP', () => {
    const names = jsonTools.map((tool) => tool.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'json.sort',
        'json.escape',
        'json.stringify',
        'json.compare',
        'json.to_csv',
        'json.to_excel',
        'json.to_xml'
      ])
    );
    expect(
      jsonTools
        .filter((tool) =>
          [
            'json.sort',
            'json.escape',
            'json.stringify',
            'json.compare',
            'json.to_csv',
            'json.to_excel',
            'json.to_xml'
          ].includes(tool.name)
        )
        .every((tool) => tool.channels.join(',') === 'web,api,mcp')
    ).toBe(true);
  });
});

describe('jsonToTypes', () => {
  const sample = JSON.stringify([
    {
      id: 1,
      name: 'Ada',
      active: true,
      profile: {
        email: 'ada@example.test',
        score: 99.5
      },
      tags: ['math', 'logic']
    },
    {
      id: 2,
      name: 'Grace',
      profile: {
        email: 'grace@example.test'
      }
    }
  ]);

  it('generates TypeScript interfaces with nested types and optional fields', () => {
    const result = jsonToTypes({
      text: sample,
      language: 'typescript',
      rootName: 'user'
    });

    expect(result).toMatchObject({
      language: 'typescript',
      rootName: 'User',
      typeCount: 2
    });
    expect(result.text).toContain('export interface User');
    expect(result.text).toContain('profile: UserProfile;');
    expect(result.text).toContain('tags?: string[];');
    expect(result.text).toContain('export interface UserProfile');
    expect(result.text).toContain('score?: number;');
  });

  it('generates Java, Go, and C# entity shapes', () => {
    expect(
      jsonToTypes({ text: sample, language: 'java', rootName: 'user' }).text
    ).toContain('private UserProfile profile;');

    expect(
      jsonToTypes({ text: sample, language: 'go', rootName: 'user' }).text
    ).toContain('Profile UserProfile `json:"profile"`');

    expect(
      jsonToTypes({ text: sample, language: 'csharp', rootName: 'user' }).text
    ).toContain('public UserProfile Profile { get; set; }');
  });

  it('rejects primitive JSON input', () => {
    expect(() =>
      jsonToTypes({ text: '"hello"', language: 'typescript' })
    ).toThrow('JSON to types requires an object or an array of objects');
  });
});

describe('jsonTools type generation registry', () => {
  it('registers json.to_types for Web, API, and MCP', () => {
    expect(
      jsonTools.find((tool) => tool.name === 'json.to_types')?.channels
    ).toEqual(['web', 'api', 'mcp']);
  });
});
