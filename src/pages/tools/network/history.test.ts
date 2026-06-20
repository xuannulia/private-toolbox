import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildNetworkLookupHistoryLabel,
  clearNetworkLookupHistory,
  getNetworkLookupHistory,
  recordNetworkLookupHistory
} from './history';
import { type NetworkField } from './shared/NetworkLookupTool';

const fields: NetworkField[] = [
  { name: 'name', label: 'Name' },
  { name: 'type', label: 'Type', defaultValue: 'A' }
];

describe('network lookup history', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('builds a compact label from non-empty field values', () => {
    expect(
      buildNetworkLookupHistoryLabel(fields, {
        name: ' example.com ',
        type: ' A '
      })
    ).toBe('example.com / A');
  });

  it('records newest queries first and deduplicates by values', () => {
    recordNetworkLookupHistory('dns.lookup', fields, {
      name: 'example.com',
      type: 'A'
    });
    recordNetworkLookupHistory('dns.lookup', fields, {
      name: 'openai.com',
      type: 'AAAA'
    });
    recordNetworkLookupHistory('dns.lookup', fields, {
      name: 'example.com',
      type: 'A'
    });

    expect(getNetworkLookupHistory('dns.lookup')).toMatchObject([
      { label: 'example.com / A' },
      { label: 'openai.com / AAAA' }
    ]);
  });

  it('ignores a query that only contains default values', () => {
    recordNetworkLookupHistory('dns.lookup', fields, {
      name: '',
      type: 'A'
    });

    expect(getNetworkLookupHistory('dns.lookup')).toEqual([]);
  });

  it('keeps only the latest eight entries', () => {
    for (let index = 0; index < 10; index += 1) {
      recordNetworkLookupHistory('dns.lookup', fields, {
        name: `example-${index}.com`,
        type: 'A'
      });
    }

    expect(
      getNetworkLookupHistory('dns.lookup').map((entry) => entry.label)
    ).toEqual([
      'example-9.com / A',
      'example-8.com / A',
      'example-7.com / A',
      'example-6.com / A',
      'example-5.com / A',
      'example-4.com / A',
      'example-3.com / A',
      'example-2.com / A'
    ]);
  });

  it('clears per-tool history', () => {
    recordNetworkLookupHistory('dns.lookup', fields, {
      name: 'example.com',
      type: 'A'
    });

    clearNetworkLookupHistory('dns.lookup');

    expect(getNetworkLookupHistory('dns.lookup')).toEqual([]);
  });
});
