import { sumNumbers, type NumberExtractionType } from '@private-toolbox/core';

export type { NumberExtractionType };

export const compute = (
  input: string,
  extractionType: NumberExtractionType,
  printRunningSum: boolean,
  separator: string
): string =>
  sumNumbers({
    text: input,
    extractionType,
    printRunningSum,
    separator
  }).result;
