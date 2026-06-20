import { describe, expect, it } from 'vitest';
import {
  buildCodePreviewDocument,
  formatPreviewConsoleMessage
} from './service';

describe('buildCodePreviewDocument', () => {
  it('builds a sandbox preview document', () => {
    const document = buildCodePreviewDocument({
      html: '<button id="run">Run</button>',
      css: 'button { color: red; }',
      javascript: 'console.log("ready");'
    });

    expect(document).toContain('<button id="run">Run</button>');
    expect(document).toContain('button { color: red; }');
    expect(document).toContain('console.log("ready");');
    expect(document).toContain('private-toolbox-code-preview');
  });

  it('escapes closing style and script tags inside user snippets', () => {
    const document = buildCodePreviewDocument({
      html: '',
      css: 'body::before { content: "</style>"; }',
      javascript: 'console.log("</script>");'
    });

    expect(document).toContain('<\\/style>');
    expect(document).toContain('<\\/script>');
  });
});

describe('formatPreviewConsoleMessage', () => {
  it('formats preview console messages', () => {
    expect(formatPreviewConsoleMessage('log', ['a', 1], 3)).toEqual({
      id: 3,
      level: 'log',
      text: 'a 1'
    });
  });

  it('ignores unknown messages', () => {
    expect(formatPreviewConsoleMessage('debug', ['a'], 1)).toBeNull();
    expect(formatPreviewConsoleMessage('log', 'a', 1)).toBeNull();
  });
});
