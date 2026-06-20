import { generatePassword as generateSharedPassword } from '@private-toolbox/core';
import type { InitialValuesType } from './initialValues';

export function generatePassword(options: InitialValuesType): string {
  try {
    return generateSharedPassword({
      length: options.length,
      includeLowercase: options.includeLowercase,
      includeUppercase: options.includeUppercase,
      includeNumbers: options.includeNumbers,
      includeSymbols: options.includeSymbols,
      avoidAmbiguous: options.avoidAmbiguous
    }).password;
  } catch {
    return '';
  }
}
