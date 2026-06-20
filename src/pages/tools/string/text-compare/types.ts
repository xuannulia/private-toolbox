import { type TextDiffLevel } from '@private-toolbox/core';

export type level = Extract<TextDiffLevel, 'word' | 'char'>;

export type InitialValuesType = {
  level: level;
};
