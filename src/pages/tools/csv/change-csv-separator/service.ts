import { InitialValuesType } from './types';
import { changeCsvSeparator as changeCsvSeparatorCore } from '@private-toolbox/core';

export function changeCsvSeparator(
  input: string,
  options: InitialValuesType
): string {
  if (!input) return '';

  return changeCsvSeparatorCore({
    text: input,
    delimiter: options.inputSeparator,
    quote: options.inputQuoteCharacter,
    comment: options.commentCharacter,
    skipEmptyLines: options.emptyLines,
    outputDelimiter: options.outputSeparator,
    outputQuote: options.OutputQuoteCharacter,
    quoteAll: options.outputQuoteAll
  }).text;
}
