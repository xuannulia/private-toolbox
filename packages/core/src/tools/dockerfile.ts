import {
  type JsonValue,
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type DockerfileIssueSeverity = 'error' | 'warning' | 'info';

export type DockerfileIssue = {
  severity: DockerfileIssueSeverity;
  path: string;
  message: string;
  line: number | null;
  column: number | null;
};

export type DockerfileFormatInput = {
  content: string;
  indent?: number;
};

export type DockerfileStage = {
  index: number;
  name: string | null;
  baseImage: string;
  line: number;
};

export type DockerfileFormatOutput = {
  output: string;
  changed: boolean;
  valid: boolean;
  issues: DockerfileIssue[];
  instructionCount: number;
  stageCount: number;
  stages: DockerfileStage[];
  baseImages: string[];
  exposedPorts: string[];
  workdirs: string[];
  users: string[];
};

export type DockerfileSnippetKind =
  | 'node_app'
  | 'python_app'
  | 'go_app'
  | 'static_nginx';

export type DockerfilePackageManager =
  | 'npm'
  | 'pnpm'
  | 'yarn'
  | 'pip'
  | 'poetry';

export type DockerfileSnippetInput = {
  kind: DockerfileSnippetKind;
  packageManager?: DockerfilePackageManager;
  baseImage?: string;
  runtimeImage?: string;
  workdir?: string;
  port?: number;
  pythonModule?: string;
  includeHealthcheck?: boolean;
  useNonRootUser?: boolean;
};

export type DockerfileSnippetOutput = {
  output: string;
  kind: DockerfileSnippetKind;
  baseImages: string[];
  exposedPort: number | null;
  notes: string[];
  dockerignore: string[];
};

type DockerfilePhysicalLine = {
  text: string;
  line: number;
};

type DockerfileInstructionUnit = {
  kind: 'instruction';
  keyword: string;
  lines: DockerfilePhysicalLine[];
  startLine: number;
  startColumn: number;
};

type DockerfilePassthroughUnit = {
  kind: 'blank' | 'comment';
  text: string;
};

type DockerfileUnit = DockerfileInstructionUnit | DockerfilePassthroughUnit;

const maxDockerfileBytes = 500_000;
const dockerfileInstructions = new Set([
  'ADD',
  'ARG',
  'CMD',
  'COPY',
  'ENTRYPOINT',
  'ENV',
  'EXPOSE',
  'FROM',
  'HEALTHCHECK',
  'LABEL',
  'MAINTAINER',
  'ONBUILD',
  'RUN',
  'SHELL',
  'STOPSIGNAL',
  'USER',
  'VOLUME',
  'WORKDIR'
]);

const inputSchema = {
  type: 'object',
  required: ['content'],
  additionalProperties: false,
  properties: {
    content: { type: 'string' },
    indent: { type: 'integer', minimum: 2, maximum: 8, default: 4 }
  }
} as const;

const snippetInputSchema = {
  type: 'object',
  required: ['kind'],
  additionalProperties: false,
  properties: {
    kind: { enum: ['node_app', 'python_app', 'go_app', 'static_nginx'] },
    packageManager: { enum: ['npm', 'pnpm', 'yarn', 'pip', 'poetry'] },
    baseImage: { type: 'string' },
    runtimeImage: { type: 'string' },
    workdir: { type: 'string' },
    port: { type: 'integer', minimum: 1, maximum: 65535 },
    pythonModule: { type: 'string' },
    includeHealthcheck: { type: 'boolean' },
    useNonRootUser: { type: 'boolean' }
  }
} as const;

const issueSchema = {
  type: 'object',
  required: ['severity', 'path', 'message', 'line', 'column'],
  additionalProperties: false,
  properties: {
    severity: { enum: ['error', 'warning', 'info'] },
    path: { type: 'string' },
    message: { type: 'string' },
    line: { type: ['integer', 'null'] },
    column: { type: ['integer', 'null'] }
  }
} as const;

const stageSchema = {
  type: 'object',
  required: ['index', 'name', 'baseImage', 'line'],
  additionalProperties: false,
  properties: {
    index: { type: 'integer' },
    name: { type: ['string', 'null'] },
    baseImage: { type: 'string' },
    line: { type: 'integer' }
  }
} as const;

const outputSchema = {
  type: 'object',
  required: [
    'output',
    'changed',
    'valid',
    'issues',
    'instructionCount',
    'stageCount',
    'stages',
    'baseImages',
    'exposedPorts',
    'workdirs',
    'users'
  ],
  additionalProperties: false,
  properties: {
    output: { type: 'string' },
    changed: { type: 'boolean' },
    valid: { type: 'boolean' },
    issues: { type: 'array', items: issueSchema },
    instructionCount: { type: 'integer' },
    stageCount: { type: 'integer' },
    stages: { type: 'array', items: stageSchema },
    baseImages: { type: 'array', items: { type: 'string' } },
    exposedPorts: { type: 'array', items: { type: 'string' } },
    workdirs: { type: 'array', items: { type: 'string' } },
    users: { type: 'array', items: { type: 'string' } }
  }
} as const;

const snippetOutputSchema = {
  type: 'object',
  required: [
    'output',
    'kind',
    'baseImages',
    'exposedPort',
    'notes',
    'dockerignore'
  ],
  additionalProperties: false,
  properties: {
    output: { type: 'string' },
    kind: { enum: ['node_app', 'python_app', 'go_app', 'static_nginx'] },
    baseImages: { type: 'array', items: { type: 'string' } },
    exposedPort: { type: ['integer', 'null'] },
    notes: { type: 'array', items: { type: 'string' } },
    dockerignore: { type: 'array', items: { type: 'string' } }
  }
} as const;

const snippetKinds = new Set<DockerfileSnippetKind>([
  'node_app',
  'python_app',
  'go_app',
  'static_nginx'
]);
const packageManagers = new Set<DockerfilePackageManager>([
  'npm',
  'pnpm',
  'yarn',
  'pip',
  'poetry'
]);
const safeImagePattern =
  /^[A-Za-z0-9][A-Za-z0-9._/-]*(?::[A-Za-z0-9._-]+)?(?:@[A-Za-z0-9_+.-]+:[A-Za-z0-9_=+./-]+)?$/;
const safePathPattern = /^\/[A-Za-z0-9._~@%+/-]*$/;
const pythonModulePattern =
  /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*:[A-Za-z_][A-Za-z0-9_]*$/;

const normalizeContent = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new ToolboxError(
      'INVALID_DOCKERFILE_INPUT',
      'content must be a string'
    );
  }

  if (!value.trim()) {
    throw new ToolboxError('INVALID_DOCKERFILE_INPUT', 'content is required');
  }

  if (new TextEncoder().encode(value).byteLength > maxDockerfileBytes) {
    throw new ToolboxError(
      'DOCKERFILE_INPUT_TOO_LARGE',
      `content is too large; maximum size is ${maxDockerfileBytes} bytes`
    );
  }

  return value.replace(/\r\n?/g, '\n');
};

const normalizeIndent = (value: unknown): number => {
  if (value === undefined) return 4;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 2 ||
    value > 8
  ) {
    throw new ToolboxError(
      'INVALID_DOCKERFILE_INPUT',
      'indent must be an integer from 2 to 8'
    );
  }

  return value;
};

const normalizeSnippetKind = (value: unknown): DockerfileSnippetKind => {
  if (
    typeof value !== 'string' ||
    !snippetKinds.has(value as DockerfileSnippetKind)
  ) {
    throw new ToolboxError('INVALID_DOCKERFILE_INPUT', 'kind is not supported');
  }

  return value as DockerfileSnippetKind;
};

const normalizePackageManager = (
  value: unknown,
  fallback: DockerfilePackageManager,
  allowed: DockerfilePackageManager[]
): DockerfilePackageManager => {
  if (value === undefined) return fallback;
  if (
    typeof value !== 'string' ||
    !packageManagers.has(value as DockerfilePackageManager) ||
    !allowed.includes(value as DockerfilePackageManager)
  ) {
    throw new ToolboxError(
      'INVALID_DOCKERFILE_INPUT',
      'packageManager is not supported for this snippet'
    );
  }

  return value as DockerfilePackageManager;
};

const normalizeSnippetText = (
  value: unknown,
  fallback: string,
  fieldName: string,
  pattern: RegExp
): string => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') {
    throw new ToolboxError(
      'INVALID_DOCKERFILE_INPUT',
      `${fieldName} must be a string`
    );
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 300 || !pattern.test(trimmed)) {
    throw new ToolboxError(
      'INVALID_DOCKERFILE_INPUT',
      `${fieldName} is not valid`
    );
  }

  return trimmed;
};

const normalizePort = (value: unknown, fallback: number): number => {
  if (value === undefined) return fallback;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 65535
  ) {
    throw new ToolboxError(
      'INVALID_DOCKERFILE_INPUT',
      'port must be an integer from 1 to 65535'
    );
  }

  return value;
};

const boolOrDefault = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const makeIssue = (
  severity: DockerfileIssueSeverity,
  path: string,
  message: string,
  line: number | null = null,
  column: number | null = null
): DockerfileIssue => ({
  severity,
  path,
  message,
  line,
  column
});

const detectEscapeCharacter = (lines: string[]): '\\' | '`' => {
  for (const line of lines) {
    if (!line.trim()) continue;
    const match = line.match(/^\s*#\s*escape\s*=\s*([`\\])\s*$/i);
    if (match) return match[1] as '\\' | '`';
    if (!line.trimStart().startsWith('#')) break;
  }

  return '\\';
};

const countTrailing = (value: string, character: string): number => {
  let count = 0;

  for (let index = value.length - 1; index >= 0; index -= 1) {
    if (value[index] !== character) break;
    count += 1;
  }

  return count;
};

const hasContinuation = (
  line: string,
  escapeCharacter: '\\' | '`'
): boolean => {
  const trimmed = line.trimEnd();
  if (!trimmed.endsWith(escapeCharacter)) return false;
  return countTrailing(trimmed, escapeCharacter) % 2 === 1;
};

const stripContinuation = (
  line: string,
  escapeCharacter: '\\' | '`'
): string => {
  const trimmed = line.trimEnd();
  return hasContinuation(trimmed, escapeCharacter)
    ? trimmed.slice(0, -1).trimEnd()
    : trimmed;
};

const parseInstructionStart = (
  line: string
): { keyword: string; column: number } | null => {
  const match = line.match(/^(\s*)([A-Za-z][A-Za-z0-9_-]*)\b/);
  if (!match) return null;

  return {
    keyword: match[2],
    column: match[1].length + 1
  };
};

const splitDockerfileUnits = (
  content: string,
  escapeCharacter: '\\' | '`'
): DockerfileUnit[] => {
  const lines = content.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  const units: DockerfileUnit[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const text = lines[index];
    const trimmed = text.trim();

    if (!trimmed) {
      units.push({ kind: 'blank', text: '' });
      continue;
    }

    if (trimmed.startsWith('#')) {
      units.push({ kind: 'comment', text: text.trimEnd() });
      continue;
    }

    const start = parseInstructionStart(text);
    if (!start) {
      units.push({ kind: 'comment', text: text.trimEnd() });
      continue;
    }

    const instructionLines: DockerfilePhysicalLine[] = [
      {
        text,
        line: index + 1
      }
    ];

    while (
      index + 1 < lines.length &&
      hasContinuation(
        instructionLines[instructionLines.length - 1].text,
        escapeCharacter
      )
    ) {
      index += 1;
      instructionLines.push({
        text: lines[index],
        line: index + 1
      });
    }

    units.push({
      kind: 'instruction',
      keyword: start.keyword,
      lines: instructionLines,
      startLine: instructionLines[0].line,
      startColumn: start.column
    });
  }

  return units;
};

const stripInstructionKeyword = (line: string): string =>
  line.replace(/^\s*[A-Za-z][A-Za-z0-9_-]*\b\s*/, '');

const normalizeInstructionParts = (
  unit: DockerfileInstructionUnit,
  escapeCharacter: '\\' | '`'
): string[] =>
  unit.lines.map((line, index) => {
    const content =
      index === 0 ? stripInstructionKeyword(line.text) : line.text;
    return stripContinuation(content, escapeCharacter).trim();
  });

const formatInstruction = (
  unit: DockerfileInstructionUnit,
  indent: number,
  escapeCharacter: '\\' | '`'
): string[] => {
  const keyword = unit.keyword.toUpperCase();
  const parts = normalizeInstructionParts(unit, escapeCharacter);

  if (parts.length === 1) {
    return [parts[0] ? `${keyword} ${parts[0]}` : keyword];
  }

  return parts.map((part, index) => {
    const prefix = index === 0 ? `${keyword} ` : ' '.repeat(indent);
    const suffix = index < parts.length - 1 ? ` ${escapeCharacter}` : '';
    return `${prefix}${part}${suffix}`.trimEnd();
  });
};

const splitShellWords = (value: string): string[] => {
  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item));
      }
    } catch {
      return [trimmed];
    }
  }

  const words: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (const character of trimmed) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      current += character;
      continue;
    }

    if ((character === '"' || character === "'") && quote === null) {
      quote = character;
      current += character;
      continue;
    }

    if (quote === character) {
      quote = null;
      current += character;
      continue;
    }

    if (!quote && /\s/.test(character)) {
      if (current) {
        words.push(current);
        current = '';
      }
      continue;
    }

    current += character;
  }

  if (current) words.push(current);
  return words;
};

const removeLeadingOptions = (words: string[]): string[] => {
  let index = 0;

  while (index < words.length && words[index].startsWith('--')) {
    index += 1;
  }

  return words.slice(index);
};

const makePath = (keyword: string, index: number): string =>
  `$.instructions[${index}].${keyword.toLowerCase()}`;

const validateInstruction = ({
  keyword,
  args,
  instructionIndex,
  unit,
  issues,
  stages,
  baseImages,
  exposedPorts,
  workdirs,
  users
}: {
  keyword: string;
  args: string[];
  instructionIndex: number;
  unit: DockerfileInstructionUnit;
  issues: DockerfileIssue[];
  stages: DockerfileStage[];
  baseImages: string[];
  exposedPorts: string[];
  workdirs: string[];
  users: string[];
}) => {
  const path = makePath(keyword, instructionIndex);

  if (!dockerfileInstructions.has(keyword)) {
    issues.push(
      makeIssue(
        'warning',
        path,
        `Unknown Dockerfile instruction: ${keyword}`,
        unit.startLine,
        unit.startColumn
      )
    );
    return;
  }

  if (keyword === 'FROM') {
    const fromArgs = removeLeadingOptions(args);
    const baseImage = fromArgs[0];

    if (!baseImage) {
      issues.push(
        makeIssue(
          'error',
          path,
          'FROM requires a base image.',
          unit.startLine,
          unit.startColumn
        )
      );
      return;
    }

    const asIndex = fromArgs.findIndex((word) => word.toUpperCase() === 'AS');
    const name = asIndex >= 0 ? fromArgs[asIndex + 1] ?? null : null;

    stages.push({
      index: stages.length + 1,
      name,
      baseImage,
      line: unit.startLine
    });
    baseImages.push(baseImage);
    return;
  }

  if (
    ['RUN', 'CMD', 'ENTRYPOINT', 'WORKDIR', 'USER', 'EXPOSE'].includes(
      keyword
    ) &&
    args.length === 0
  ) {
    issues.push(
      makeIssue(
        'error',
        path,
        `${keyword} requires at least one argument.`,
        unit.startLine,
        unit.startColumn
      )
    );
  }

  if (keyword === 'COPY' || keyword === 'ADD') {
    const copyArgs = removeLeadingOptions(args);
    if (copyArgs.length < 2) {
      issues.push(
        makeIssue(
          'error',
          path,
          `${keyword} requires at least one source and a destination.`,
          unit.startLine,
          unit.startColumn
        )
      );
    }
  }

  if (keyword === 'ENV') {
    const hasKeyValue = args.some((arg) => arg.includes('='));
    if (args.length === 0 || (!hasKeyValue && args.length < 2)) {
      issues.push(
        makeIssue(
          'error',
          path,
          'ENV requires key=value or key value arguments.',
          unit.startLine,
          unit.startColumn
        )
      );
    }
  }

  if (keyword === 'EXPOSE') {
    exposedPorts.push(...args);
  }

  if (keyword === 'WORKDIR' && args[0]) {
    workdirs.push(args[0]);
  }

  if (keyword === 'USER' && args[0]) {
    users.push(args[0]);
  }
};

export const formatDockerfile = (
  input: DockerfileFormatInput
): DockerfileFormatOutput => {
  const content = normalizeContent(input.content);
  const indent = normalizeIndent(input.indent);
  const escapeCharacter = detectEscapeCharacter(content.split('\n'));
  const units = splitDockerfileUnits(content, escapeCharacter);
  const issues: DockerfileIssue[] = [];
  const outputLines: string[] = [];
  const stages: DockerfileStage[] = [];
  const baseImages: string[] = [];
  const exposedPorts: string[] = [];
  const workdirs: string[] = [];
  const users: string[] = [];
  let instructionCount = 0;

  for (const unit of units) {
    if (unit.kind !== 'instruction') {
      outputLines.push(unit.text);
      continue;
    }

    instructionCount += 1;
    const keyword = unit.keyword.toUpperCase();
    const formatted = formatInstruction(unit, indent, escapeCharacter);
    const args = splitShellWords(
      normalizeInstructionParts(unit, escapeCharacter).join(' ')
    );

    validateInstruction({
      keyword,
      args,
      instructionIndex: instructionCount,
      unit,
      issues,
      stages,
      baseImages,
      exposedPorts,
      workdirs,
      users
    });
    outputLines.push(...formatted);
  }

  if (stages.length === 0) {
    issues.push(
      makeIssue(
        'error',
        '$',
        'Dockerfile must contain at least one FROM instruction.'
      )
    );
  }

  const output = `${outputLines.join('\n')}${
    outputLines.length > 0 ? '\n' : ''
  }`;

  return {
    output,
    changed: output !== content,
    valid: !issues.some((issue) => issue.severity === 'error'),
    issues,
    instructionCount,
    stageCount: stages.length,
    stages,
    baseImages,
    exposedPorts,
    workdirs,
    users
  };
};

const nodeInstallCommand = (
  packageManager: DockerfilePackageManager
): string => {
  switch (packageManager) {
    case 'pnpm':
      return 'RUN corepack enable && pnpm install --frozen-lockfile';
    case 'yarn':
      return 'RUN corepack enable && yarn install --frozen-lockfile';
    case 'npm':
    default:
      return 'RUN npm ci';
  }
};

const nodeBuildCommand = (packageManager: DockerfilePackageManager): string => {
  switch (packageManager) {
    case 'pnpm':
      return 'RUN pnpm build';
    case 'yarn':
      return 'RUN yarn build';
    case 'npm':
    default:
      return 'RUN npm run build';
  }
};

const nodeStartCommand = (packageManager: DockerfilePackageManager): string => {
  switch (packageManager) {
    case 'pnpm':
      return 'CMD ["pnpm", "start"]';
    case 'yarn':
      return 'CMD ["yarn", "start"]';
    case 'npm':
    default:
      return 'CMD ["npm", "start"]';
  }
};

const makeNodeSnippet = (options: {
  packageManager: DockerfilePackageManager;
  baseImage: string;
  runtimeImage: string;
  workdir: string;
  port: number;
  includeHealthcheck: boolean;
  useNonRootUser: boolean;
}): DockerfileSnippetOutput => {
  const lines = [
    '# syntax=docker/dockerfile:1',
    `FROM ${options.baseImage} AS deps`,
    `WORKDIR ${options.workdir}`,
    'COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./',
    nodeInstallCommand(options.packageManager),
    '',
    `FROM ${options.baseImage} AS build`,
    `WORKDIR ${options.workdir}`,
    `COPY --from=deps ${options.workdir}/node_modules ./node_modules`,
    'COPY . .',
    nodeBuildCommand(options.packageManager),
    '',
    `FROM ${options.runtimeImage} AS runtime`,
    'ENV NODE_ENV=production',
    `WORKDIR ${options.workdir}`,
    `COPY --from=deps ${options.workdir}/node_modules ./node_modules`,
    `COPY --from=build ${options.workdir}/dist ./dist`,
    'COPY package.json ./',
    `EXPOSE ${options.port}`
  ];

  if (options.packageManager !== 'npm') {
    lines.push('RUN corepack enable');
  }

  if (options.useNonRootUser) {
    lines.push('USER node');
  }

  if (options.includeHealthcheck) {
    lines.push(
      `HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:${options.port}/health || exit 1`
    );
  }

  lines.push(nodeStartCommand(options.packageManager));

  return {
    output: `${lines.join('\n')}\n`,
    kind: 'node_app',
    baseImages: [options.baseImage, options.runtimeImage],
    exposedPort: options.port,
    notes: [
      'Assumes the app builds into /app/dist and exposes an npm-compatible start script.',
      'Review COPY paths if your project uses a different build output.'
    ],
    dockerignore: ['node_modules', 'dist', '.git', '.env*', 'npm-debug.log*']
  };
};

const makePythonSnippet = (options: {
  packageManager: DockerfilePackageManager;
  baseImage: string;
  workdir: string;
  port: number;
  pythonModule: string;
  includeHealthcheck: boolean;
  useNonRootUser: boolean;
}): DockerfileSnippetOutput => {
  const installLines =
    options.packageManager === 'poetry'
      ? [
          'RUN pip install --no-cache-dir poetry',
          'COPY pyproject.toml poetry.lock* ./',
          'RUN poetry config virtualenvs.create false && poetry install --only main --no-interaction --no-ansi'
        ]
      : [
          'COPY requirements.txt ./',
          'RUN pip install --no-cache-dir -r requirements.txt'
        ];
  const lines = [
    '# syntax=docker/dockerfile:1',
    `FROM ${options.baseImage}`,
    'ENV PYTHONDONTWRITEBYTECODE=1',
    'ENV PYTHONUNBUFFERED=1',
    `WORKDIR ${options.workdir}`,
    ...installLines,
    'COPY . .',
    `EXPOSE ${options.port}`
  ];

  if (options.useNonRootUser) {
    lines.push(
      `RUN adduser --disabled-password --gecos "" appuser && chown -R appuser:appuser ${options.workdir}`
    );
    lines.push('USER appuser');
  }

  if (options.includeHealthcheck) {
    lines.push(
      `HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:${options.port}/health')" || exit 1`
    );
  }

  lines.push(
    `CMD ["uvicorn", "${options.pythonModule}", "--host", "0.0.0.0", "--port", "${options.port}"]`
  );

  return {
    output: `${lines.join('\n')}\n`,
    kind: 'python_app',
    baseImages: [options.baseImage],
    exposedPort: options.port,
    notes: [
      'Assumes an ASGI app served by uvicorn.',
      'Add uvicorn to requirements.txt or pyproject.toml if it is not already present.'
    ],
    dockerignore: ['__pycache__', '.venv', '.git', '.env*', '.pytest_cache']
  };
};

const makeGoSnippet = (options: {
  baseImage: string;
  runtimeImage: string;
  workdir: string;
  port: number;
  includeHealthcheck: boolean;
  useNonRootUser: boolean;
}): DockerfileSnippetOutput => {
  const lines = [
    '# syntax=docker/dockerfile:1',
    `FROM ${options.baseImage} AS build`,
    `WORKDIR ${options.workdir}`,
    'COPY go.mod go.sum* ./',
    'RUN go mod download',
    'COPY . .',
    'RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/app ./...',
    '',
    `FROM ${options.runtimeImage}`,
    'WORKDIR /app',
    'COPY --from=build /out/app /app/app',
    `EXPOSE ${options.port}`
  ];

  if (options.useNonRootUser) {
    lines.push('USER 65532:65532');
  }

  if (options.includeHealthcheck) {
    lines.push(
      `HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:${options.port}/health || exit 1`
    );
  }

  lines.push('ENTRYPOINT ["/app/app"]');

  return {
    output: `${lines.join('\n')}\n`,
    kind: 'go_app',
    baseImages: [options.baseImage, options.runtimeImage],
    exposedPort: options.port,
    notes: [
      'The build command targets ./...; adjust it if your main package is in a subdirectory.'
    ],
    dockerignore: ['bin', 'dist', '.git', '.env*', '*.test']
  };
};

const makeStaticNginxSnippet = (options: {
  baseImage: string;
  runtimeImage: string;
}): DockerfileSnippetOutput => {
  const lines = [
    '# syntax=docker/dockerfile:1',
    `FROM ${options.baseImage} AS build`,
    'WORKDIR /app',
    'COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./',
    'RUN npm ci',
    'COPY . .',
    'RUN npm run build',
    '',
    `FROM ${options.runtimeImage}`,
    'COPY --from=build /app/dist /usr/share/nginx/html',
    'EXPOSE 80'
  ];

  return {
    output: `${lines.join('\n')}\n`,
    kind: 'static_nginx',
    baseImages: [options.baseImage, options.runtimeImage],
    exposedPort: 80,
    notes: [
      'Assumes a frontend build output at /app/dist.',
      'Pair with the Nginx SPA snippet if the app uses client-side routing.'
    ],
    dockerignore: ['node_modules', 'dist', '.git', '.env*']
  };
};

export const generateDockerfileSnippet = (
  input: DockerfileSnippetInput
): DockerfileSnippetOutput => {
  const kind = normalizeSnippetKind(input.kind);
  const workdir = normalizeSnippetText(
    input.workdir,
    '/app',
    'workdir',
    safePathPattern
  );
  const includeHealthcheck = boolOrDefault(input.includeHealthcheck, false);
  const useNonRootUser = boolOrDefault(input.useNonRootUser, true);

  if (kind === 'node_app') {
    return makeNodeSnippet({
      packageManager: normalizePackageManager(input.packageManager, 'npm', [
        'npm',
        'pnpm',
        'yarn'
      ]),
      baseImage: normalizeSnippetText(
        input.baseImage,
        'node:20-alpine',
        'baseImage',
        safeImagePattern
      ),
      runtimeImage: normalizeSnippetText(
        input.runtimeImage,
        'node:20-alpine',
        'runtimeImage',
        safeImagePattern
      ),
      workdir,
      port: normalizePort(input.port, 3000),
      includeHealthcheck,
      useNonRootUser
    });
  }

  if (kind === 'python_app') {
    return makePythonSnippet({
      packageManager: normalizePackageManager(input.packageManager, 'pip', [
        'pip',
        'poetry'
      ]),
      baseImage: normalizeSnippetText(
        input.baseImage,
        'python:3.12-slim',
        'baseImage',
        safeImagePattern
      ),
      workdir,
      port: normalizePort(input.port, 8000),
      pythonModule: normalizeSnippetText(
        input.pythonModule,
        'app.main:app',
        'pythonModule',
        pythonModulePattern
      ),
      includeHealthcheck,
      useNonRootUser
    });
  }

  if (kind === 'go_app') {
    return makeGoSnippet({
      baseImage: normalizeSnippetText(
        input.baseImage,
        'golang:1.23-alpine',
        'baseImage',
        safeImagePattern
      ),
      runtimeImage: normalizeSnippetText(
        input.runtimeImage,
        'alpine:3.20',
        'runtimeImage',
        safeImagePattern
      ),
      workdir,
      port: normalizePort(input.port, 8080),
      includeHealthcheck,
      useNonRootUser
    });
  }

  return makeStaticNginxSnippet({
    baseImage: normalizeSnippetText(
      input.baseImage,
      'node:20-alpine',
      'baseImage',
      safeImagePattern
    ),
    runtimeImage: normalizeSnippetText(
      input.runtimeImage,
      'nginx:1.27-alpine',
      'runtimeImage',
      safeImagePattern
    )
  });
};

export const dockerfileTools: ToolboxTool[] = [
  {
    name: 'dockerfile.format',
    title: 'Dockerfile Format',
    description: 'Format a Dockerfile and report common structure issues.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema,
    outputSchema,
    execute: (input) => {
      try {
        return ok(
          formatDockerfile(
            input as DockerfileFormatInput
          ) as unknown as JsonValue
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'dockerfile.snippet_generate',
    title: 'Dockerfile Snippet Generate',
    description:
      'Generate common Dockerfile templates for Node, Python, Go, and static frontend apps.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: snippetInputSchema,
    outputSchema: snippetOutputSchema,
    execute: (input) => {
      try {
        return ok(
          generateDockerfileSnippet(
            input as DockerfileSnippetInput
          ) as unknown as JsonValue
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
