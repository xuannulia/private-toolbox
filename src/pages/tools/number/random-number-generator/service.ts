import {
  formatRandomNumbers as formatSharedRandomNumbers,
  generateRandomNumbers as generateSharedRandomNumbers
} from '@private-toolbox/core';
import { InitialValuesType, RandomNumberResult } from './types';

/**
 * Generate random numbers within a specified range
 */
export function generateRandomNumbers(
  options: InitialValuesType
): RandomNumberResult {
  if (options.minValue >= options.maxValue) {
    throw new Error('Minimum value must be less than maximum value');
  }

  if (options.count <= 0) {
    throw new Error('Count must be greater than 0');
  }

  if (
    !options.allowDuplicates &&
    !options.allowDecimals &&
    options.count > options.maxValue - options.minValue + 1
  ) {
    throw new Error(
      'Cannot generate unique numbers: count exceeds available range'
    );
  }

  const result = generateSharedRandomNumbers({
    minValue: options.minValue,
    maxValue: options.maxValue,
    count: options.count,
    allowDecimals: options.allowDecimals,
    allowDuplicates: options.allowDuplicates,
    sortResults: options.sortResults,
    separator: options.separator,
    precision: options.allowDecimals ? 2 : 0
  });

  return {
    numbers: result.numbers,
    min: result.min,
    max: result.max,
    count: result.count,
    hasDuplicates: result.hasDuplicates,
    isSorted: result.isSorted
  };
}

/**
 * Format numbers for display
 */
export function formatNumbers(
  numbers: number[],
  separator: string,
  allowDecimals: boolean
): string {
  return formatSharedRandomNumbers(numbers, separator, allowDecimals, 2);
}

/**
 * Validate input parameters
 */
export function validateInput(options: InitialValuesType): string | null {
  const { minValue, maxValue, count } = options;

  if (minValue >= maxValue) {
    return 'Minimum value must be less than maximum value';
  }

  if (count <= 0) {
    return 'Count must be greater than 0';
  }

  if (count > 10000) {
    return 'Count cannot exceed 10,000';
  }

  if (maxValue - minValue > 1000000) {
    return 'Range cannot exceed 1,000,000';
  }

  return null;
}
