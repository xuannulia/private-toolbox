import { changeTextCase, type TextCaseMode } from '@private-toolbox/core';

export function UppercaseInput(
  input: string,
  mode: TextCaseMode = 'uppercase'
): string {
  return changeTextCase(input, mode).output;
}
