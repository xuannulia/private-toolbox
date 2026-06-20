import { parseDocument } from 'yaml';
import {
  type JsonValue,
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type ComposeIssueSeverity = 'error' | 'warning' | 'info';

export type ComposeIssue = {
  severity: ComposeIssueSeverity;
  path: string;
  message: string;
  line: number | null;
  column: number | null;
};

export type DockerComposeInput = {
  content: string;
  indent?: number;
};

export type DockerComposeValidationOutput = {
  valid: boolean;
  issues: ComposeIssue[];
  serviceNames: string[];
  networkNames: string[];
  volumeNames: string[];
  configNames: string[];
  secretNames: string[];
};

export type DockerComposeFormatOutput = DockerComposeValidationOutput & {
  output: string;
  changed: boolean;
};

const maxComposeBytes = 500_000;
const serviceNamePattern = /^[a-zA-Z0-9._-]+$/;

const inputSchema = {
  type: 'object',
  required: ['content'],
  additionalProperties: false,
  properties: {
    content: { type: 'string' },
    indent: { type: 'integer', minimum: 2, maximum: 8 }
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

const validationOutputSchema = {
  type: 'object',
  required: [
    'valid',
    'issues',
    'serviceNames',
    'networkNames',
    'volumeNames',
    'configNames',
    'secretNames'
  ],
  additionalProperties: false,
  properties: {
    valid: { type: 'boolean' },
    issues: { type: 'array', items: issueSchema },
    serviceNames: { type: 'array', items: { type: 'string' } },
    networkNames: { type: 'array', items: { type: 'string' } },
    volumeNames: { type: 'array', items: { type: 'string' } },
    configNames: { type: 'array', items: { type: 'string' } },
    secretNames: { type: 'array', items: { type: 'string' } }
  }
} as const;

const formatOutputSchema = {
  ...validationOutputSchema,
  required: [...validationOutputSchema.required, 'output', 'changed'],
  properties: {
    ...validationOutputSchema.properties,
    output: { type: 'string' },
    changed: { type: 'boolean' }
  }
} as const;

const normalizeContent = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new ToolboxError(
      'INVALID_DOCKER_COMPOSE_INPUT',
      'content must be a string'
    );
  }

  if (!value.trim()) {
    throw new ToolboxError(
      'INVALID_DOCKER_COMPOSE_INPUT',
      'content is required'
    );
  }

  if (new TextEncoder().encode(value).byteLength > maxComposeBytes) {
    throw new ToolboxError(
      'DOCKER_COMPOSE_INPUT_TOO_LARGE',
      `content is too large; maximum size is ${maxComposeBytes} bytes`
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
      'INVALID_DOCKER_COMPOSE_INPUT',
      'indent must be an integer from 2 to 8'
    );
  }

  return value;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getRecordKeys = (value: unknown): string[] =>
  isRecord(value) ? Object.keys(value) : [];

const makeIssue = (
  severity: ComposeIssueSeverity,
  path: string,
  message: string,
  line: number | null = null,
  column: number | null = null
): ComposeIssue => ({
  severity,
  path,
  message,
  line,
  column
});

const getYamlIssueLocation = (
  issue: { linePos?: { line: number; col: number }[] | null } | undefined
): { line: number | null; column: number | null } => {
  const first = issue?.linePos?.[0];
  return {
    line: first?.line ?? null,
    column: first?.col ?? null
  };
};

const toYamlIssues = (
  issues: { message: string; linePos?: { line: number; col: number }[] | null }[],
  severity: ComposeIssueSeverity
): ComposeIssue[] =>
  issues.map((issue) => {
    const { line, column } = getYamlIssueLocation(issue);
    return makeIssue(severity, '$', issue.message, line, column);
  });

const isStringOrStringList = (value: unknown): boolean =>
  typeof value === 'string' ||
  (Array.isArray(value) && value.every((item) => typeof item === 'string'));

const isMapOrStringList = (value: unknown): boolean =>
  isRecord(value) ||
  (Array.isArray(value) && value.every((item) => typeof item === 'string'));

const validateStringList = (
  value: unknown,
  path: string,
  issues: ComposeIssue[]
) => {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    issues.push(makeIssue('error', path, `${path} must be a list of strings.`));
  }
};

const validateMapSection = (
  root: Record<string, unknown>,
  key: string,
  issues: ComposeIssue[]
) => {
  if (root[key] !== undefined && !isRecord(root[key])) {
    issues.push(makeIssue('error', `$.${key}`, `${key} must be a mapping.`));
  }
};

const validateEnvironment = (
  value: unknown,
  path: string,
  issues: ComposeIssue[]
) => {
  if (isRecord(value)) return;
  if (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string' && item.trim())
  ) {
    return;
  }

  issues.push(
    makeIssue(
      'error',
      path,
      'environment must be a mapping or a list of KEY=VALUE strings.'
    )
  );
};

const validatePorts = (
  value: unknown,
  path: string,
  issues: ComposeIssue[]
) => {
  if (!Array.isArray(value)) {
    issues.push(makeIssue('error', path, 'ports must be a list.'));
    return;
  }

  value.forEach((item, index) => {
    if (
      typeof item === 'string' ||
      typeof item === 'number' ||
      (isRecord(item) &&
        (typeof item.target === 'number' || typeof item.published === 'number'))
    ) {
      return;
    }

    issues.push(
      makeIssue(
        'warning',
        `${path}[${index}]`,
        'port entries are usually strings, numbers, or objects with target/published.'
      )
    );
  });
};

const validateVolumes = (
  value: unknown,
  path: string,
  issues: ComposeIssue[]
) => {
  if (!Array.isArray(value)) {
    issues.push(makeIssue('error', path, 'volumes must be a list.'));
    return;
  }

  value.forEach((item, index) => {
    if (typeof item === 'string' || isRecord(item)) return;
    issues.push(
      makeIssue(
        'warning',
        `${path}[${index}]`,
        'volume entries are usually strings or mapping objects.'
      )
    );
  });
};

const validateService = (
  serviceName: string,
  service: unknown,
  issues: ComposeIssue[]
) => {
  const servicePath = `$.services.${serviceName}`;

  if (!serviceNamePattern.test(serviceName)) {
    issues.push(
      makeIssue(
        'error',
        servicePath,
        'service names may only contain letters, numbers, dots, underscores, and dashes.'
      )
    );
  }

  if (!isRecord(service)) {
    issues.push(makeIssue('error', servicePath, 'service must be a mapping.'));
    return;
  }

  if (!('image' in service) && !('build' in service)) {
    issues.push(
      makeIssue(
        'warning',
        servicePath,
        'service usually needs either image or build.'
      )
    );
  }

  if (service.image !== undefined && typeof service.image !== 'string') {
    issues.push(
      makeIssue('error', `${servicePath}.image`, 'image must be a string.')
    );
  }

  if (
    service.build !== undefined &&
    typeof service.build !== 'string' &&
    !isRecord(service.build)
  ) {
    issues.push(
      makeIssue(
        'error',
        `${servicePath}.build`,
        'build must be a string or mapping.'
      )
    );
  }

  if (
    service.command !== undefined &&
    typeof service.command !== 'string' &&
    !Array.isArray(service.command)
  ) {
    issues.push(
      makeIssue(
        'error',
        `${servicePath}.command`,
        'command must be a string or list.'
      )
    );
  }

  if (
    service.entrypoint !== undefined &&
    typeof service.entrypoint !== 'string' &&
    !Array.isArray(service.entrypoint)
  ) {
    issues.push(
      makeIssue(
        'error',
        `${servicePath}.entrypoint`,
        'entrypoint must be a string or list.'
      )
    );
  }

  if (service.environment !== undefined) {
    validateEnvironment(service.environment, `${servicePath}.environment`, issues);
  }

  if (service.env_file !== undefined) {
    if (!isStringOrStringList(service.env_file)) {
      issues.push(
        makeIssue(
          'error',
          `${servicePath}.env_file`,
          'env_file must be a string or list of strings.'
        )
      );
    }
  }

  if (service.ports !== undefined) {
    validatePorts(service.ports, `${servicePath}.ports`, issues);
  }

  if (service.expose !== undefined) {
    validateStringList(service.expose, `${servicePath}.expose`, issues);
  }

  if (service.volumes !== undefined) {
    validateVolumes(service.volumes, `${servicePath}.volumes`, issues);
  }

  if (service.depends_on !== undefined && !isMapOrStringList(service.depends_on)) {
    issues.push(
      makeIssue(
        'error',
        `${servicePath}.depends_on`,
        'depends_on must be a mapping or list of service names.'
      )
    );
  }

  if (service.networks !== undefined && !isMapOrStringList(service.networks)) {
    issues.push(
      makeIssue(
        'error',
        `${servicePath}.networks`,
        'networks must be a mapping or list of network names.'
      )
    );
  }

  if (service.labels !== undefined && !isMapOrStringList(service.labels)) {
    issues.push(
      makeIssue(
        'error',
        `${servicePath}.labels`,
        'labels must be a mapping or list of strings.'
      )
    );
  }

  if (service.restart !== undefined && typeof service.restart !== 'string') {
    issues.push(
      makeIssue('error', `${servicePath}.restart`, 'restart must be a string.')
    );
  }

  if (service.deploy !== undefined && !isRecord(service.deploy)) {
    issues.push(
      makeIssue('error', `${servicePath}.deploy`, 'deploy must be a mapping.')
    );
  }
};

const validateComposeObject = (
  data: unknown,
  initialIssues: ComposeIssue[]
): DockerComposeValidationOutput => {
  const issues = [...initialIssues];

  if (!isRecord(data)) {
    issues.push(
      makeIssue('error', '$', 'Compose document must be a YAML mapping.')
    );
    return {
      valid: false,
      issues,
      serviceNames: [],
      networkNames: [],
      volumeNames: [],
      configNames: [],
      secretNames: []
    };
  }

  if (data.services === undefined) {
    issues.push(makeIssue('error', '$.services', 'services is required.'));
  } else if (!isRecord(data.services)) {
    issues.push(makeIssue('error', '$.services', 'services must be a mapping.'));
  }

  validateMapSection(data, 'networks', issues);
  validateMapSection(data, 'volumes', issues);
  validateMapSection(data, 'configs', issues);
  validateMapSection(data, 'secrets', issues);

  const serviceNames = getRecordKeys(data.services);
  if (isRecord(data.services) && serviceNames.length === 0) {
    issues.push(makeIssue('error', '$.services', 'services must not be empty.'));
  }

  if (isRecord(data.services)) {
    for (const [serviceName, service] of Object.entries(data.services)) {
      validateService(serviceName, service, issues);
    }
  }

  return {
    valid: !issues.some((issue) => issue.severity === 'error'),
    issues,
    serviceNames,
    networkNames: getRecordKeys(data.networks),
    volumeNames: getRecordKeys(data.volumes),
    configNames: getRecordKeys(data.configs),
    secretNames: getRecordKeys(data.secrets)
  };
};

export const validateDockerCompose = (
  input: DockerComposeInput
): DockerComposeValidationOutput => {
  const content = normalizeContent(input.content);
  const document = parseDocument(content, {
    prettyErrors: false,
    uniqueKeys: true
  });
  const syntaxIssues = [
    ...toYamlIssues(document.errors, 'error'),
    ...toYamlIssues(document.warnings, 'warning')
  ];

  if (document.errors.length > 0) {
    return validateComposeObject(null, syntaxIssues);
  }

  return validateComposeObject(document.toJSON(), syntaxIssues);
};

export const formatDockerCompose = (
  input: DockerComposeInput
): DockerComposeFormatOutput => {
  const content = normalizeContent(input.content);
  const indent = normalizeIndent(input.indent);
  const document = parseDocument(content, {
    prettyErrors: false,
    uniqueKeys: true
  });
  const validation = validateDockerCompose({ content });
  const output =
    document.errors.length === 0
      ? document.toString({
          indent,
          lineWidth: 0
        })
      : content;

  return {
    ...validation,
    output,
    changed: output !== content
  };
};

export const dockerComposeTools: ToolboxTool[] = [
  {
    name: 'docker_compose.validate',
    title: 'Docker Compose Validate',
    description: 'Validate Docker Compose YAML syntax and common structure.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema,
    outputSchema: validationOutputSchema,
    execute: (input) => {
      try {
        return ok(
          validateDockerCompose(input as DockerComposeInput) as unknown as JsonValue
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'docker_compose.format',
    title: 'Docker Compose Format',
    description: 'Format Docker Compose YAML and return validation issues.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema,
    outputSchema: formatOutputSchema,
    execute: (input) => {
      try {
        return ok(
          formatDockerCompose(input as DockerComposeInput) as unknown as JsonValue
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
