import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { type ToolRisk, type ToolboxTool } from '@private-toolbox/core';

export type McpToolSource = 'core' | 'server';

export type McpAuditConfig = {
  enabled: boolean;
  target: 'stderr' | 'file';
  filePath: string | null;
};

export type McpConfig = {
  enableCoreTools: boolean;
  enableServerTools: boolean;
  enableHttpTools: boolean;
  allowedRisks: ToolRisk[];
  enabledTools: string[] | null;
  disabledTools: string[];
  maxOutputBytes: number;
  audit: McpAuditConfig;
};

type McpConfigFile = Partial<{
  enableCoreTools: boolean;
  enableServerTools: boolean;
  enableHttpTools: boolean;
  allowedRisks: string[] | null;
  enabledTools: string[] | null;
  disabledTools: string[] | null;
  maxOutputBytes: number;
  auditLog: string | null;
}>;

type EnvLike = Record<string, string | undefined>;

const allRisks: ToolRisk[] = [
  'local',
  'network',
  'secret',
  'file-read',
  'file-write'
];

const defaultMcpConfig: McpConfig = {
  enableCoreTools: true,
  enableServerTools: true,
  enableHttpTools: false,
  allowedRisks: allRisks,
  enabledTools: null,
  disabledTools: [],
  maxOutputBytes: 1024 * 1024,
  audit: {
    enabled: true,
    target: 'stderr',
    filePath: null
  }
};

const parseBoolean = (
  value: string | boolean | undefined,
  fallback: boolean
): boolean => {
  if (typeof value === 'boolean') return value;
  if (value === undefined) return fallback;

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;

  return fallback;
};

const parseCsv = (value: string | undefined): string[] | undefined => {
  if (value === undefined) return undefined;

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeList = (
  value: string[] | null | undefined,
  fallback: string[]
): string[] => {
  if (!value) return fallback;

  return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
};

const normalizeRisks = (
  risks: string[] | null | undefined,
  fallback: ToolRisk[]
): ToolRisk[] => {
  if (!risks) return fallback;

  const selected = risks.filter((risk): risk is ToolRisk =>
    allRisks.includes(risk as ToolRisk)
  );

  return selected.length > 0 ? [...new Set(selected)] : fallback;
};

const normalizeAudit = (
  auditLog: string | null | undefined,
  fallback: McpAuditConfig
): McpAuditConfig => {
  if (auditLog === undefined) return fallback;
  if (auditLog === null) {
    return {
      enabled: false,
      target: fallback.target,
      filePath: null
    };
  }

  const normalized = auditLog.trim();
  if (
    !normalized ||
    ['0', 'false', 'no', 'off'].includes(normalized.toLowerCase())
  ) {
    return {
      enabled: false,
      target: fallback.target,
      filePath: null
    };
  }

  if (normalized.toLowerCase() === 'stderr') {
    return {
      enabled: true,
      target: 'stderr',
      filePath: null
    };
  }

  return {
    enabled: true,
    target: 'file',
    filePath: resolve(normalized)
  };
};

const normalizeMaxOutputBytes = (
  value: number | string | undefined,
  fallback: number
): number => {
  if (value === undefined) return fallback;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;

  return Math.max(1024, Math.floor(parsed));
};

export const normalizeMcpConfig = (
  fileConfig: McpConfigFile = {},
  env: EnvLike = process.env
): McpConfig => {
  const enabledToolsFromEnv = parseCsv(env.PRIVATE_TOOLBOX_MCP_ENABLED_TOOLS);
  const disabledToolsFromEnv = parseCsv(env.PRIVATE_TOOLBOX_MCP_DISABLED_TOOLS);
  const risksFromEnv = parseCsv(env.PRIVATE_TOOLBOX_MCP_ALLOWED_RISKS);

  const withFile: McpConfig = {
    enableCoreTools: parseBoolean(
      fileConfig.enableCoreTools,
      defaultMcpConfig.enableCoreTools
    ),
    enableServerTools: parseBoolean(
      fileConfig.enableServerTools,
      defaultMcpConfig.enableServerTools
    ),
    enableHttpTools: false,
    allowedRisks: normalizeRisks(
      fileConfig.allowedRisks,
      defaultMcpConfig.allowedRisks
    ),
    enabledTools: fileConfig.enabledTools
      ? normalizeList(fileConfig.enabledTools, [])
      : defaultMcpConfig.enabledTools,
    disabledTools: normalizeList(
      fileConfig.disabledTools,
      defaultMcpConfig.disabledTools
    ),
    maxOutputBytes: normalizeMaxOutputBytes(
      fileConfig.maxOutputBytes,
      defaultMcpConfig.maxOutputBytes
    ),
    audit: normalizeAudit(fileConfig.auditLog, defaultMcpConfig.audit)
  };

  return {
    enableCoreTools: parseBoolean(
      env.PRIVATE_TOOLBOX_MCP_ENABLE_CORE_TOOLS,
      withFile.enableCoreTools
    ),
    enableServerTools: parseBoolean(
      env.PRIVATE_TOOLBOX_MCP_ENABLE_SERVER_TOOLS,
      withFile.enableServerTools
    ),
    enableHttpTools: false,
    allowedRisks: normalizeRisks(risksFromEnv, withFile.allowedRisks),
    enabledTools:
      enabledToolsFromEnv === undefined
        ? withFile.enabledTools
        : normalizeList(enabledToolsFromEnv, []),
    disabledTools: normalizeList(disabledToolsFromEnv, withFile.disabledTools),
    maxOutputBytes: normalizeMaxOutputBytes(
      env.PRIVATE_TOOLBOX_MCP_MAX_OUTPUT_BYTES,
      withFile.maxOutputBytes
    ),
    audit: normalizeAudit(env.PRIVATE_TOOLBOX_MCP_AUDIT_LOG, withFile.audit)
  };
};

export const loadMcpConfig = (env: EnvLike = process.env): McpConfig => {
  const configPath = env.PRIVATE_TOOLBOX_MCP_CONFIG;
  if (!configPath) return normalizeMcpConfig({}, env);

  const raw = readFileSync(resolve(configPath), 'utf-8');
  const parsed = JSON.parse(raw) as McpConfigFile;

  return normalizeMcpConfig(parsed, env);
};

export const isMcpToolEnabled = (
  tool: ToolboxTool,
  source: McpToolSource,
  config: McpConfig
): boolean => {
  if (!tool.channels.includes('mcp')) return false;
  if (source === 'core' && !config.enableCoreTools) return false;
  if (source === 'server' && !config.enableServerTools) return false;
  if (tool.name.startsWith('http.') && !config.enableHttpTools) return false;
  if (config.enabledTools && !config.enabledTools.includes(tool.name)) {
    return false;
  }
  if (config.disabledTools.includes(tool.name)) return false;

  return tool.risks.every((risk) => config.allowedRisks.includes(risk));
};
