import { sortJson as sortJsonCore } from '@private-toolbox/core';
import { InitialValuesType } from './types';

export const sortJson = (text: string, options: InitialValuesType): string => {
  const { mode, order, key } = options;
  return sortJsonCore({
    text,
    mode,
    order,
    key,
    spacesCount: 2
  });
};
