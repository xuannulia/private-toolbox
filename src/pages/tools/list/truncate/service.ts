import { truncateListItems } from '@private-toolbox/core';

export type SplitOperatorType = 'symbol' | 'regex';

export function truncateList(
  splitOperatorType: SplitOperatorType,
  input: string,
  splitSeparator: string,
  joinSeparator: string,
  end: boolean,
  length?: number
): string {
  if (length !== undefined) {
    if (length < 0) {
      throw new Error('Length value must be a positive number.');
    }
    return truncateListItems({
      text: input,
      splitMode: splitOperatorType === 'regex' ? 'regex' : 'separator',
      separator: splitSeparator,
      joinSeparator,
      length,
      from: end ? 'start' : 'end'
    }).result;
  }
  throw new Error("Length value isn't a value number.");
}
