import { InitialValuesType } from './types';
import { formatXmlDocument } from '@private-toolbox/core';

export function beautifyXml(
  input: string,
  _options: InitialValuesType
): string {
  const result = formatXmlDocument({
    text: input
  });

  return result.valid ? result.text : result.message;
}
