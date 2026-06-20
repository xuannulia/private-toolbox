import { truncateTextCore } from '@private-toolbox/core';
import { InitialValuesType } from './initialValues';

export function truncateText(options: InitialValuesType, text: string) {
  const { truncationSide, maxLength, lineByLine, addIndicator, indicator } =
    options;

  const parsedMaxLength = parseInt(maxLength) || 0;

  if (parsedMaxLength < 0) {
    throw new Error('Length value cannot be negative');
  }

  if (
    addIndicator &&
    indicator.length > parsedMaxLength &&
    parsedMaxLength > 0
  ) {
    throw new Error('Indicator length is greater than truncation length');
  }

  return truncateTextCore({
    text,
    maxLength: parsedMaxLength,
    side: truncationSide,
    lineByLine,
    addIndicator,
    indicator
  }).output;
}
