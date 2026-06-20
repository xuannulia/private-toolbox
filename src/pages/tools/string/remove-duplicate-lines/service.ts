import {
  removeDuplicateLines as removeDuplicateLinesCore,
  type TextDuplicateKeyMode,
  type TextDuplicateNewlineMode,
  type TextDuplicateRemovalMode
} from '@private-toolbox/core';

export type NewlineOption = TextDuplicateNewlineMode;
export type DuplicateRemovalMode = TextDuplicateRemovalMode;
export type DuplicateKeyMode = TextDuplicateKeyMode;

export interface DuplicateRemoverOptions {
  mode: DuplicateRemovalMode;
  keyMode?: DuplicateKeyMode;
  newlines: NewlineOption;
  sortLines: boolean;
  trimTextLines: boolean;
  fieldDelimiter?: string;
  keyIndex?: number;
  keyRegex?: string;
  keyRegexFlags?: string;
  keyRegexGroup?: string;
}

export default function removeDuplicateLines(
  text: string,
  options: DuplicateRemoverOptions
): string {
  return removeDuplicateLinesCore({
    text,
    mode: options.mode,
    keyMode: options.keyMode,
    newlines: options.newlines,
    sortLines: options.sortLines,
    trimLines: options.trimTextLines,
    fieldDelimiter: options.fieldDelimiter,
    keyIndex: options.keyIndex,
    keyRegex: options.keyRegex,
    keyRegexFlags: options.keyRegexFlags,
    keyRegexGroup: options.keyRegexGroup
  }).output;
}
