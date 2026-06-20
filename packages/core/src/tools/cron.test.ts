import { describe, expect, it } from 'vitest';
import {
  convertCronExpression,
  cronTools,
  getCronCalendar,
  getCronTemplate,
  getCronNextRuns,
  parseCronExpression,
  validateCronExpression
} from './cron';

describe('validateCronExpression', () => {
  it('validates standard cron expressions', () => {
    expect(
      validateCronExpression({ expression: '35 16 * * 0-5' })
    ).toMatchObject({
      valid: true,
      normalizedExpression: '0 35 16 * * 0-5',
      hasSeconds: false,
      isAlias: false,
      dialect: 'crontab',
      fieldCount: 5,
      error: null
    });
  });

  it('validates aliases and six-field cron expressions', () => {
    expect(validateCronExpression({ expression: '@daily' })).toMatchObject({
      valid: true,
      normalizedExpression: '0 0 0 * * *',
      isAlias: true
    });
    expect(
      validateCronExpression({ expression: '0 */15 * * * *' })
    ).toMatchObject({
      valid: true,
      normalizedExpression: '0 */15 * * * *',
      hasSeconds: true,
      dialect: 'crontab',
      fieldCount: 6
    });
  });

  it('validates Quartz cron expressions with an optional year field', () => {
    expect(
      validateCronExpression({
        expression: '0 0 12 ? * MON-FRI 2026',
        dialect: 'quartz'
      })
    ).toMatchObject({
      valid: true,
      normalizedExpression: '0 0 12 ? * 1-5 2026',
      hasSeconds: true,
      dialect: 'quartz',
      fieldCount: 7,
      quartzYear: '2026',
      error: null
    });
  });

  it('returns a structured invalid result', () => {
    const result = validateCronExpression({ expression: '61 24 * * *' });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Constraint error');
  });
});

describe('parseCronExpression', () => {
  it('explains and breaks down a valid expression', () => {
    const result = parseCronExpression({ expression: '*/5 * * * *' });

    expect(result.valid).toBe(true);
    expect(result.description).toBe('Every 5 minutes');
    expect(result.fields).toEqual({
      second: '0',
      minute: '*/5',
      hour: '*',
      dayOfMonth: '*',
      month: '*',
      dayOfWeek: '*'
    });
  });

  it('explains Quartz cron fields including year', () => {
    const result = parseCronExpression({
      expression: '0 15 10 ? * 6#3 2026',
      dialect: 'quartz'
    });

    expect(result.valid).toBe(true);
    expect(result.dialect).toBe('quartz');
    expect(result.description).toContain('third');
    expect(result.fields).toMatchObject({
      second: '0',
      minute: '15',
      hour: '10',
      dayOfMonth: '?',
      month: '*',
      dayOfWeek: '6#3',
      year: '2026'
    });
  });

  it('returns null explanation fields for invalid expressions', () => {
    const result = parseCronExpression({ expression: 'invalid expression' });

    expect(result.valid).toBe(false);
    expect(result.description).toBeNull();
    expect(result.fields).toBeNull();
  });
});

describe('convertCronExpression', () => {
  it('converts crontab expressions to Quartz expressions', () => {
    const result = convertCronExpression({
      expression: '0 9 * * 1-5',
      targetDialect: 'quartz'
    });

    expect(result).toMatchObject({
      sourceDialect: 'crontab',
      targetDialect: 'quartz',
      convertedExpression: '0 0 9 ? * 1-5',
      normalizedExpression: '0 0 9 ? * 1-5',
      warnings: []
    });
  });

  it('converts Quartz expressions back to crontab expressions', () => {
    const result = convertCronExpression({
      expression: '0 0 9 ? * MON-FRI 2026',
      sourceDialect: 'quartz',
      targetDialect: 'crontab'
    });

    expect(result.convertedExpression).toBe('0 9 * * 1-5');
    expect(result.warnings[0]).toContain('Dropped Quartz year field 2026');
  });

  it('exposes cron.convert to web, API, and MCP', () => {
    expect(
      cronTools.find((tool) => tool.name === 'cron.convert')?.channels
    ).toEqual(['web', 'api', 'mcp']);
  });
});

describe('getCronNextRuns', () => {
  it('returns deterministic upcoming ISO run times', () => {
    const result = getCronNextRuns({
      expression: '*/15 * * * *',
      count: 3,
      currentDate: '2026-06-19T00:00:00.000Z',
      timezone: 'UTC'
    });

    expect(result.runs.map((run) => run.iso)).toEqual([
      '2026-06-19T00:15:00.000Z',
      '2026-06-19T00:30:00.000Z',
      '2026-06-19T00:45:00.000Z'
    ]);
  });

  it('rejects invalid counts', () => {
    expect(() =>
      getCronNextRuns({
        expression: '* * * * *',
        count: 100
      })
    ).toThrow('count must be an integer from 1 to 50');
  });
});

describe('getCronTemplate', () => {
  it('returns common cron templates with parsed fields', () => {
    const result = getCronTemplate({ template: 'weekday_9am' });

    expect(result).toMatchObject({
      template: 'weekday_9am',
      title: 'Weekdays at 9:00 AM',
      expression: '0 9 * * 1-5',
      normalizedExpression: '0 0 9 * * 1-5',
      fields: {
        second: '0',
        minute: '0',
        hour: '9',
        dayOfMonth: '*',
        month: '*',
        dayOfWeek: '1-5'
      }
    });
    expect(result.description).toContain('Monday through Friday');
  });

  it('rejects unknown templates', () => {
    expect(() =>
      getCronTemplate({
        template: 'not_real' as never
      })
    ).toThrow('Unsupported cron template');
  });

  it('exposes cron.template to web, API, and MCP', () => {
    expect(
      cronTools.find((tool) => tool.name === 'cron.template')?.channels
    ).toEqual(['web', 'api', 'mcp']);
  });
});

describe('getCronCalendar', () => {
  it('builds a month calendar with per-day run counts', () => {
    const result = getCronCalendar({
      expression: '0 9 * * 1-5',
      year: 2026,
      month: 6,
      timezone: 'UTC'
    });

    const days = result.weeks.flatMap((week) => week.days);
    const juneFirst = days.find((day) => day.date === '2026-06-01');
    const juneSixth = days.find((day) => day.date === '2026-06-06');

    expect(result).toMatchObject({
      expression: '0 9 * * 1-5',
      normalizedExpression: '0 0 9 * * 1-5',
      timezone: 'UTC',
      year: 2026,
      month: 6,
      weekStartsOn: 1,
      truncated: false
    });
    expect(result.weeks).toHaveLength(6);
    expect(juneFirst?.runCount).toBe(1);
    expect(juneFirst?.runs[0]?.localTime).toBe('09:00:00');
    expect(juneSixth?.runCount).toBe(0);
    expect(result.totalRuns).toBe(22);
  });

  it('truncates dense schedules with a warning', () => {
    const result = getCronCalendar({
      expression: '* * * * *',
      year: 2026,
      month: 6,
      timezone: 'UTC',
      maxRuns: 10
    });

    expect(result.totalRuns).toBe(10);
    expect(result.truncated).toBe(true);
    expect(result.warnings[0]).toContain('stopped after 10 runs');
  });

  it('exposes cron.calendar to web, API, and MCP', () => {
    expect(
      cronTools.find((tool) => tool.name === 'cron.calendar')?.channels
    ).toEqual(['web', 'api', 'mcp']);
  });
});
