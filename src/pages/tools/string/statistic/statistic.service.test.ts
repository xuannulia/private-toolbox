import { describe, expect, it } from 'vitest';
import { textStatistics } from './service';
import { type InitialValuesType } from './types';

const defaultOptions: InitialValuesType = {
  emptyLines: false,
  sentenceDelimiters: '',
  wordDelimiters: '',
  characterCount: false,
  wordCount: false
};

describe('textStatistics', () => {
  it('formats basic text statistics', () => {
    expect(textStatistics('Hello world!', defaultOptions)).toBe(`Text Statistics
==================
Characters: 12
Words: 2
Lines: 1
Sentences: 1
Paragraphs: 1`);
  });

  it('includes frequency tables when enabled', () => {
    const result = textStatistics('Apple apple banana', {
      ...defaultOptions,
      wordCount: true,
      characterCount: true
    });

    expect(result).toContain('Words Frequency');
    expect(result).toContain('apple: 2 (66.67%)');
    expect(result).toContain('Characters Frequency');
    expect(result).toContain('p: 4 (22.22%)');
  });

  it('supports empty line counting', () => {
    expect(
      textStatistics('a\n\nb', {
        ...defaultOptions,
        emptyLines: true
      })
    ).toContain('Lines: 3');
  });
});
