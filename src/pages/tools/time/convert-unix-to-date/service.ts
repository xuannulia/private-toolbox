import { convertTimestamp } from '@private-toolbox/core';
import InitialValuesType from './types';

function computeUnixToDate(input: string, useLocalTime: boolean): string {
  if (!/^\d+$/.test(input)) {
    return '';
  }

  if (input.length > 10) return 'ms not supported, divide by 1000';

  try {
    const result = convertTimestamp({
      value: input,
      mode: 'unix_to_date',
      unit: 'seconds',
      timezone: useLocalTime ? 'local' : 'utc'
    });
    return useLocalTime ? result.formattedLocal : result.formattedUtc;
  } catch {
    return '';
  }
}

function computeDateToUnix(input: string, useLocalTime: boolean): string {
  try {
    const result = convertTimestamp({
      value: input,
      mode: 'date_to_unix',
      timezone: useLocalTime ? 'local' : 'utc'
    });
    return `${result.unixSeconds}`;
  } catch {
    return '';
  }
}

export function UnixDateConverter(
  input: string,
  options: InitialValuesType
): string {
  if (!input) return '';

  const { mode, useLocalTime, withLabel } = options;

  const lines = input.split('\n');

  if (mode === 'unix-to-date') {
    const label = !useLocalTime && withLabel ? ' UTC' : '';
    return lines
      .map((line) => {
        const formattedDate = computeUnixToDate(line.trim(), useLocalTime);
        return formattedDate ? `${formattedDate}${label}` : '';
      })
      .join('\n');
  }

  return lines
    .map((line) => computeDateToUnix(line.trim(), useLocalTime))
    .join('\n');
}
