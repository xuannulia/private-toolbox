import { slugifyText } from '@private-toolbox/core';
import { InitialValuesType } from './types';

export function slugGenerator(
  input: string,
  options: InitialValuesType
): string {
  return slugifyText({
    text: input,
    preserveCase: options.caseSensitive
  }).output;
}
