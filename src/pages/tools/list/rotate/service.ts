import { rotateListItems } from '@private-toolbox/core';

export type SplitOperatorType = 'symbol' | 'regex';

export function rotateList(
  splitOperatorType: SplitOperatorType,
  input: string,
  splitSeparator: string,
  joinSeparator: string,
  right: boolean,
  step?: number
): string {
  if (step !== undefined) {
    if (step <= 0) {
      throw new Error('Rotation step must be greater than zero.');
    }
    return rotateListItems({
      text: input,
      splitMode: splitOperatorType === 'regex' ? 'regex' : 'separator',
      separator: splitSeparator,
      joinSeparator,
      direction: right ? 'right' : 'left',
      step
    }).result;
  }
  throw new Error('Rotation step contains non-digits.');
}
