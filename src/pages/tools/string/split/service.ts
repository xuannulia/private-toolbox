import { splitText } from '@private-toolbox/core';

export type SplitOperatorType = 'symbol' | 'regex' | 'length' | 'chunks';

export function compute(
  splitSeparatorType: SplitOperatorType,
  input: string,
  symbolValue: string,
  regexValue: string,
  lengthValue: number,
  chunksValue: number,
  charBeforeChunk: string,
  charAfterChunk: string,
  outputSeparator: string
) {
  if (splitSeparatorType === 'length' && lengthValue <= 0) {
    throw new Error('Length must be a positive number');
  }

  if (splitSeparatorType === 'chunks' && chunksValue <= 0) {
    throw new Error('Number of chunks must be a positive number');
  }

  return splitText({
    text: input,
    mode: splitSeparatorType,
    symbol: symbolValue,
    regex: regexValue,
    length: lengthValue,
    chunks: chunksValue,
    prefix: charBeforeChunk,
    suffix: charAfterChunk,
    outputSeparator
  }).output;
}
