import { describe, expect, it } from 'vitest';
import { codeTools, formatCode, minifyCode } from './code';

describe('formatCode', () => {
  it('formats JavaScript snippets', async () => {
    const result = await formatCode({
      language: 'javascript',
      text: 'function add(a,b){return a+b}'
    });

    expect(result.language).toBe('javascript');
    expect(result.text).toContain('function add(a, b)');
    expect(result.text).toContain('return a + b;');
  });

  it('formats CSS snippets', async () => {
    const result = await formatCode({
      language: 'css',
      text: '.card{color:red;background:white}'
    });

    expect(result.text).toContain('.card {');
    expect(result.text).toContain('color: red;');
  });

  it('formats HTML snippets', async () => {
    const result = await formatCode({
      language: 'html',
      text: '<main><h1>Hello</h1><p>Toolbox</p></main>'
    });

    expect(result.text).toContain('<main>');
    expect(result.text).toContain('<p>Toolbox</p>');
  });
});

describe('minifyCode', () => {
  it('minifies JavaScript without mangling names', async () => {
    const result = await minifyCode({
      language: 'javascript',
      text: `// comment
function addNumbers(first, second) {
  return first + second;
}`
    });

    expect(result.text).toBe(
      'function addNumbers(first,second){return first+second}'
    );
    expect(result.savedBytes).toBeGreaterThan(0);
  });

  it('minifies CSS and preserves string contents', async () => {
    const result = await minifyCode({
      language: 'css',
      text: `.banner {
  /* comment */
  content: "a  b";
  color: red;
}`
    });

    expect(result.text).toBe('.banner{content:"a  b";color:red}');
    expect(result.resultBytes).toBeLessThan(result.originalBytes);
  });

  it('minifies HTML comments and tag whitespace', async () => {
    const result = await minifyCode({
      language: 'html',
      text: `<main>
  <!-- remove -->
  <h1>Hello</h1>
</main>`
    });

    expect(result.text).toBe('<main><h1>Hello</h1></main>');
  });
});

describe('codeTools registry', () => {
  it('registers code tools for Web, API, and MCP', () => {
    expect(codeTools.map((tool) => tool.name)).toEqual([
      'code.format',
      'code.minify'
    ]);
    expect(codeTools.every((tool) => tool.channels.includes('mcp'))).toBe(true);
  });
});
