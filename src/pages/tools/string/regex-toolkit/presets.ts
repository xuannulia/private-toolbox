export type RegexPreset = {
  id: string;
  pattern: string;
  flags: string;
  replacement: string;
  text: string;
};

export const regexPresets = [
  {
    id: 'words',
    pattern: '\\b(?<word>\\w{5,})\\b',
    flags: 'gi',
    replacement: '[$<word>]',
    text: `Codex builds private tools.
Tools should stay concise.`
  },
  {
    id: 'email',
    pattern: '[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}',
    flags: 'gi',
    replacement: '[email]',
    text: 'Contact admin@example.com or support@private-toolbox.local.'
  },
  {
    id: 'url',
    pattern: 'https?:\\/\\/(?:[\\w-]+\\.)+[\\w-]+(?:\\/[\\w./?%&=-]*)?',
    flags: 'gi',
    replacement: '[url]',
    text: 'Docs: https://example.com/docs?tool=regex and http://localhost.test'
  },
  {
    id: 'ipv4',
    pattern:
      '\\b(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\b',
    flags: 'g',
    replacement: '[ip]',
    text: 'Gateway 192.168.1.1, DNS 8.8.8.8, invalid 999.1.1.1.'
  },
  {
    id: 'uuid',
    pattern:
      '\\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\b',
    flags: 'gi',
    replacement: '[uuid]',
    text: 'Request id: 550e8400-e29b-41d4-a716-446655440000.'
  },
  {
    id: 'hexColor',
    pattern: '#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b',
    flags: 'g',
    replacement: '[color]',
    text: 'Theme colors: #2563eb, #fff, #111827cc.'
  },
  {
    id: 'semver',
    pattern:
      '\\b(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?\\b',
    flags: 'g',
    replacement: '[version]',
    text: 'Release 1.4.0, beta 2.0.0-rc.1, build 3.1.0+20260620.'
  },
  {
    id: 'isoDate',
    pattern:
      '\\b\\d{4}-\\d{2}-\\d{2}(?:[T ]\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d{1,3})?)?(?:Z|[+-]\\d{2}:?\\d{2})?)?\\b',
    flags: 'g',
    replacement: '[date]',
    text: 'Created 2026-06-20 and updated 2026-06-20T09:30:00+08:00.'
  },
  {
    id: 'jwt',
    pattern: '\\beyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]*\\b',
    flags: 'g',
    replacement: '[jwt]',
    text: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature'
  },
  {
    id: 'chinese',
    pattern: '[\\u4e00-\\u9fff]+',
    flags: 'g',
    replacement: '[中文]',
    text: 'Private Toolbox 支持中文和 English mixed text.'
  },
  {
    id: 'blankLine',
    pattern: '^\\s*$',
    flags: 'gm',
    replacement: '',
    text: ['line one', '', 'line two', '   ', 'line three'].join('\n')
  }
] as const satisfies readonly RegexPreset[];
