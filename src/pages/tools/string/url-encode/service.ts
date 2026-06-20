import { encodeUrlComponent } from '@private-toolbox/core';
import { InitialValuesType } from './types';

export function encodeString(
  input: string,
  options: InitialValuesType
): string {
  if (!input) return '';
  return encodeUrlComponent({
    text: input,
    encodeEveryCharacter: options.nonSpecialChar
  });
}
