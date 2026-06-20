export type CodePreviewInput = {
  html: string;
  css: string;
  javascript: string;
};

export type PreviewConsoleLevel = 'log' | 'info' | 'warn' | 'error';

export type PreviewConsoleMessage = {
  id: number;
  level: PreviewConsoleLevel;
  text: string;
};

const escapeClosingTag = (text: string, tag: 'script' | 'style'): string =>
  text.replace(new RegExp(`</${tag}`, 'gi'), `<\\/${tag}`);

const consoleBridgeScript = `
(() => {
  const formatValue = (value) => {
    if (typeof value === 'string') return value;
    if (value instanceof Error) return value.stack || value.message;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };
  const send = (level, values) => {
    parent.postMessage({
      source: 'private-toolbox-code-preview',
      level,
      values: Array.from(values).map(formatValue)
    }, '*');
  };
  ['log', 'info', 'warn', 'error'].forEach((level) => {
    const original = console[level];
    console[level] = (...values) => {
      send(level, values);
      original.apply(console, values);
    };
  });
  window.addEventListener('error', (event) => {
    send('error', [event.message]);
  });
  window.addEventListener('unhandledrejection', (event) => {
    send('error', [event.reason]);
  });
})();
`;

export const buildCodePreviewDocument = ({
  html,
  css,
  javascript
}: CodePreviewInput): string => `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    html, body {
      margin: 0;
      min-height: 100%;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body {
      padding: 16px;
      box-sizing: border-box;
    }
    ${escapeClosingTag(css, 'style')}
  </style>
</head>
<body>
${html}
<script>${escapeClosingTag(consoleBridgeScript, 'script')}</script>
<script>${escapeClosingTag(javascript, 'script')}</script>
</body>
</html>`;

export const formatPreviewConsoleMessage = (
  level: unknown,
  values: unknown,
  id: number
): PreviewConsoleMessage | null => {
  if (!['log', 'info', 'warn', 'error'].includes(String(level))) return null;
  if (!Array.isArray(values)) return null;

  return {
    id,
    level: level as PreviewConsoleLevel,
    text: values.map((value) => String(value)).join(' ')
  };
};
