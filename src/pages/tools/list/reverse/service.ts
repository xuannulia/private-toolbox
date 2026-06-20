import { reverseListItems } from '@private-toolbox/core';

export type SplitOperatorType = 'symbol' | 'regex';

export function reverseList(
  splitOperatorType: SplitOperatorType,
  splitSeparator: string,
  joinSeparator: string = '\n',
  input: string
): string {
  return reverseListItems({
    text: input,
    splitMode: splitOperatorType === 'regex' ? 'regex' : 'separator',
    separator: splitSeparator,
    joinSeparator,
    removeEmpty: splitOperatorType === 'regex'
  }).result;
}
