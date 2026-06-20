import { describe, expect, it } from 'vitest';
import { runSqlTool } from './service';

describe('runSqlTool', () => {
  it('formats SQL through the shared core tool', async () => {
    const result = await runSqlTool({
      operation: 'format',
      dialect: 'sql',
      keywordCase: 'upper',
      text: 'select id,name from users where id=1'
    });

    expect(result.text).toContain('SELECT');
    expect(result.text).toContain('FROM');
    expect(JSON.parse(result.summary)).toMatchObject({
      dialect: 'sql',
      changed: true
    });
  });

  it('minifies SQL through the shared core tool', async () => {
    const result = await runSqlTool({
      operation: 'minify',
      dialect: 'postgresql',
      text: `-- comment
select id from users where id = $1`
    });

    expect(result.text).toBe('SELECT id FROM users WHERE id = $1');
    expect(JSON.parse(result.summary).savedBytes).toBeGreaterThan(0);
  });
});
