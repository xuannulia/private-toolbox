import { decodeHex, encodeHex } from '@private-toolbox/core';

export type HexMode = 'encode' | 'decode';

export type HexOptions = {
  mode: HexMode;
  uppercase: boolean;
  separator: string;
};

export const convertHex = (input: string, options: HexOptions): string => {
  if (!input.length) {
    return '';
  }

  return options.mode === 'encode'
    ? encodeHex({
        text: input,
        uppercase: options.uppercase,
        separator: options.separator
      })
    : decodeHex({ text: input });
};
