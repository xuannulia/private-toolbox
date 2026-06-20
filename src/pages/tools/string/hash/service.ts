import { hashText, type HashAlgorithm } from '@private-toolbox/core';

export type TextHashOptions = {
  text: string;
  algorithm: HashAlgorithm;
};

export const createTextHash = async ({
  text,
  algorithm
}: TextHashOptions): Promise<string> => {
  if (!text) return '';
  const result = await hashText({ text, algorithm });
  return result.hex;
};
