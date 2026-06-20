import { shuffleListItems } from '@private-toolbox/core';

export type SplitOperatorType = 'symbol' | 'regex';

export function shuffleList(
  splitOperatorType: SplitOperatorType,
  input: string,
  splitSeparator: string,
  joinSeparator: string,
  length?: number //  "?" is to handle the case the user let the input blank
): string {
  if (length !== undefined) {
    if (length <= 0) {
      throw new Error('Length value must be a positive number.');
    }
  }

  return shuffleListItems({
    text: input,
    splitMode: splitOperatorType === 'regex' ? 'regex' : 'separator',
    separator: splitSeparator,
    joinSeparator,
    limit: length
  }).result;
}
