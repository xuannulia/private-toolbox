import { describe, expect, it } from 'vitest';
import { formatSql, minifySql, sqlTools } from './sql';

describe('formatSql', () => {
  it('formats generic SQL and uppercases keywords by default', async () => {
    const result = await formatSql({
      text: 'select id,name from users where active=1 order by created_at desc'
    });

    expect(result.dialect).toBe('sql');
    expect(result.text).toContain('SELECT');
    expect(result.text).toContain('FROM');
    expect(result.text).toContain('ORDER BY');
    expect(result.text).toContain('  id,');
  });

  it('supports dialect and keyword case options', async () => {
    const result = await formatSql({
      dialect: 'postgresql',
      keywordCase: 'lower',
      text: 'SELECT id FROM users WHERE id = $1'
    });

    expect(result.dialect).toBe('postgresql');
    expect(result.text).toContain('select');
    expect(result.text).toContain('$1');
  });
});

describe('minifySql', () => {
  it('removes comments and compacts whitespace', async () => {
    const result = await minifySql({
      text: `-- list users
select
  id,
  name
from users
where active = 1`
    });

    expect(result.text).toBe('SELECT id,name FROM users WHERE active = 1');
    expect(result.savedBytes).toBeGreaterThan(0);
  });

  it('preserves strings and quoted identifiers', async () => {
    const result = await minifySql({
      dialect: 'postgresql',
      text: `select '-- not a comment' as note, "User Name" from "Users"`
    });

    expect(result.text).toContain("'-- not a comment'");
    expect(result.text).toContain('"User Name"');
  });

  it('preserves postgres dollar quoted strings', async () => {
    const result = await minifySql({
      dialect: 'postgresql',
      text: `select $$a
-- not a comment
b$$ as body`
    });

    expect(result.text).toContain('$$a\n-- not a comment\nb$$');
  });
});

describe('sqlTools registry', () => {
  it('registers SQL tools for Web, API, and MCP', () => {
    expect(sqlTools.map((tool) => tool.name)).toEqual([
      'sql.format',
      'sql.minify'
    ]);
    expect(sqlTools.every((tool) => tool.channels.includes('mcp'))).toBe(true);
  });
});
