import { chunkListItems } from '@private-toolbox/core';

export type SplitOperatorType = 'symbol' | 'regex';

export function chunkList(
  splitOperatorType: SplitOperatorType,
  splitSeparator: string,
  input: string,
  chunkNumber: number,
  itemSeparator: string = '',
  leftWrap: string = '',
  rightWrap: string = '',
  chunkSeparator: string,
  deleteEmptyItems: boolean,
  padNonFullChunk: boolean,
  paddingChar: string = ''
): string {
  if (!splitSeparator) return '';

  return chunkListItems({
    text: input,
    splitMode: splitOperatorType === 'regex' ? 'regex' : 'separator',
    separator: splitSeparator,
    chunkSize: chunkNumber,
    itemSeparator,
    chunkSeparator,
    leftWrap,
    rightWrap,
    removeEmpty: deleteEmptyItems,
    pad: padNonFullChunk,
    paddingItem: paddingChar
  }).result;
}
