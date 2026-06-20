import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));

const watchedRoots = [
  'src/pages/tools/network',
  'src/pages/tools/ops',
  'src/pages/tools/json/json-schema-from-json',
  'src/pages/tools/json/json-schema-mock',
  'src/pages/tools/json/json-schema-validator',
  'src/pages/tools/json/json-to-excel',
  'src/pages/tools/json/json-to-query',
  'src/pages/tools/json/json-to-types',
  'src/pages/tools/json/json-to-yaml',
  'src/pages/tools/json/query-to-json',
  'src/pages/tools/json/yaml-to-json',
  'src/pages/tools/string/ascii-banner',
  'src/pages/tools/string/hash',
  'src/pages/tools/string/jwt-inspector',
  'src/pages/tools/string/password-generator',
  'src/pages/tools/string/pem-inspector',
  'src/pages/tools/string/regex-toolkit',
  'src/pages/tools/string/rsa-crypto',
  'src/pages/tools/string/rsa-keypair',
  'src/pages/tools/string/rsa-private-key',
  'src/pages/tools/string/uuid-generator',
  'src/pages/tools/image/generic/barcode',
  'src/pages/tools/image/generic/image-info',
  'src/pages/tools/image/generic/image-to-base64',
  'src/pages/tools/image/generic/image-to-icon',
  'src/pages/tools/image/generic/qr-code',
  'src/pages/tools/image/generic/qr-code-decode'
];

const checks = [
  {
    id: 'legacy-tool-content',
    pattern: /<ToolContent\b/,
    message: 'Use ToolInputAndResult-style focused layouts instead of ToolContent.'
  },
  {
    id: 'visible-tool-info',
    pattern: /\btoolInfo\s*=/,
    message: 'Avoid always-visible explanatory toolInfo blocks in focused tools.'
  },
  {
    id: 'example-cards',
    pattern: /\bexampleCards\s*=/,
    message: 'Keep examples out of the primary tool surface.'
  },
  {
    id: 'repeated-page-input-header',
    pattern: /InputHeader\s+title=\{title\}/,
    message: 'Do not repeat the page title inside the input section.'
  },
  {
    id: 'repeated-page-title-prop',
    pattern: /\btitle=\{title\}/,
    message: 'Use a local input/result title instead of passing the page title down.'
  },
  {
    id: 'oversized-local-title',
    pattern: /(?:fontSize=\{?30|fontSize=\{?2[4-9]|variant="h[1-4])/,
    message: 'Reserve large type for page headers, not tool panels.'
  }
];

const listFiles = (dir) => {
  const files = [];

  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      files.push(...listFiles(path));
    } else if (path.endsWith('.tsx')) {
      files.push(path);
    }
  }

  return files;
};

const toLine = (text, index) => text.slice(0, index).split('\n').length;

const watchedFiles = watchedRoots
  .map((root) => resolve(rootDir, root))
  .filter((path) => existsSync(path))
  .flatMap(listFiles)
  .sort((left, right) => left.localeCompare(right));

const issues = [];

for (const file of watchedFiles) {
  const text = readFileSync(file, 'utf-8');

  for (const check of checks) {
    const match = check.pattern.exec(text);
    if (!match) continue;

    issues.push({
      file: relative(rootDir, file),
      line: toLine(text, match.index),
      check: check.id,
      message: check.message
    });
  }
}

if (issues.length > 0) {
  console.error(JSON.stringify({ ok: false, issues }, null, 2));
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        ok: true,
        files: watchedFiles.length,
        checks: checks.map((check) => check.id),
        roots: watchedRoots.length
      },
      null,
      2
    )
  );
}
