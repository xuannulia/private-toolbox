import { formatJson } from '@private-toolbox/core/tools/json';

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
