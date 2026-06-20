import { describe, expect, it } from 'vitest';
import { runCodeTool } from './service';

describe('runCodeTool', () => {
  it('formats code through the shared core tool', async () => {
    const result = await runCodeTool({
      operation: 'format',
      language: 'javascript',
      text: 'const value={name:"toolbox"}'
    });

    expect(result.text).toContain('const value = {');
    expect(JSON.parse(result.summary)).toMatchObject({
      language: 'javascript',
      changed: true
    });
  });

  it('minifies code through the shared core tool', async () => {
    const result = await runCodeTool({
      operation: 'minify',
      language: 'css',
      text: '.box { color: red; }'
    });

    expect(result.text).toBe('.box{color:red}');
    expect(JSON.parse(result.summary).savedBytes).toBeGreaterThan(0);
  });
});
