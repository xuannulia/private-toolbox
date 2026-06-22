import { resolve } from 'node:path';
import { ToolboxError } from '@private-toolbox/core';

export type NetworkDataSource = 'ippure';

export type NetworkDataSourceConfig = Record<NetworkDataSource, boolean>;

export type NetworkToolConfig = {
  timeoutMs: number;
  maxResponseBytes: number;
  allowPrivateNetworks: boolean;
  maxRedirects: number;
  userAgent: string;
  ipPureLookupBaseUrl: string;
  dataSources: NetworkDataSourceConfig;
};

export type FileToolConfig = {
  rootDir: string;
  outputDir: string;
  maxRenameOperations: number;
};

export type ServerNetworkRateLimitConfig = {
  enabled: boolean;
  maxCalls: number;
  windowMs: number;
  toolOverrides: Record<string, ServerNetworkRateLimitRuleConfig>;
  dataSourceOverrides: Partial<
    Record<NetworkDataSource, ServerNetworkRateLimitRuleConfig>
  >;
  toolDataSources: Partial<Record<string, NetworkDataSource>>;
  stateFilePath: string | null;
};

export type ServerNetworkRateLimitRuleConfig = {
  maxCalls: number;
  windowMs: number;
};

export type ServerRuntimeConfig = {
  networkRateLimit: ServerNetworkRateLimitConfig;
};

const envBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;

  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;

  return fallback;
};

const envNumber = (value: string | undefined, fallback: number): number => {
  if (value === undefined) return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeRateLimitRule = (
  rule: Partial<ServerNetworkRateLimitRuleConfig> | undefined,
  fallback: ServerNetworkRateLimitRuleConfig
): ServerNetworkRateLimitRuleConfig => ({
  maxCalls: Math.max(1, Math.floor(rule?.maxCalls ?? fallback.maxCalls)),
  windowMs: Math.max(1000, Math.floor(rule?.windowMs ?? fallback.windowMs))
});

const parseRateLimitOverrides = (
  value: string | undefined,
  fallback: ServerNetworkRateLimitRuleConfig
): Record<string, ServerNetworkRateLimitRuleConfig> => {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as Record<
      string,
      Partial<ServerNetworkRateLimitRuleConfig>
    >;

    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, rule]) => typeof rule === 'object' && rule !== null)
        .map(([name, rule]) => [name, normalizeRateLimitRule(rule, fallback)])
    );
  } catch {
    return {};
  }
};

const getSourceRateLimitOverride = (
  source: NetworkDataSource,
  fallback: ServerNetworkRateLimitRuleConfig
): ServerNetworkRateLimitRuleConfig | undefined => {
  const prefix = `PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_${source.toUpperCase()}`;
  const maxCalls = process.env[`${prefix}_MAX`];
  const windowMs = process.env[`${prefix}_WINDOW_MS`];

  if (maxCalls === undefined && windowMs === undefined) return undefined;

  return normalizeRateLimitRule(
    {
      maxCalls: envNumber(maxCalls, fallback.maxCalls),
      windowMs: envNumber(windowMs, fallback.windowMs)
    },
    fallback
  );
};

export const defaultNetworkToolConfig: NetworkToolConfig = {
  timeoutMs: 8000,
  maxResponseBytes: 1024 * 1024,
  allowPrivateNetworks: false,
  maxRedirects: 5,
  userAgent:
    'PrivateToolbox/0.1 (+https://github.com/xuannulia/private-toolbox)',
  // Captured from IPPure's public IP search flow.
  ipPureLookupBaseUrl: 'https://ipinfo.io/widget/demo',
  dataSources: {
    ippure: envBoolean(process.env.PRIVATE_TOOLBOX_IPPURE_ENABLED, true)
  }
};

export const getDefaultFileToolConfig = (): FileToolConfig => {
  const rootDir = process.env.PRIVATE_TOOLBOX_FILE_ROOT ?? process.cwd();

  return {
    rootDir,
    outputDir:
      process.env.PRIVATE_TOOLBOX_FILE_OUTPUT_DIR ?? `${rootDir}/output`,
    maxRenameOperations: Number(
      process.env.PRIVATE_TOOLBOX_MAX_RENAME_OPERATIONS ?? '500'
    )
  };
};

export const mergeNetworkToolConfig = (
  override?: Partial<NetworkToolConfig>
): NetworkToolConfig => ({
  ...defaultNetworkToolConfig,
  ...override,
  dataSources: {
    ...defaultNetworkToolConfig.dataSources,
    ...(override?.dataSources ?? {})
  }
});

export const mergeFileToolConfig = (
  override?: Partial<FileToolConfig>
): FileToolConfig => ({
  ...getDefaultFileToolConfig(),
  ...override
});

export const getDefaultServerRuntimeConfig = (): ServerRuntimeConfig => {
  const baseRule = normalizeRateLimitRule(
    {
      maxCalls: envNumber(
        process.env.PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_MAX,
        60
      ),
      windowMs: envNumber(
        process.env.PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_WINDOW_MS,
        60_000
      )
    },
    {
      maxCalls: 60,
      windowMs: 60_000
    }
  );
  const sourceJsonOverrides = parseRateLimitOverrides(
    process.env.PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_DATA_SOURCE_OVERRIDES,
    baseRule
  );
  const dataSourceOverrides: Partial<
    Record<NetworkDataSource, ServerNetworkRateLimitRuleConfig>
  > = {};

  for (const source of ['ippure'] as const) {
    const envOverride = getSourceRateLimitOverride(source, baseRule);
    const jsonOverride = sourceJsonOverrides[source];

    if (envOverride || jsonOverride) {
      dataSourceOverrides[source] = jsonOverride ?? envOverride;
    }
  }

  return {
    networkRateLimit: {
      enabled: envBoolean(
        process.env.PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_ENABLED,
        true
      ),
      ...baseRule,
      toolOverrides: parseRateLimitOverrides(
        process.env.PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_TOOL_OVERRIDES,
        baseRule
      ),
      dataSourceOverrides,
      toolDataSources: {
        'ip.lookup': 'ippure'
      },
      stateFilePath: process.env.PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_STATE_FILE
        ? resolve(process.env.PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_STATE_FILE)
        : null
    }
  };
};

export const assertNetworkDataSourceEnabled = (
  source: NetworkDataSource,
  override?: Partial<NetworkToolConfig>
) => {
  const config = mergeNetworkToolConfig(override);

  if (!config.dataSources[source]) {
    throw new ToolboxError(
      'NETWORK_DATA_SOURCE_DISABLED',
      `Network data source is disabled: ${source}`
    );
  }
};
