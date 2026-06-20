import { validateJson as validateJsonCore } from '@private-toolbox/core';

export const validateJson = (
  input: string
): { valid: boolean; error?: string } => {
  return validateJsonCore({ text: input });
};
