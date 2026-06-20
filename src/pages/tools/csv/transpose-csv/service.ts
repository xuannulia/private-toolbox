import { InitialValuesType } from './types';
import { transposeCsv } from '@private-toolbox/core';

export function transposeCSV(
  input: string,
  options: InitialValuesType
): string {
  if (!input) return '';

  return transposeCsv({
    text: input,
    delimiter: options.separator,
    quote: options.quoteChar,
    comment: options.commentCharacter,
    skipEmptyLines: true,
    fillMissing: true,
    fillValue: options.customFill ? options.customFillValue : ''
  }).text;
}
