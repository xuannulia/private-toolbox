import { InitialValuesType } from './types';
import { decodeUnicode, encodeUnicode } from '@private-toolbox/core';

export function unicode(input: string, options: InitialValuesType): string {
  if (!input) return '';
  if (options.mode === 'encode') {
    return encodeUnicode({ text: input, uppercase: options.uppercase });
  }

  return decodeUnicode({ text: input });
}
