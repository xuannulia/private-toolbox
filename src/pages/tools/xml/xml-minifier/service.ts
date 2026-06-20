import { minifyXmlDocument } from '@private-toolbox/core';
import { InitialValuesType } from './types';

export function minifyXml(input: string, _options: InitialValuesType): string {
  const result = minifyXmlDocument({
    text: input
  });

  return result.valid ? result.text : result.message;
}
