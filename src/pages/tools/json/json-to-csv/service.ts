import { convertJsonToCsv as convertJsonToCsvCore } from '@private-toolbox/core';
import { InitialValuesType } from './types';

export function convertJsonToCsv(
  input: string,
  options: InitialValuesType
): string {
  try {
    return convertJsonToCsvCore(input, options);
  } catch (error) {
    if (
      error instanceof Error &&
      ![
        'No CSV delimiter.',
        'JSON input must be an object or array of objects, not a bare primitive.',
        'No data found in the provided JSON.'
      ].includes(error.message)
    ) {
      throw new Error('Invalid JSON input.');
    }
    throw error;
  }
}
