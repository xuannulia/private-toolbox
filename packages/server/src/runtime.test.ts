import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { type ToolboxTool } from '@private-toolbox/core';
import { checkServerToolRateLimit, type ServerRateLimitState } from './runtime';
import { type ServerRuntimeConfig } from './config';

const makeTool = (name: string, risks: ToolboxTool['risks']): ToolboxTool => ({
  name,
  title: name,
  description: name,
  channels: ['api', 'mcp'],
  risks,
  inputSchema: {},
  outputSchema: {},
  execute: () => ({
    ok: true,
    result: null
  })
});

const makeConfig = (
  override: Partial<ServerRuntimeConfig['networkRateLimit']> = {}
): ServerRuntimeConfig => ({
  networkRateLimit: {
    enabled: true,
    maxCalls: 2,
    windowMs: 1000,
    toolOverrides: {},
    dataSourceOverrides: {},
    toolDataSources: {
      'rdap.lookup': 'rdap',
      'ip.current': 'ippure',
      'ip.lookup': 'ippure'
    },
    stateFilePath: null,
    ...override
  }
});

describe('server runtime rate limits', () => {
  it('limits network tools per tool and window', () => {
    const tool = makeTool('dns.lookup', ['network']);
    const state: ServerRateLimitState = new Map();
    const config = makeConfig();

    expect(checkServerToolRateLimit(tool, config, 10, state)).toBeUndefined();
    expect(checkServerToolRateLimit(tool, config, 20, state)).toBeUndefined();
    expect(checkServerToolRateLimit(tool, config, 30, state)).toMatchObject({
      code: 'RATE_LIMITED',
      details: {
        tool: 'dns.lookup',
        scope: 'tool',
        source: null,
        retryAfterMs: 980
      }
    });
    expect(checkServerToolRateLimit(tool, config, 1010, state)).toBeUndefined();
  });

  it('supports per-tool rate limit overrides', () => {
    const dnsTool = makeTool('dns.lookup', ['network']);
    const sslTool = makeTool('ssl.inspect', ['network']);
    const state: ServerRateLimitState = new Map();
    const config = makeConfig({
      maxCalls: 10,
      toolOverrides: {
        'dns.lookup': {
          maxCalls: 1,
          windowMs: 1000
        }
      }
    });

    expect(
      checkServerToolRateLimit(dnsTool, config, 10, state)
    ).toBeUndefined();
    expect(checkServerToolRateLimit(dnsTool, config, 20, state)).toMatchObject({
      code: 'RATE_LIMITED',
      details: {
        tool: 'dns.lookup',
        scope: 'tool',
        maxCalls: 1
      }
    });
    expect(
      checkServerToolRateLimit(sslTool, config, 30, state)
    ).toBeUndefined();
  });

  it('limits tools that share the same network data source', () => {
    const rdapDomainTool = makeTool('rdap.lookup', ['network']);
    const rdapAliasTool = makeTool('rdap.alias', ['network']);
    const state: ServerRateLimitState = new Map();
    const config = makeConfig({
      maxCalls: 10,
      dataSourceOverrides: {
        rdap: {
          maxCalls: 2,
          windowMs: 1000
        }
      },
      toolDataSources: {
        'rdap.lookup': 'rdap',
        'rdap.alias': 'rdap'
      }
    });

    expect(
      checkServerToolRateLimit(rdapDomainTool, config, 10, state)
    ).toBeUndefined();
    expect(
      checkServerToolRateLimit(rdapAliasTool, config, 20, state)
    ).toBeUndefined();
    expect(
      checkServerToolRateLimit(rdapDomainTool, config, 30, state)
    ).toMatchObject({
      code: 'RATE_LIMITED',
      details: {
        tool: 'rdap.lookup',
        scope: 'data-source',
        source: 'rdap',
        maxCalls: 2,
        retryAfterMs: 980
      }
    });
  });

  it('does not limit local tools', () => {
    const tool = makeTool('json.format', ['local']);
    const state: ServerRateLimitState = new Map();
    const config = makeConfig({
      maxCalls: 1
    });

    expect(checkServerToolRateLimit(tool, config, 10, state)).toBeUndefined();
    expect(checkServerToolRateLimit(tool, config, 20, state)).toBeUndefined();
  });

  it('persists rate limit buckets across runtime state instances', () => {
    const tool = makeTool('dns.lookup', ['network']);
    const filePath = join(
      mkdtempSync(join(tmpdir(), 'private-toolbox-rate-limit-')),
      'state.json'
    );
    const config = makeConfig({
      maxCalls: 1,
      windowMs: 1000,
      stateFilePath: filePath
    });

    expect(
      checkServerToolRateLimit(tool, config, 10, new Map())
    ).toBeUndefined();
    expect(checkServerToolRateLimit(tool, config, 20, new Map())).toMatchObject(
      {
        code: 'RATE_LIMITED',
        details: {
          tool: 'dns.lookup',
          scope: 'tool',
          retryAfterMs: 990
        }
      }
    );
    expect(
      checkServerToolRateLimit(tool, config, 1010, new Map())
    ).toBeUndefined();
  });

  it('ignores malformed persistent state files', () => {
    const tool = makeTool('dns.lookup', ['network']);
    const filePath = join(
      mkdtempSync(join(tmpdir(), 'private-toolbox-rate-limit-bad-')),
      'state.json'
    );
    writeFileSync(filePath, 'not json', 'utf-8');
    const config = makeConfig({
      maxCalls: 1,
      windowMs: 1000,
      stateFilePath: filePath
    });

    expect(
      checkServerToolRateLimit(tool, config, 10, new Map())
    ).toBeUndefined();
  });
});
