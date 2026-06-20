import { InitialValuesType } from './types';
import { tsvToJson } from '@private-toolbox/core';

export function convertTsvToJson(
  input: string,
  options: InitialValuesType
): string {
  if (!input) return '';

  const result = tsvToJson({
    text: input,
    delimiter: options.delimiter,
    quote: options.quote,
    comment: options.comment,
    useHeaders: options.useHeaders,
    skipEmptyLines: options.skipEmptyLines,
    dynamicTypes: options.dynamicTypes
  }).json;

  if (options.indentationType === 'none') {
    return JSON.stringify(result);
  }

  return JSON.stringify(
    result,
    null,
    options.indentationType === 'tab' ? '\t' : options.spacesCount
  );
}
