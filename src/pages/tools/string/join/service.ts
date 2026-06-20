import { joinText } from '@private-toolbox/core';

export function mergeText(
  text: string,
  deleteBlankLines: boolean = true,
  deleteTrailingSpaces: boolean = true,
  joinCharacter: string = ''
): string {
  return joinText({
    text,
    deleteBlankLines,
    trimTrailingSpaces: deleteTrailingSpaces,
    joiner: joinCharacter
  }).output;
}
