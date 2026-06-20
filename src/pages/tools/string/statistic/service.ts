import { InitialValuesType } from './types';
import { getTextStats, type TextFrequencyItem } from '@private-toolbox/core';

const formatFrequency = (items: TextFrequencyItem[]): string =>
  items
    .map(
      (item) =>
        `${item.displayValue}: ${item.count} (${(item.percentage * 100).toFixed(
          2
        )}%)`
    )
    .join('\n');

const parseSentenceDelimiters = (value: string): string[] | undefined => {
  if (!value.trim()) return undefined;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export function textStatistics(
  input: string,
  options: InitialValuesType
): string {
  if (!input) return '';

  const statsResult = getTextStats({
    text: input,
    includeEmptyLines: options.emptyLines,
    sentenceDelimiters: parseSentenceDelimiters(options.sentenceDelimiters),
    wordDelimiters: options.wordDelimiters || undefined,
    includeCharacterFrequency: options.characterCount,
    includeWordFrequency: options.wordCount,
    maxFrequencyItems: 10_000
  });
  const wordsFrequency = formatFrequency(statsResult.wordFrequency);
  const characterStats = formatFrequency(statsResult.characterFrequency);

  const stats = `Text Statistics
==================
Characters: ${statsResult.characters}
Words: ${statsResult.words}
Lines: ${statsResult.lines}
Sentences: ${statsResult.sentences}
Paragraphs: ${statsResult.paragraphs}`;

  const charStats = `Characters Frequency
==================
${characterStats}`;

  const wordStatsOutput = `Words Frequency
==================
${wordsFrequency}`;

  let result = stats;
  if (options.wordCount) result += `\n\n${wordStatsOutput}`;
  if (options.characterCount) result += `\n\n${charStats}`;

  return result;
}
