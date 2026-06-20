import { InitialValuesType } from './types';
import { validateXmlDocument } from '@private-toolbox/core';

export function validateXml(
  input: string,
  _options: InitialValuesType
): string {
  return validateXmlDocument({
    text: input
  }).message;
}
