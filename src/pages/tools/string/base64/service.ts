import { decodeBase64, encodeBase64 } from '@private-toolbox/core';

export function base64(input: string, encode: boolean): string {
  return encode ? encodeBase64({ text: input }) : decodeBase64({ text: input });
}
