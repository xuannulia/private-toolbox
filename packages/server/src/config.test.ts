import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import {
  assertNetworkDataSourceEnabled,
  getDefaultServerRuntimeConfig,
  mergeNetworkToolConfig
} from './config';

const restoreEnv = (name: string, value: string | undefined) => {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
};

describe('server network config', () => {
  it('merges data source switches without dropping defaults', () => {
    const config = mergeNetworkToolConfig({
      dataSources: {
        ippure: false
      }
    });

    expect(config.dataSources).toMatchObject({
      ippure: false
    });
  });

  it('throws a structured error when a data source is disabled', () => {
    expect(() =>
      assertNetworkDataSourceEnabled('ippure', {
        dataSources: {
          ippure: false
        }
      })
    ).toThrow('Network data source is disabled: ippure');
  });

  it('reads per-tool and per-data-source rate limit overrides from env', () => {
    const previousToolOverrides =
      process.env.PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_TOOL_OVERRIDES;
    const previousDataSourceOverrides =
      process.env.PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_DATA_SOURCE_OVERRIDES;
    const previousIpPureMax =
      process.env.PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_IPPURE_MAX;
    const previousStateFile =
      process.env.PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_STATE_FILE;

    try {
      process.env.PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_TOOL_OVERRIDES =
        '{"dns.lookup":{"maxCalls":10,"windowMs":2000}}';
      process.env.PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_DATA_SOURCE_OVERRIDES =
        '{"ippure":{"maxCalls":3,"windowMs":4000}}';
      process.env.PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_IPPURE_MAX = '5';
      process.env.PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_STATE_FILE =
        './rate-limit-state.json';

      const config = getDefaultServerRuntimeConfig();

      expect(config.networkRateLimit.toolOverrides['dns.lookup']).toEqual({
        maxCalls: 10,
        windowMs: 2000
      });
      expect(config.networkRateLimit.dataSourceOverrides.ippure).toEqual({
        maxCalls: 3,
        windowMs: 4000
      });
      expect(config.networkRateLimit.toolDataSources['ip.lookup']).toBe(
        'ippure'
      );
      expect(config.networkRateLimit.stateFilePath).toBe(
        resolve('./rate-limit-state.json')
      );
    } finally {
      restoreEnv(
        'PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_TOOL_OVERRIDES',
        previousToolOverrides
      );
      restoreEnv(
        'PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_DATA_SOURCE_OVERRIDES',
        previousDataSourceOverrides
      );
      restoreEnv(
        'PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_IPPURE_MAX',
        previousIpPureMax
      );
      restoreEnv(
        'PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_STATE_FILE',
        previousStateFile
      );
    }
  });
});
