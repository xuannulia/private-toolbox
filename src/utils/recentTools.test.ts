import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearRecentTools,
  getRecentToolPaths,
  recordRecentTool
} from './recentTools';

describe('recentTools', () => {
  beforeEach(() => {
    clearRecentTools();
  });

  it('records recently opened tools newest first', () => {
    recordRecentTool('json/prettify');
    recordRecentTool('network/dns-lookup');

    expect(getRecentToolPaths()).toEqual([
      'network/dns-lookup',
      'json/prettify'
    ]);
  });

  it('moves an existing tool to the front instead of duplicating it', () => {
    recordRecentTool('json/prettify');
    recordRecentTool('network/dns-lookup');
    recordRecentTool('json/prettify');

    expect(getRecentToolPaths()).toEqual([
      'json/prettify',
      'network/dns-lookup'
    ]);
  });

  it('keeps only the latest eight tools', () => {
    for (let index = 0; index < 10; index += 1) {
      recordRecentTool(`tool/${index}`);
    }

    expect(getRecentToolPaths()).toEqual([
      'tool/9',
      'tool/8',
      'tool/7',
      'tool/6',
      'tool/5',
      'tool/4',
      'tool/3',
      'tool/2'
    ]);
  });
});
