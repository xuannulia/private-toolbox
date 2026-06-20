import { stringifyJson as stringifyJsonCore } from '@private-toolbox/core';

export const stringifyJson = (
  input: string,
  indentationType: 'tab' | 'space',
  spacesCount: number,
  escapeHtml: boolean
): string => {
  return stringifyJsonCore({
    text: input,
    indentationType,
    spacesCount,
    escapeHtml
  });
};
