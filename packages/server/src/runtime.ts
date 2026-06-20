import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { type ToolError, type ToolboxTool } from '@private-toolbox/core';
import {
  getDefaultServerRuntimeConfig,
  type NetworkDataSource,
  type ServerNetworkRateLimitRuleConfig,
  type ServerRuntimeConfig
} from './config.js';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export type ServerRateLimitState = Map<string, RateLimitBucket>;

const rateLimitState: ServerRateLimitState = new Map();

const isRateLimitBucket = (value: unknown): value is RateLimitBucket =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as RateLimitBucket).count === 'number' &&
  typeof (value as RateLimitBucket).resetAt === 'number' &&
  Number.isFinite((value as RateLimitBucket).count) &&
  Number.isFinite((value as RateLimitBucket).resetAt);

const loadRateLimitState = (filePath: string): ServerRateLimitState => {
  if (!existsSync(filePath)) return new Map();

  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf-8')) as unknown;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return new Map();
    }

    return new Map(
      Object.entries(parsed as Record<string, unknown>)
        .filter((entry): entry is [string, RateLimitBucket] =>
          isRateLimitBucket(entry[1])
        )
        .map(([key, bucket]) => [
          key,
          {
            count: Math.max(0, Math.floor(bucket.count)),
            resetAt: Math.max(0, Math.floor(bucket.resetAt))
          }
        ])
    );
  } catch {
    return new Map();
  }
};

const persistRateLimitState = (
  filePath: string,
  state: ServerRateLimitState,
  now: number
) => {
  try {
    mkdirSync(dirname(filePath), { recursive: true });
    const entries = [...state.entries()].filter(
      ([, bucket]) => now < bucket.resetAt
    );
    writeFileSync(
      filePath,
      `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`,
      'utf-8'
    );
  } catch {
    // Rate-limit persistence is best effort; in-memory limits still apply.
  }
};

const syncPersistentRateLimitState = (
  filePath: string | null,
  state: ServerRateLimitState
) => {
  if (!filePath) return;

  state.clear();
  for (const [key, bucket] of loadRateLimitState(filePath)) {
    state.set(key, bucket);
  }
};

type RateLimitScope = {
  bucketKey: string;
  scope: 'tool' | 'data-source';
  label: string;
  rule: ServerNetworkRateLimitRuleConfig;
  source?: NetworkDataSource;
};

const networkToolRateLimitKey = (tool: ToolboxTool): string =>
  `network:tool:${tool.name}`;

const networkDataSourceRateLimitKey = (source: NetworkDataSource): string =>
  `network:data-source:${source}`;

const getNetworkRateLimitScopes = (
  tool: ToolboxTool,
  config: ServerRuntimeConfig
): RateLimitScope[] => {
  const limit = config.networkRateLimit;
  const toolRule = limit.toolOverrides[tool.name] ?? {
    maxCalls: limit.maxCalls,
    windowMs: limit.windowMs
  };
  const scopes: RateLimitScope[] = [
    {
      bucketKey: networkToolRateLimitKey(tool),
      scope: 'tool',
      label: tool.name,
      rule: toolRule
    }
  ];
  const source = limit.toolDataSources[tool.name];

  if (source) {
    scopes.push({
      bucketKey: networkDataSourceRateLimitKey(source),
      scope: 'data-source',
      label: source,
      source,
      rule: limit.dataSourceOverrides[source] ?? {
        maxCalls: limit.maxCalls,
        windowMs: limit.windowMs
      }
    });
  }

  return scopes;
};

const getRateLimitError = (
  tool: ToolboxTool,
  scope: RateLimitScope,
  bucket: RateLimitBucket,
  now: number
): ToolError | undefined => {
  if (bucket.count < scope.rule.maxCalls) return undefined;

  return {
    code: 'RATE_LIMITED',
    message: `Rate limit exceeded for ${scope.scope} ${scope.label}`,
    details: {
      tool: tool.name,
      scope: scope.scope,
      source: scope.source ?? null,
      maxCalls: scope.rule.maxCalls,
      windowMs: scope.rule.windowMs,
      retryAfterMs: Math.max(0, bucket.resetAt - now)
    }
  };
};

export const checkServerToolRateLimit = (
  tool: ToolboxTool,
  config: ServerRuntimeConfig = getDefaultServerRuntimeConfig(),
  now: number = Date.now(),
  state: ServerRateLimitState = rateLimitState
): ToolError | undefined => {
  if (!tool.risks.includes('network')) return undefined;

  const limit = config.networkRateLimit;
  if (!limit.enabled) return undefined;

  syncPersistentRateLimitState(limit.stateFilePath, state);

  const scopes = getNetworkRateLimitScopes(tool, config);
  const nextBuckets = scopes.map((scope) => {
    const existing = state.get(scope.bucketKey);

    return {
      scope,
      bucket:
        !existing || now >= existing.resetAt
          ? {
              count: 0,
              resetAt: now + scope.rule.windowMs
            }
          : existing
    };
  });

  for (const { scope, bucket } of nextBuckets) {
    const error = getRateLimitError(tool, scope, bucket, now);
    if (error) {
      return error;
    }
  }

  for (const { scope, bucket } of nextBuckets) {
    bucket.count += 1;
    state.set(scope.bucketKey, bucket);
  }

  if (limit.stateFilePath) {
    persistRateLimitState(limit.stateFilePath, state, now);
  }

  return undefined;
};

export const clearServerRateLimitState = () => {
  rateLimitState.clear();
};
