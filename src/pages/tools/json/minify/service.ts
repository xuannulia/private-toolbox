import { minifyJson as minifyJsonCore } from '@private-toolbox/core';

export const minifyJson = (text: string) => {
  try {
    return minifyJsonCore({ text });
  } catch (e) {
    throw new Error('Invalid JSON string');
  }
};
