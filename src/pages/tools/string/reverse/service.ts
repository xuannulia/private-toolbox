import { reverseText } from '@private-toolbox/core';

export function stringReverser(
  input: string,
  multiLine: boolean,
  emptyItems: boolean,
  trim: boolean
) {
  return reverseText({
    text: input,
    multiLine,
    removeEmptyItems: emptyItems,
    trimItems: trim
  }).output;
}
