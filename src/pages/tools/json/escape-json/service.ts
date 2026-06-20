import { escapeJson as escapeJsonCore } from '@private-toolbox/core';

export const escapeJson = (input: string, wrapInQuotesFlag: boolean): string =>
  escapeJsonCore({
    text: input,
    wrapInQuotes: wrapInQuotesFlag
  });
