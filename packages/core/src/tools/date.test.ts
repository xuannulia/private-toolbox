import { describe, expect, it } from 'vitest';
import { calculateDateDiff, dateTools } from './date';

describe('calculateDateDiff', () => {
  it('calculates a leap-year date interval', () => {
    const result = calculateDateDiff({
      start: '2024-02-28T00:00:00.000Z',
      end: '2024-03-01T00:00:00.000Z'
    });

    expect(result.direction).toBe('forward');
    expect(result.totals.days).toBe(2);
    expect(result.breakdown).toEqual({
      years: 0,
      months: 0,
      days: 2,
      hours: 0,
      minutes: 0,
      seconds: 0,
      milliseconds: 0
    });
    expect(result.human).toBe('2 days');
  });

  it('uses calendar months before clock units', () => {
    const result = calculateDateDiff({
      start: '2024-01-31T00:00:00.000Z',
      end: '2024-02-29T00:00:00.000Z'
    });

    expect(result.breakdown.months).toBe(1);
    expect(result.breakdown.days).toBe(0);
    expect(result.human).toBe('1 month');
  });

  it('reports reversed inputs while returning an absolute interval', () => {
    const result = calculateDateDiff({
      start: '2026-06-19T12:00:00.000Z',
      end: '2026-06-19T00:00:00.000Z'
    });

    expect(result.direction).toBe('backward');
    expect(result.totals.hours).toBe(12);
    expect(result.breakdown.hours).toBe(12);
  });

  it('rejects invalid dates', () => {
    expect(() =>
      calculateDateDiff({
        start: 'not-a-date',
        end: '2026-06-19T00:00:00.000Z'
      })
    ).toThrow('Invalid start');
  });

  it('exposes date.diff to web, API, and MCP', () => {
    expect(
      dateTools.find((tool) => tool.name === 'date.diff')?.channels
    ).toEqual(['web', 'api', 'mcp']);
  });
});
