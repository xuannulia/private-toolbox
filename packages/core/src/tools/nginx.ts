import {
  type JsonValue,
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type NginxIssueSeverity = 'error' | 'warning' | 'info';

export type NginxIssue = {
  severity: NginxIssueSeverity;
  path: string;
  message: string;
  line: number | null;
  column: number | null;
};

export type NginxFormatInput = {
  content: string;
  indent?: number;
};

export type NginxFormatOutput = {
  output: string;
  changed: boolean;
  valid: boolean;
  issues: NginxIssue[];
  directiveCount: number;
  blockCount: number;
  contexts: string[];
  maxDepth: number;
};

export type NginxLocationMatchInput = {
  content: string;
  uri: string;
};

export type NginxLocationMatchType =
  | 'exact'
  | 'prefix'
  | 'preferential_prefix'
  | 'regex'
  | 'case_insensitive_regex'
  | 'named';

export type NginxLocationCandidate = {
  index: number;
  context: string;
  raw: string;
  modifier: string | null;
  pattern: string;
  matchType: NginxLocationMatchType;
  matched: boolean;
  selected: boolean;
  line: number;
  column: number;
  reason: string;
};

export type NginxLocationMatchOutput = {
  uri: string;
  normalizedUri: string;
  selected: NginxLocationCandidate | null;
  selectionReason: string;
  locations: NginxLocationCandidate[];
  matchCount: number;
  issues: NginxIssue[];
};

export type NginxSnippetKind =
  | 'reverse_proxy'
  | 'static_site'
  | 'spa'
  | 'https_redirect';

export type NginxSnippetInput = {
  kind: NginxSnippetKind;
  serverName?: string;
  listenPort?: number;
  upstreamUrl?: string;
  root?: string;
  clientMaxBodySize?: string;
  enableWebsocket?: boolean;
  includeSecurityHeaders?: boolean;
  enableGzip?: boolean;
  accessLog?: boolean;
};

export type NginxSnippetOutput = {
  output: string;
  kind: NginxSnippetKind;
  serverName: string;
  listenPort: number;
  notes: string[];
};

type NginxWordToken = {
  type: 'word';
  value: string;
  line: number;
  column: number;
};

type NginxCommentToken = {
  type: 'comment';
  value: string;
  line: number;
  column: number;
};

type NginxSymbolToken = {
  type: 'symbol';
  value: '{' | '}' | ';';
  line: number;
  column: number;
};

type NginxToken = NginxWordToken | NginxCommentToken | NginxSymbolToken;

const maxConfigBytes = 500_000;
const blockDirectiveNames = new Set([
  'events',
  'http',
  'server',
  'location',
  'upstream',
  'stream',
  'mail',
  'map',
  'geo',
  'limit_except',
  'if'
]);
const noArgumentBlockNames = new Set([
  'events',
  'http',
  'server',
  'stream',
  'mail'
]);

const formatInputSchema = {
  type: 'object',
  required: ['content'],
  additionalProperties: false,
  properties: {
    content: { type: 'string' },
    indent: { type: 'integer', minimum: 2, maximum: 8 }
  }
} as const;

const locationMatchInputSchema = {
  type: 'object',
  required: ['content', 'uri'],
  additionalProperties: false,
  properties: {
    content: { type: 'string' },
    uri: { type: 'string' }
  }
} as const;

const snippetInputSchema = {
  type: 'object',
  required: ['kind'],
  additionalProperties: false,
  properties: {
    kind: {
      enum: ['reverse_proxy', 'static_site', 'spa', 'https_redirect']
    },
    serverName: { type: 'string' },
    listenPort: { type: 'integer', minimum: 1, maximum: 65535 },
    upstreamUrl: { type: 'string' },
    root: { type: 'string' },
    clientMaxBodySize: { type: 'string' },
    enableWebsocket: { type: 'boolean' },
    includeSecurityHeaders: { type: 'boolean' },
    enableGzip: { type: 'boolean' },
    accessLog: { type: 'boolean' }
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

const formatOutputSchema = {
  type: 'object',
  required: [
    'output',
    'changed',
    'valid',
    'issues',
    'directiveCount',
    'blockCount',
    'contexts',
    'maxDepth'
  ],
  additionalProperties: false,
  properties: {
    output: { type: 'string' },
    changed: { type: 'boolean' },
    valid: { type: 'boolean' },
    issues: { type: 'array', items: issueSchema },
    directiveCount: { type: 'integer' },
    blockCount: { type: 'integer' },
    contexts: { type: 'array', items: { type: 'string' } },
    maxDepth: { type: 'integer' }
  }
} as const;

const locationCandidateSchema = {
  type: 'object',
  required: [
    'index',
    'context',
    'raw',
    'modifier',
    'pattern',
    'matchType',
    'matched',
    'selected',
    'line',
    'column',
    'reason'
  ],
  additionalProperties: false,
  properties: {
    index: { type: 'integer' },
    context: { type: 'string' },
    raw: { type: 'string' },
    modifier: { type: ['string', 'null'] },
    pattern: { type: 'string' },
    matchType: {
      enum: [
        'exact',
        'prefix',
        'preferential_prefix',
        'regex',
        'case_insensitive_regex',
        'named'
      ]
    },
    matched: { type: 'boolean' },
    selected: { type: 'boolean' },
    line: { type: 'integer' },
    column: { type: 'integer' },
    reason: { type: 'string' }
  }
} as const;

const locationMatchOutputSchema = {
  type: 'object',
  required: [
    'uri',
    'normalizedUri',
    'selected',
    'selectionReason',
    'locations',
    'matchCount',
    'issues'
  ],
  additionalProperties: false,
  properties: {
    uri: { type: 'string' },
    normalizedUri: { type: 'string' },
    selected: {
      anyOf: [locationCandidateSchema, { type: 'null' }]
    },
    selectionReason: { type: 'string' },
    locations: { type: 'array', items: locationCandidateSchema },
    matchCount: { type: 'integer' },
    issues: { type: 'array', items: issueSchema }
  }
} as const;

const snippetOutputSchema = {
  type: 'object',
  required: ['output', 'kind', 'serverName', 'listenPort', 'notes'],
  additionalProperties: false,
  properties: {
    output: { type: 'string' },
    kind: {
      enum: ['reverse_proxy', 'static_site', 'spa', 'https_redirect']
    },
    serverName: { type: 'string' },
    listenPort: { type: 'integer' },
    notes: { type: 'array', items: { type: 'string' } }
  }
} as const;

const snippetKinds = new Set<NginxSnippetKind>([
  'reverse_proxy',
  'static_site',
  'spa',
  'https_redirect'
]);

const safeServerNamePattern =
  /^(\*|[A-Za-z0-9_.-]+)(\s+(\*|[A-Za-z0-9_.-]+))*$/;
const safePathPattern = /^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/;
const bodySizePattern = /^\d+[kKmMgG]?$/;

const normalizeSnippetKind = (value: unknown): NginxSnippetKind => {
  if (
    typeof value !== 'string' ||
    !snippetKinds.has(value as NginxSnippetKind)
  ) {
    throw new ToolboxError('INVALID_NGINX_INPUT', 'kind is not supported');
  }

  return value as NginxSnippetKind;
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
      'INVALID_NGINX_INPUT',
      `${fieldName} must be a string`
    );
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 512 || !pattern.test(trimmed)) {
    throw new ToolboxError('INVALID_NGINX_INPUT', `${fieldName} is not valid`);
  }

  return trimmed;
};

const normalizeListenPort = (value: unknown): number => {
  if (value === undefined) return 80;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 65535
  ) {
    throw new ToolboxError(
      'INVALID_NGINX_INPUT',
      'listenPort must be an integer from 1 to 65535'
    );
  }

  return value;
};

const normalizeUpstreamUrl = (value: unknown): string => {
  const fallback = 'http://127.0.0.1:3000';
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') {
    throw new ToolboxError(
      'INVALID_NGINX_INPUT',
      'upstreamUrl must be a string'
    );
  }

  const trimmed = value.trim();
  if (trimmed.length > 512 || /[\s;{}]/.test(trimmed)) {
    throw new ToolboxError('INVALID_NGINX_INPUT', 'upstreamUrl is not valid');
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('unsupported protocol');
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    throw new ToolboxError(
      'INVALID_NGINX_INPUT',
      'upstreamUrl must be an http or https URL'
    );
  }
};

const boolOrDefault = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const normalizeContent = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new ToolboxError('INVALID_NGINX_INPUT', 'content must be a string');
  }

  if (!value.trim()) {
    throw new ToolboxError('INVALID_NGINX_INPUT', 'content is required');
  }

  if (new TextEncoder().encode(value).byteLength > maxConfigBytes) {
    throw new ToolboxError(
      'NGINX_INPUT_TOO_LARGE',
      `content is too large; maximum size is ${maxConfigBytes} bytes`
    );
  }

  return value.replace(/\r\n?/g, '\n');
};

const normalizeIndent = (value: unknown): number => {
  if (value === undefined) return 2;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 2 ||
    value > 8
  ) {
    throw new ToolboxError(
      'INVALID_NGINX_INPUT',
      'indent must be an integer from 2 to 8'
    );
  }

  return value;
};

const normalizeUri = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new ToolboxError('INVALID_NGINX_INPUT', 'uri must be a string');
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ToolboxError('INVALID_NGINX_INPUT', 'uri is required');
  }

  if (trimmed.length > 8192) {
    throw new ToolboxError(
      'INVALID_NGINX_INPUT',
      'uri must be at most 8192 characters'
    );
  }

  const pathname = (() => {
    try {
      if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
        return new URL(trimmed).pathname;
      }
    } catch {
      return trimmed;
    }

    return trimmed.split(/[?#]/, 1)[0] ?? trimmed;
  })();

  return pathname.startsWith('/') ? pathname : `/${pathname}`;
};

const makeIssue = (
  severity: NginxIssueSeverity,
  path: string,
  message: string,
  line: number | null = null,
  column: number | null = null
): NginxIssue => ({
  severity,
  path,
  message,
  line,
  column
});

const isWhitespace = (character: string): boolean => /\s/.test(character);

const tokenizeNginx = (
  content: string
): { tokens: NginxToken[]; issues: NginxIssue[] } => {
  const tokens: NginxToken[] = [];
  const issues: NginxIssue[] = [];
  let index = 0;
  let line = 1;
  let column = 1;

  const advance = (character: string) => {
    index += 1;
    if (character === '\n') {
      line += 1;
      column = 1;
      return;
    }
    column += 1;
  };

  while (index < content.length) {
    const character = content[index];
    const tokenLine = line;
    const tokenColumn = column;

    if (isWhitespace(character)) {
      advance(character);
      continue;
    }

    if (character === '#') {
      let value = '';
      while (index < content.length && content[index] !== '\n') {
        value += content[index];
        advance(content[index]);
      }
      tokens.push({
        type: 'comment',
        value: value.trimEnd(),
        line: tokenLine,
        column: tokenColumn
      });
      continue;
    }

    if (character === '{' || character === '}' || character === ';') {
      tokens.push({
        type: 'symbol',
        value: character,
        line: tokenLine,
        column: tokenColumn
      });
      advance(character);
      continue;
    }

    if (character === '"' || character === "'") {
      const quote = character;
      let value = '';
      let closed = false;
      let escaped = false;

      while (index < content.length) {
        const current = content[index];
        value += current;
        advance(current);

        if (escaped) {
          escaped = false;
          continue;
        }

        if (current === '\\') {
          escaped = true;
          continue;
        }

        if (current === quote) {
          closed = true;
          break;
        }
      }

      if (!closed) {
        issues.push(
          makeIssue(
            'error',
            '$',
            `Unterminated quoted string starting at line ${tokenLine}, column ${tokenColumn}.`,
            tokenLine,
            tokenColumn
          )
        );
      }

      tokens.push({
        type: 'word',
        value,
        line: tokenLine,
        column: tokenColumn
      });
      continue;
    }

    let value = '';
    while (
      index < content.length &&
      !isWhitespace(content[index]) &&
      !['{', '}', ';', '#'].includes(content[index])
    ) {
      value += content[index];
      advance(content[index]);
    }

    tokens.push({
      type: 'word',
      value,
      line: tokenLine,
      column: tokenColumn
    });
  }

  return {
    tokens,
    issues
  };
};

const indentLine = (level: number, indent: number): string =>
  ' '.repeat(level * indent);

const makeContextPath = (contextStack: string[]): string =>
  contextStack.length === 0 ? '$' : `$.${contextStack.join('.')}`;

const makeBlockLabel = (parts: string[], blockIndex: number): string => {
  const name = parts[0] ?? 'block';
  const detail = parts.slice(1).join(' ');
  return detail ? `${name}(${detail})` : `${name}[${blockIndex}]`;
};

const unquoteNginxValue = (value: string): string => {
  if (value.length < 2) return value;
  const quote = value[0];
  if ((quote !== '"' && quote !== "'") || value[value.length - 1] !== quote) {
    return value;
  }

  return value.slice(1, -1).replace(/\\(["'\\])/g, '$1');
};

const validateBlockHeader = (
  parts: string[],
  contextPath: string,
  issues: NginxIssue[],
  line: number,
  column: number
) => {
  const name = parts[0];

  if (!name) {
    issues.push(
      makeIssue('error', contextPath, 'Block is missing a name.', line, column)
    );
    return;
  }

  if (name === 'location' && parts.length < 2) {
    issues.push(
      makeIssue(
        'error',
        `${contextPath}.location`,
        'location block must include a pattern.',
        line,
        column
      )
    );
  }

  if (name === 'upstream' && parts.length < 2) {
    issues.push(
      makeIssue(
        'error',
        `${contextPath}.upstream`,
        'upstream block must include a name.',
        line,
        column
      )
    );
  }

  if (noArgumentBlockNames.has(name) && parts.length > 1) {
    issues.push(
      makeIssue(
        'warning',
        `${contextPath}.${name}`,
        `${name} blocks usually do not take arguments.`,
        line,
        column
      )
    );
  }
};

const validateDirective = (
  parts: string[],
  contextPath: string,
  issues: NginxIssue[],
  line: number,
  column: number
) => {
  const name = parts[0];

  if (!name) {
    issues.push(
      makeIssue(
        'error',
        contextPath,
        'Directive is missing a name.',
        line,
        column
      )
    );
    return;
  }

  if (blockDirectiveNames.has(name)) {
    issues.push(
      makeIssue(
        'warning',
        `${contextPath}.${name}`,
        `${name} is commonly used as a block directive.`,
        line,
        column
      )
    );
  }

  if (
    [
      'listen',
      'server_name',
      'proxy_pass',
      'include',
      'root',
      'alias'
    ].includes(name) &&
    parts.length < 2
  ) {
    issues.push(
      makeIssue(
        'error',
        `${contextPath}.${name}`,
        `${name} requires at least one argument.`,
        line,
        column
      )
    );
  }

  if (name === 'return' && parts.length < 2) {
    issues.push(
      makeIssue(
        'error',
        `${contextPath}.return`,
        'return requires a status code or target.',
        line,
        column
      )
    );
  }
};

export const formatNginxConfig = (
  input: NginxFormatInput
): NginxFormatOutput => {
  const content = normalizeContent(input.content);
  const indent = normalizeIndent(input.indent);
  const { tokens, issues } = tokenizeNginx(content);
  const lines: string[] = [];
  const pending: string[] = [];
  const contexts: string[] = [];
  const contextStack: string[] = [];
  let indentLevel = 0;
  let directiveCount = 0;
  let blockCount = 0;
  let maxDepth = 0;
  let firstPendingLine = 1;
  let firstPendingColumn = 1;

  const pushPending = (token: NginxWordToken) => {
    if (pending.length === 0) {
      firstPendingLine = token.line;
      firstPendingColumn = token.column;
    }
    pending.push(token.value);
  };

  const currentPath = (): string => makeContextPath(contextStack);

  for (const token of tokens) {
    if (token.type === 'word') {
      pushPending(token);
      continue;
    }

    if (token.type === 'comment') {
      if (pending.length > 0) {
        lines.push(
          `${indentLine(indentLevel, indent)}${pending.join(' ')} ${
            token.value
          }`
        );
        issues.push(
          makeIssue(
            'warning',
            currentPath(),
            'Comment appeared before a directive terminator.',
            token.line,
            token.column
          )
        );
        pending.length = 0;
        continue;
      }

      lines.push(`${indentLine(indentLevel, indent)}${token.value}`);
      continue;
    }

    if (token.value === ';') {
      if (pending.length === 0) {
        lines.push(`${indentLine(indentLevel, indent)};`);
        issues.push(
          makeIssue(
            'error',
            currentPath(),
            'Empty directive before semicolon.',
            token.line,
            token.column
          )
        );
        continue;
      }

      validateDirective(
        pending,
        currentPath(),
        issues,
        firstPendingLine,
        firstPendingColumn
      );
      lines.push(`${indentLine(indentLevel, indent)}${pending.join(' ')};`);
      directiveCount += 1;
      pending.length = 0;
      continue;
    }

    if (token.value === '{') {
      if (pending.length === 0) {
        lines.push(`${indentLine(indentLevel, indent)}{`);
        issues.push(
          makeIssue(
            'error',
            currentPath(),
            'Block opener is missing a directive name.',
            token.line,
            token.column
          )
        );
        indentLevel += 1;
        continue;
      }

      validateBlockHeader(
        pending,
        currentPath(),
        issues,
        firstPendingLine,
        firstPendingColumn
      );
      blockCount += 1;
      const label = makeBlockLabel(pending, blockCount);
      lines.push(`${indentLine(indentLevel, indent)}${pending.join(' ')} {`);
      contextStack.push(label);
      contexts.push(makeContextPath(contextStack));
      indentLevel += 1;
      maxDepth = Math.max(maxDepth, indentLevel);
      pending.length = 0;
      continue;
    }

    if (token.value === '}') {
      if (pending.length > 0) {
        lines.push(`${indentLine(indentLevel, indent)}${pending.join(' ')}`);
        issues.push(
          makeIssue(
            'error',
            currentPath(),
            'Directive is missing a semicolon before closing brace.',
            firstPendingLine,
            firstPendingColumn
          )
        );
        pending.length = 0;
      }

      if (indentLevel === 0) {
        lines.push('}');
        issues.push(
          makeIssue(
            'error',
            '$',
            'Closing brace has no matching opening brace.',
            token.line,
            token.column
          )
        );
        continue;
      }

      indentLevel -= 1;
      contextStack.pop();
      lines.push(`${indentLine(indentLevel, indent)}}`);
    }
  }

  if (pending.length > 0) {
    lines.push(`${indentLine(indentLevel, indent)}${pending.join(' ')}`);
    issues.push(
      makeIssue(
        'error',
        currentPath(),
        'Directive is missing a semicolon or block opener.',
        firstPendingLine,
        firstPendingColumn
      )
    );
  }

  if (indentLevel > 0) {
    issues.push(
      makeIssue(
        'error',
        currentPath(),
        `Missing ${indentLevel} closing brace${indentLevel === 1 ? '' : 's'}.`
      )
    );
  }

  const output = `${lines.join('\n')}${lines.length > 0 ? '\n' : ''}`;

  return {
    output,
    changed: output !== content,
    valid: !issues.some((issue) => issue.severity === 'error'),
    issues,
    directiveCount,
    blockCount,
    contexts,
    maxDepth
  };
};

type ParsedLocation = Omit<
  NginxLocationCandidate,
  'matched' | 'selected' | 'reason'
>;

const getLocationMatchType = (
  modifier: string | null,
  pattern: string
): NginxLocationMatchType => {
  if (modifier === '=') return 'exact';
  if (modifier === '^~') return 'preferential_prefix';
  if (modifier === '~') return 'regex';
  if (modifier === '~*') return 'case_insensitive_regex';
  if (pattern.startsWith('@')) return 'named';
  return 'prefix';
};

const parseLocationHeader = (
  parts: NginxWordToken[],
  index: number,
  context: string,
  issues: NginxIssue[]
): ParsedLocation | null => {
  const line = parts[0]?.line ?? 1;
  const column = parts[0]?.column ?? 1;
  const values = parts.map((part) => unquoteNginxValue(part.value));
  const args = values.slice(1);

  if (args.length === 0) {
    issues.push(
      makeIssue(
        'error',
        `${context}.location`,
        'location block must include a pattern.',
        line,
        column
      )
    );
    return null;
  }

  const firstArg = args[0];
  const knownModifiers = new Set(['=', '^~', '~', '~*']);
  const modifier = knownModifiers.has(firstArg) ? firstArg : null;
  const pattern = modifier ? args[1] : firstArg;

  if (!pattern) {
    issues.push(
      makeIssue(
        'error',
        `${context}.location`,
        `location ${modifier} must include a pattern.`,
        line,
        column
      )
    );
    return null;
  }

  return {
    index,
    context,
    raw: values.join(' '),
    modifier,
    pattern,
    matchType: getLocationMatchType(modifier, pattern),
    line,
    column
  };
};

const extractLocations = (
  content: string
): { locations: ParsedLocation[]; issues: NginxIssue[] } => {
  const { tokens, issues } = tokenizeNginx(content);
  const locations: ParsedLocation[] = [];
  const pending: NginxWordToken[] = [];
  const contextStack: string[] = [];
  let blockCount = 0;

  const currentPath = (): string => makeContextPath(contextStack);

  for (const token of tokens) {
    if (token.type === 'word') {
      pending.push(token);
      continue;
    }

    if (token.type === 'comment') {
      continue;
    }

    if (token.value === ';') {
      pending.length = 0;
      continue;
    }

    if (token.value === '{') {
      const values = pending.map((part) => unquoteNginxValue(part.value));
      if (values[0] === 'location') {
        const location = parseLocationHeader(
          pending,
          locations.length + 1,
          currentPath(),
          issues
        );
        if (location) {
          locations.push(location);
        }
      }

      blockCount += 1;
      contextStack.push(makeBlockLabel(values, blockCount));
      pending.length = 0;
      continue;
    }

    if (token.value === '}') {
      pending.length = 0;
      contextStack.pop();
    }
  }

  if (locations.length === 0) {
    issues.push(
      makeIssue(
        'warning',
        '$',
        'No location blocks were found in the provided Nginx config.'
      )
    );
  }

  return { locations, issues };
};

const matchParsedLocation = (
  location: ParsedLocation,
  uri: string,
  issues: NginxIssue[]
): { matched: boolean; reason: string } => {
  switch (location.matchType) {
    case 'exact':
      return {
        matched: uri === location.pattern,
        reason:
          uri === location.pattern
            ? 'Exact URI match.'
            : 'Exact URI does not match.'
      };
    case 'preferential_prefix':
    case 'prefix':
      return {
        matched: uri.startsWith(location.pattern),
        reason: uri.startsWith(location.pattern)
          ? 'URI starts with this prefix.'
          : 'URI does not start with this prefix.'
      };
    case 'regex':
    case 'case_insensitive_regex': {
      try {
        const regex = new RegExp(
          location.pattern,
          location.matchType === 'case_insensitive_regex' ? 'i' : undefined
        );
        const matched = regex.test(uri);

        return {
          matched,
          reason: matched ? 'Regex matches the URI.' : 'Regex does not match.'
        };
      } catch (error) {
        issues.push(
          makeIssue(
            'warning',
            location.context,
            `Regex location could not be evaluated by the JavaScript regex engine: ${
              error instanceof Error ? error.message : 'invalid regex'
            }`,
            location.line,
            location.column
          )
        );
        return {
          matched: false,
          reason: 'Regex could not be evaluated.'
        };
      }
    }
    case 'named':
      return {
        matched: false,
        reason: 'Named locations are only selected by internal redirects.'
      };
  }
};

export const matchNginxLocation = (
  input: NginxLocationMatchInput
): NginxLocationMatchOutput => {
  const content = normalizeContent(input.content);
  const normalizedUri = normalizeUri(input.uri);
  const { locations, issues } = extractLocations(content);
  const candidates = locations.map<NginxLocationCandidate>((location) => {
    const match = matchParsedLocation(location, normalizedUri, issues);
    return {
      ...location,
      matched: match.matched,
      selected: false,
      reason: match.reason
    };
  });

  const exactMatch = candidates.find(
    (location) => location.matchType === 'exact' && location.matched
  );
  const prefixMatches = candidates
    .filter(
      (location) =>
        (location.matchType === 'prefix' ||
          location.matchType === 'preferential_prefix') &&
        location.matched
    )
    .sort((left, right) => {
      const lengthDiff = right.pattern.length - left.pattern.length;
      return lengthDiff === 0 ? left.index - right.index : lengthDiff;
    });
  const longestPrefix = prefixMatches[0] ?? null;
  const regexMatch = candidates.find(
    (location) =>
      (location.matchType === 'regex' ||
        location.matchType === 'case_insensitive_regex') &&
      location.matched
  );

  let selected: NginxLocationCandidate | null = null;
  let selectionReason = 'No matching location was found.';

  if (exactMatch) {
    selected = exactMatch;
    selectionReason = 'Exact location has the highest priority.';
  } else if (longestPrefix?.matchType === 'preferential_prefix') {
    selected = longestPrefix;
    selectionReason =
      'The longest matching ^~ prefix is selected before regex locations.';
  } else if (regexMatch) {
    selected = regexMatch;
    selectionReason =
      'The first matching regex location is selected after prefix lookup.';
  } else if (longestPrefix) {
    selected = longestPrefix;
    selectionReason =
      'No regex matched, so the longest prefix location is used.';
  }

  const selectedIndex = selected?.index ?? null;
  const locationsWithSelection = candidates.map((candidate) => ({
    ...candidate,
    selected: candidate.index === selectedIndex
  }));

  return {
    uri: input.uri,
    normalizedUri,
    selected:
      locationsWithSelection.find((candidate) => candidate.selected) ?? null,
    selectionReason,
    locations: locationsWithSelection,
    matchCount: locationsWithSelection.filter((location) => location.matched)
      .length,
    issues
  };
};

const addCommonServerDirectives = (
  lines: string[],
  options: {
    clientMaxBodySize: string;
    accessLog: boolean;
    includeSecurityHeaders: boolean;
    enableGzip: boolean;
  }
) => {
  lines.push(`  client_max_body_size ${options.clientMaxBodySize};`);
  lines.push(
    `  access_log ${options.accessLog ? '/var/log/nginx/access.log' : 'off'};`
  );

  if (options.includeSecurityHeaders) {
    lines.push('');
    lines.push('  add_header X-Content-Type-Options "nosniff" always;');
    lines.push('  add_header X-Frame-Options "SAMEORIGIN" always;');
    lines.push(
      '  add_header Referrer-Policy "strict-origin-when-cross-origin" always;'
    );
  }

  if (options.enableGzip) {
    lines.push('');
    lines.push('  gzip on;');
    lines.push(
      '  gzip_types text/plain text/css application/json application/javascript application/xml;'
    );
  }
};

const makeReverseProxySnippet = (options: {
  serverName: string;
  listenPort: number;
  upstreamUrl: string;
  clientMaxBodySize: string;
  enableWebsocket: boolean;
  includeSecurityHeaders: boolean;
  enableGzip: boolean;
  accessLog: boolean;
}): { output: string; notes: string[] } => {
  const lines = [
    'server {',
    `  listen ${options.listenPort};`,
    `  server_name ${options.serverName};`,
    ''
  ];

  addCommonServerDirectives(lines, options);
  lines.push('');
  lines.push('  location / {');
  lines.push(`    proxy_pass ${options.upstreamUrl};`);
  lines.push('    proxy_http_version 1.1;');
  lines.push('    proxy_set_header Host $host;');
  lines.push('    proxy_set_header X-Real-IP $remote_addr;');
  lines.push(
    '    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;'
  );
  lines.push('    proxy_set_header X-Forwarded-Proto $scheme;');

  if (options.enableWebsocket) {
    lines.push('    proxy_set_header Upgrade $http_upgrade;');
    lines.push('    proxy_set_header Connection "upgrade";');
  }

  lines.push('  }');
  lines.push('}');

  return {
    output: `${lines.join('\n')}\n`,
    notes: [
      'Reverse proxy snippet generated without TLS directives.',
      options.enableWebsocket
        ? 'WebSocket upgrade headers are enabled.'
        : 'Enable WebSocket headers only when the upstream needs them.'
    ]
  };
};

const makeStaticSnippet = (options: {
  kind: Extract<NginxSnippetKind, 'static_site' | 'spa'>;
  serverName: string;
  listenPort: number;
  root: string;
  clientMaxBodySize: string;
  includeSecurityHeaders: boolean;
  enableGzip: boolean;
  accessLog: boolean;
}): { output: string; notes: string[] } => {
  const isSpa = options.kind === 'spa';
  const lines = [
    'server {',
    `  listen ${options.listenPort};`,
    `  server_name ${options.serverName};`,
    `  root ${options.root};`,
    '  index index.html;',
    ''
  ];

  addCommonServerDirectives(lines, options);
  lines.push('');
  lines.push('  location / {');
  lines.push(
    isSpa
      ? '    try_files $uri $uri/ /index.html;'
      : '    try_files $uri $uri/ =404;'
  );
  lines.push('  }');
  lines.push('');
  lines.push(
    '  location ~* \\.(?:css|js|jpg|jpeg|png|gif|svg|webp|ico|woff2?)$ {'
  );
  lines.push('    expires 30d;');
  lines.push('    add_header Cache-Control "public, immutable";');
  lines.push('    try_files $uri =404;');
  lines.push('  }');
  lines.push('}');

  return {
    output: `${lines.join('\n')}\n`,
    notes: [
      isSpa
        ? 'SPA fallback sends unknown routes to /index.html.'
        : 'Static site fallback returns 404 for unknown paths.',
      'Review cache rules before using this in production.'
    ]
  };
};

const makeHttpsRedirectSnippet = (options: {
  serverName: string;
  listenPort: number;
}): { output: string; notes: string[] } => {
  const lines = [
    'server {',
    `  listen ${options.listenPort};`,
    `  server_name ${options.serverName};`,
    '  return 301 https://$host$request_uri;',
    '}'
  ];

  return {
    output: `${lines.join('\n')}\n`,
    notes: ['Redirect snippet only handles HTTP to HTTPS redirection.']
  };
};

export const generateNginxSnippet = (
  input: NginxSnippetInput
): NginxSnippetOutput => {
  const kind = normalizeSnippetKind(input.kind);
  const serverName = normalizeSnippetText(
    input.serverName,
    'example.com',
    'serverName',
    safeServerNamePattern
  );
  const listenPort = normalizeListenPort(input.listenPort);
  const root =
    kind === 'static_site' || kind === 'spa'
      ? normalizeSnippetText(
          input.root,
          '/var/www/site',
          'root',
          safePathPattern
        )
      : '/var/www/site';
  const upstreamUrl =
    kind === 'reverse_proxy'
      ? normalizeUpstreamUrl(input.upstreamUrl)
      : 'http://127.0.0.1:3000';
  const clientMaxBodySize =
    kind === 'https_redirect'
      ? '20m'
      : normalizeSnippetText(
          input.clientMaxBodySize,
          '20m',
          'clientMaxBodySize',
          bodySizePattern
        );
  const includeSecurityHeaders = boolOrDefault(
    input.includeSecurityHeaders,
    true
  );
  const enableGzip = boolOrDefault(input.enableGzip, true);
  const accessLog = boolOrDefault(input.accessLog, true);
  const enableWebsocket = boolOrDefault(input.enableWebsocket, false);

  const snippet =
    kind === 'reverse_proxy'
      ? makeReverseProxySnippet({
          serverName,
          listenPort,
          upstreamUrl,
          clientMaxBodySize,
          enableWebsocket,
          includeSecurityHeaders,
          enableGzip,
          accessLog
        })
      : kind === 'https_redirect'
        ? makeHttpsRedirectSnippet({ serverName, listenPort })
        : makeStaticSnippet({
            kind,
            serverName,
            listenPort,
            root,
            clientMaxBodySize,
            includeSecurityHeaders,
            enableGzip,
            accessLog
          });

  return {
    output: snippet.output,
    kind,
    serverName,
    listenPort,
    notes: snippet.notes
  };
};

export const nginxTools: ToolboxTool[] = [
  {
    name: 'nginx.format',
    title: 'Nginx Format',
    description: 'Format Nginx configuration and report common syntax issues.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: formatInputSchema,
    outputSchema: formatOutputSchema,
    execute: (input) => {
      try {
        return ok(
          formatNginxConfig(input as NginxFormatInput) as unknown as JsonValue
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'nginx.location_match',
    title: 'Nginx Location Match',
    description: 'Test which Nginx location block matches a request URI.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: locationMatchInputSchema,
    outputSchema: locationMatchOutputSchema,
    execute: (input) => {
      try {
        return ok(
          matchNginxLocation(
            input as NginxLocationMatchInput
          ) as unknown as JsonValue
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'nginx.snippet_generate',
    title: 'Nginx Snippet Generate',
    description: 'Generate common Nginx server snippets for private projects.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: snippetInputSchema,
    outputSchema: snippetOutputSchema,
    execute: (input) => {
      try {
        return ok(
          generateNginxSnippet(
            input as NginxSnippetInput
          ) as unknown as JsonValue
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
