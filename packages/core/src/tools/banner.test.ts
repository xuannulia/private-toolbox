import { describe, expect, it } from 'vitest';
import { generateAsciiBanner } from './banner';

describe('generateAsciiBanner', () => {
  it('generates a block banner for latin text', () => {
    const result = generateAsciiBanner({
      text: 'Good',
      fillCharacter: '#'
    });

    expect(result.font).toBe('block');
    expect(result.height).toBe(7);
    expect(result.output).toContain('###');
    expect(result.fallbackCharacters).toEqual([]);
  });

  it('supports source code comment wrappers', () => {
    const result = generateAsciiBanner({
      text: 'API',
      commentStyle: 'slash',
      font: 'compact'
    });

    expect(result.lines).toHaveLength(5);
    expect(
      result.output.split('\n').every((line) => line.startsWith('// '))
    ).toBe(true);
  });

  it('generates runnable JavaScript snippets', () => {
    const result = generateAsciiBanner({
      text: 'OK',
      outputMode: 'javascript',
      font: 'compact'
    });

    expect(result.outputMode).toBe('javascript');
    expect(result.output).toContain('const banner = ');
    expect(result.output).toContain('console.log(banner);');
    expect(result.bannerOutput).toContain('#');
    expect(result.lines[0]).toContain('const banner');
  });

  it('generates shell snippets with a heredoc wrapper', () => {
    const result = generateAsciiBanner({
      text: 'OK',
      outputMode: 'shell',
      font: 'compact'
    });

    expect(result.output).toContain("cat <<'PRIVATE_TOOLBOX_BANNER'");
    expect(result.output.endsWith('PRIVATE_TOOLBOX_BANNER')).toBe(true);
  });

  it('wraps text output with ANSI color codes', () => {
    const result = generateAsciiBanner({
      text: 'OK',
      font: 'compact',
      ansiColor: 'cyan'
    });

    expect(result.ansiColor).toBe('cyan');
    expect(result.output.startsWith('\u001b[36m')).toBe(true);
    expect(result.output.endsWith('\u001b[0m')).toBe(true);
    expect(result.bannerOutput).not.toContain('\u001b');
  });

  it('emits ANSI color codes inside runnable snippets', () => {
    const result = generateAsciiBanner({
      text: 'OK',
      outputMode: 'javascript',
      ansiColor: 'green'
    });

    expect(result.output).toContain('\\u001b[32m');
    expect(result.output).toContain('\\u001b[0m');
  });

  it('keeps wide characters readable with fallback cells', () => {
    const result = generateAsciiBanner({
      text: '你好',
      fillCharacter: '*',
      emptyCharacter: ' '
    });

    expect(result.output).toContain('你');
    expect(result.output).toContain('好');
    expect(result.fallbackCharacters).toEqual(['你', '好']);
  });

  it('rejects empty input', () => {
    expect(() => generateAsciiBanner({ text: '   ' })).toThrow(
      'text is required'
    );
  });

  it('rejects unsupported ANSI colors', () => {
    expect(() =>
      generateAsciiBanner({
        text: 'OK',
        ansiColor: 'orange' as never
      })
    ).toThrow('ansiColor is not supported');
  });
});
