import { describe, expect, it } from 'vitest';
import { convertTimestamp, timestampTools } from './timestamp';

describe('convertTimestamp', () => {
  it('converts Unix seconds to UTC date fields', () => {
    const result = convertTimestamp({
      value: '0',
      mode: 'unix_to_date',
      unit: 'seconds'
    });

    expect(result.unixSeconds).toBe(0);
    expect(result.unixMilliseconds).toBe(0);
    expect(result.iso).toBe('1970-01-01T00:00:00.000Z');
    expect(result.formattedUtc).toBe('1970-01-01 00:00:00.000');
    expect(result.unit).toBe('seconds');
  });

  it('auto-detects Unix milliseconds', () => {
    const result = convertTimestamp({
      value: '1234567890000',
      mode: 'unix_to_date'
    });

    expect(result.unit).toBe('milliseconds');
    expect(result.unixSeconds).toBe(1234567890);
    expect(result.formattedUtc).toBe('2009-02-13 23:31:30.000');
  });

  it('converts UTC dates to Unix timestamps', () => {
    const result = convertTimestamp({
      value: '2009-02-13 23:31:30',
      mode: 'date_to_unix'
    });

    expect(result.unixSeconds).toBe(1234567890);
    expect(result.utcOffset).toBe('Z');
  });

  it('honors UTC offsets in date input', () => {
    const result = convertTimestamp({
      value: '2025-04-04 10:00:00 +08:00',
      mode: 'date_to_unix'
    });

    expect(result.unixSeconds).toBe(1743732000);
    expect(result.utcOffset).toBe('+08:00');
  });

  it('rejects invalid Unix timestamps', () => {
    expect(() =>
      convertTimestamp({ value: 'not-a-number', mode: 'unix_to_date' })
    ).toThrow('Unix timestamp must be numeric');
  });
});

describe('timestampTools', () => {
  it('registers timestamp.convert for Web, API, and MCP', () => {
    const tool = timestampTools.find((item) => item.name === 'timestamp.convert');

    expect(tool?.channels).toEqual(['web', 'api', 'mcp']);
    expect(tool?.risks).toEqual(['local']);
  });
});
