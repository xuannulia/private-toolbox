import { describe, expect, it } from 'vitest';
import {
  changeCsvSeparator,
  csvToJson,
  csvToTsv,
  csvToXml,
  csvToYaml,
  csvTools,
  findIncompleteCsvRecords,
  parseCsvRows,
  transposeCsv,
  tsvToJson
} from './csv';

describe('CSV tools', () => {
  it('parses quoted CSV values and escaped quotes', () => {
    expect(
      parseCsvRows({
        text: '"name","note"\n"Ada","hello, ""world"""'
      })
    ).toEqual([
      ['name', 'note'],
      ['Ada', 'hello, "world"']
    ]);
  });

  it('converts CSV to JSON with headers and dynamic types', () => {
    const result = csvToJson({
      text: 'name,age,active\nAda,37,true\nBob,40,false'
    });

    expect(result.headers).toEqual(['name', 'age', 'active']);
    expect(result.json).toEqual([
      { name: 'Ada', age: 37, active: true },
      { name: 'Bob', age: 40, active: false }
    ]);
    expect(result.text).toContain('"name": "Ada"');
  });

  it('converts TSV to JSON', () => {
    const result = tsvToJson({
      text: 'name\tage\nAda\t37'
    });

    expect(result.json).toEqual([{ name: 'Ada', age: 37 }]);
  });

  it('converts CSV to XML and escapes XML text', () => {
    const result = csvToXml({
      text: 'name,note\nAda,"a < b & c"'
    });

    expect(result.text).toContain('<name>Ada</name>');
    expect(result.text).toContain('<note>a &lt; b &amp; c</note>');
  });

  it('converts CSV to YAML', () => {
    const result = csvToYaml({
      text: 'name,age\nAda,37'
    });

    expect(result.text).toContain('name: Ada');
    expect(result.text).toContain('age: "37"');
  });

  it('converts CSV to TSV and can skip the header', () => {
    const result = csvToTsv({
      text: 'a,b,c\n1,2,3',
      includeHeader: false
    });

    expect(result.text).toBe('1\t2\t3');
  });

  it('changes separators and quotes output when requested', () => {
    const result = changeCsvSeparator({
      text: 'name|age\nAda|37',
      delimiter: '|',
      outputDelimiter: ';',
      quoteAll: true
    });

    expect(result.text).toBe('"name";"age"\n"Ada";"37"');
  });

  it('transposes uneven CSV rows with a fill value', () => {
    const result = transposeCsv({
      text: 'a,b\n1,2,3',
      fillMissing: true,
      fillValue: 'x'
    });

    expect(result.rows).toEqual([
      ['a', '1'],
      ['b', '2'],
      ['x', '3']
    ]);
    expect(result.text).toBe('a,1\nb,2\nx,3');
  });

  it('finds missing columns and empty values', () => {
    const result = findIncompleteCsvRecords({
      text: 'a,b,c\n1,2\n3,,5'
    });

    expect(result.complete).toBe(false);
    expect(result.expectedColumns).toBe(3);
    expect(result.issues).toEqual([
      {
        line: 2,
        title: 'Found missing column(s) on line 2',
        message: 'Line 2 has 1 missing column(s).',
        missingColumns: 1,
        emptyColumns: []
      },
      {
        line: 3,
        title: 'Found missing values on line 3',
        message: 'Empty values on line 3: column 2.',
        missingColumns: 0,
        emptyColumns: [2]
      }
    ]);
  });

  it('exposes planned CSV tools to web, API, and MCP', () => {
    expect(csvTools.map((tool) => tool.name)).toEqual([
      'csv.to_json',
      'tsv.to_json',
      'csv.to_xml',
      'csv.to_yaml',
      'csv.to_tsv',
      'csv.change_separator',
      'csv.transpose',
      'csv.find_incomplete_records'
    ]);
    expect(
      csvTools.every((tool) => tool.channels.join(',') === 'web,api,mcp')
    ).toBe(true);
  });
});
