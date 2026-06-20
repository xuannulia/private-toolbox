import { formatJson } from '@private-toolbox/core';

export const beautifyJson = (
  text: string,
  indentationType: 'tab' | 'space',
  spacesCount: number
) => {
  try {
    return formatJson({ text, indentationType, spacesCount });
  } catch (e) {
    throw new Error('Invalid JSON string');
  }
};
