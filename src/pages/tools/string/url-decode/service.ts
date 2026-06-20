import { decodeUrlComponent } from '@private-toolbox/core';

export function decodeString(input: string): string {
  if (!input) return '';
  return decodeUrlComponent({ text: input });
}
