import { diffChars, diffLines, diffWordsWithSpace, type Change } from 'diff';
import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type TextDiffLevel = 'word' | 'char' | 'line';

export type TextDiffInput = {
  left: string;
  right: string;
  level?: TextDiffLevel;
};

export type TextDiffPartType = 'added' | 'removed' | 'unchanged';

export type TextDiffPart = {
  type: TextDiffPartType;
  value: string;
  count: number;
};

export type TextDiffOutput = {
  level: TextDiffLevel;
  equal: boolean;
  partCount: number;
  addedPartCount: number;
  removedPartCount: number;
  unchangedPartCount: number;
  addedTokenCount: number;
  removedTokenCount: number;
  unchangedTokenCount: number;
  parts: TextDiffPart[];
};

export type TextFrequencyItem = {
  value: string;
  displayValue: string;
  count: number;
  percentage: number;
};

export type TextStatsInput = {
  text: string;
  includeEmptyLines?: boolean;
  sentenceDelimiters?: string[];
  wordDelimiters?: string;
  includeCharacterFrequency?: boolean;
  includeWordFrequency?: boolean;
  maxFrequencyItems?: number;
};

export type TextStatsOutput = {
  characters: number;
  codePoints: number;
  words: number;
  lines: number;
  sentences: number;
  paragraphs: number;
  bytesUtf8: number;
  characterFrequency: TextFrequencyItem[];
  wordFrequency: TextFrequencyItem[];
};

export type TextReplaceMode = 'literal' | 'regex';

export type TextReplaceInput = {
  text: string;
  search: string;
  replacement?: string;
  mode?: TextReplaceMode;
  flags?: string;
};

export type TextReplaceOutput = {
  output: string;
  mode: TextReplaceMode;
  replacementCount: number;
  matched: boolean;
};

export type TextDuplicateRemovalMode = 'all' | 'consecutive' | 'unique';
export type TextDuplicateKeyMode = 'line' | 'word' | 'field' | 'regex';
export type TextDuplicateNewlineMode = 'preserve' | 'filter' | 'delete';

export type TextRemoveDuplicateLinesInput = {
  text: string;
  mode?: TextDuplicateRemovalMode;
  keyMode?: TextDuplicateKeyMode;
  newlines?: TextDuplicateNewlineMode;
  sortLines?: boolean;
  trimLines?: boolean;
  fieldDelimiter?: string;
  keyIndex?: number;
  keyRegex?: string;
  keyRegexFlags?: string;
  keyRegexGroup?: string;
};

export type TextRemoveDuplicateLinesOutput = {
  output: string;
  mode: TextDuplicateRemovalMode;
  keyMode: TextDuplicateKeyMode;
  newlines: TextDuplicateNewlineMode;
  originalLineCount: number;
  outputLineCount: number;
  removedLineCount: number;
};

export type TextHiddenCharacterCategory =
  | 'RTL Override'
  | 'Invisible Character'
  | 'Control Character'
  | 'Regular';

export type TextHiddenCharacter = {
  char: string;
  displayValue: string;
  unicode: string;
  name: string;
  category: TextHiddenCharacterCategory;
  position: number;
  codePointIndex: number;
  isRTL: boolean;
  isInvisible: boolean;
  isZeroWidth: boolean;
};

export type TextHiddenCharsInput = {
  text: string;
  includeRtl?: boolean;
  includeInvisible?: boolean;
  includeZeroWidth?: boolean;
  includeControls?: boolean;
  maxItems?: number;
};

export type TextHiddenCharsOutput = {
  originalText: string;
  hiddenCharacters: TextHiddenCharacter[];
  hasRTLOverride: boolean;
  hasInvisibleChars: boolean;
  hasZeroWidthChars: boolean;
  hasControlChars: boolean;
  totalHiddenChars: number;
  truncated: boolean;
};

export type TextSlugInput = {
  text: string;
  preserveCase?: boolean;
  separator?: string;
};

export type TextSlugOutput = {
  output: string;
  separator: string;
  preserveCase: boolean;
  lineCount: number;
  changedLineCount: number;
};

export type TextSplitMode = 'symbol' | 'regex' | 'length' | 'chunks';

export type TextSplitInput = {
  text: string;
  mode?: TextSplitMode;
  symbol?: string;
  regex?: string;
  length?: number;
  chunks?: number;
  prefix?: string;
  suffix?: string;
  outputSeparator?: string;
};

export type TextSplitOutput = {
  output: string;
  parts: string[];
  partCount: number;
  mode: TextSplitMode;
  outputSeparator: string;
};

export type TextJoinInput = {
  text: string;
  joiner?: string;
  deleteBlankLines?: boolean;
  trimTrailingSpaces?: boolean;
};

export type TextJoinOutput = {
  output: string;
  originalLineCount: number;
  joinedLineCount: number;
  removedBlankLineCount: number;
  joiner: string;
};

export type TextTruncateSide = 'right' | 'left';

export type TextTruncateInput = {
  text: string;
  maxLength: number;
  side?: TextTruncateSide;
  lineByLine?: boolean;
  addIndicator?: boolean;
  indicator?: string;
};

export type TextTruncateOutput = {
  output: string;
  maxLength: number;
  side: TextTruncateSide;
  lineByLine: boolean;
  truncated: boolean;
};

export type TextReverseInput = {
  text: string;
  multiLine?: boolean;
  removeEmptyItems?: boolean;
  trimItems?: boolean;
};

export type TextReverseOutput = {
  output: string;
  itemCount: number;
  multiLine: boolean;
};

export type TextCaseOutput = {
  output: string;
  changed: boolean;
};

export type TextCaseMode =
  | 'uppercase'
  | 'lowercase'
  | 'title_case'
  | 'capitalize';

export type TextCamelSnakeMode = 'camel_to_snake' | 'snake_to_camel';

export type TextCamelSnakeInput = {
  text: string;
  mode?: TextCamelSnakeMode;
  pascalCase?: boolean;
};

export type TextCamelSnakeOutput = {
  output: string;
  mode: TextCamelSnakeMode;
  changed: boolean;
  lineCount: number;
};

export type TextFullHalfWidthMode = 'full_to_half' | 'half_to_full';

export type TextFullHalfWidthInput = {
  text: string;
  mode?: TextFullHalfWidthMode;
  convertSpaces?: boolean;
};

export type TextFullHalfWidthOutput = {
  output: string;
  mode: TextFullHalfWidthMode;
  changed: boolean;
};

const levels: TextDiffLevel[] = ['word', 'char', 'line'];
const replaceModes: TextReplaceMode[] = ['literal', 'regex'];
const duplicateRemovalModes: TextDuplicateRemovalMode[] = [
  'all',
  'consecutive',
  'unique'
];
const duplicateKeyModes: TextDuplicateKeyMode[] = [
  'line',
  'word',
  'field',
  'regex'
];
const duplicateNewlineModes: TextDuplicateNewlineMode[] = [
  'preserve',
  'filter',
  'delete'
];
const hiddenCharacterCategories: TextHiddenCharacterCategory[] = [
  'RTL Override',
  'Invisible Character',
  'Control Character',
  'Regular'
];
const splitModes: TextSplitMode[] = ['symbol', 'regex', 'length', 'chunks'];
const truncateSides: TextTruncateSide[] = ['right', 'left'];
const camelSnakeModes: TextCamelSnakeMode[] = [
  'camel_to_snake',
  'snake_to_camel'
];
const fullHalfWidthModes: TextFullHalfWidthMode[] = [
  'full_to_half',
  'half_to_full'
];
const maxTextLength = 200_000;
const maxFrequencyItemsLimit = 10_000;
const maxHiddenCharactersLimit = 10_000;
const defaultSentenceDelimiters = ['.', '!', '?', '...'];
const defaultWordDelimiters = '\\s.,;:!?"“”«»()…';
const displayValues: Record<string, string> = {
  ' ': '␣',
  '\n': '↲',
  '\t': '⇥',
  '\r': '␍',
  '\f': '␌',
  '\v': '␋'
};
const rtlCharacters = [
  { char: '\u202E', name: 'Right-to-Left Override', unicode: 'U+202E' },
  { char: '\u202D', name: 'Left-to-Right Override', unicode: 'U+202D' },
  { char: '\u202B', name: 'Right-to-Left Embedding', unicode: 'U+202B' },
  { char: '\u202A', name: 'Left-to-Right Embedding', unicode: 'U+202A' },
  { char: '\u200F', name: 'Right-to-Left Mark', unicode: 'U+200F' },
  { char: '\u200E', name: 'Left-to-Right Mark', unicode: 'U+200E' }
];
const invisibleCharacters = [
  { char: '\u200B', name: 'Zero Width Space', unicode: 'U+200B' },
  { char: '\u200C', name: 'Zero Width Non-Joiner', unicode: 'U+200C' },
  { char: '\u200D', name: 'Zero Width Joiner', unicode: 'U+200D' },
  { char: '\u2060', name: 'Word Joiner', unicode: 'U+2060' },
  { char: '\uFEFF', name: 'Zero Width No-Break Space', unicode: 'U+FEFF' },
  { char: '\u00A0', name: 'Non-Breaking Space', unicode: 'U+00A0' },
  { char: '\u2000', name: 'En Quad', unicode: 'U+2000' },
  { char: '\u2001', name: 'Em Quad', unicode: 'U+2001' },
  { char: '\u2002', name: 'En Space', unicode: 'U+2002' },
  { char: '\u2003', name: 'Em Space', unicode: 'U+2003' },
  { char: '\u2004', name: 'Three-Per-Em Space', unicode: 'U+2004' },
  { char: '\u2005', name: 'Four-Per-Em Space', unicode: 'U+2005' },
  { char: '\u2006', name: 'Six-Per-Em Space', unicode: 'U+2006' },
  { char: '\u2007', name: 'Figure Space', unicode: 'U+2007' },
  { char: '\u2008', name: 'Punctuation Space', unicode: 'U+2008' },
  { char: '\u2009', name: 'Thin Space', unicode: 'U+2009' },
  { char: '\u200A', name: 'Hair Space', unicode: 'U+200A' }
];
const zeroWidthCharacters = new Set([
  '\u200B',
  '\u200C',
  '\u200D',
  '\u2060',
  '\uFEFF'
]);

const normalizeText = (value: unknown, name: string): string => {
  if (typeof value !== 'string') {
    throw new ToolboxError(
      'INVALID_TEXT_DIFF_INPUT',
      `${name} must be a string`
    );
  }

  if (value.length > maxTextLength) {
    throw new ToolboxError(
      'TEXT_DIFF_INPUT_TOO_LARGE',
      `${name} must be at most ${maxTextLength} characters`
    );
  }

  return value;
};

const normalizeLevel = (value: unknown): TextDiffLevel => {
  const level = value ?? 'word';

  if (typeof level !== 'string' || !levels.includes(level as TextDiffLevel)) {
    throw new ToolboxError(
      'INVALID_TEXT_DIFF_LEVEL',
      `level must be one of: ${levels.join(', ')}`
    );
  }

  return level as TextDiffLevel;
};

const normalizeStringOption = (
  value: unknown,
  name: string,
  defaultValue = ''
): string => {
  if (value === undefined) return defaultValue;
  if (typeof value !== 'string') {
    throw new ToolboxError('INVALID_TEXT_INPUT', `${name} must be a string`);
  }

  if (value.length > maxTextLength) {
    throw new ToolboxError(
      'TEXT_INPUT_TOO_LARGE',
      `${name} must be at most ${maxTextLength} characters`
    );
  }

  return value;
};

const getDiffChanges = (
  left: string,
  right: string,
  level: TextDiffLevel
): Change[] => {
  switch (level) {
    case 'char':
      return diffChars(left, right);
    case 'line':
      return diffLines(left, right);
    case 'word':
      return diffWordsWithSpace(left, right);
  }
};

const toPartType = (change: Change): TextDiffPartType => {
  if (change.added) return 'added';
  if (change.removed) return 'removed';
  return 'unchanged';
};

export const diffText = ({
  left,
  right,
  level: inputLevel
}: TextDiffInput): TextDiffOutput => {
  const normalizedLeft = normalizeText(left, 'left');
  const normalizedRight = normalizeText(right, 'right');
  const level = normalizeLevel(inputLevel);
  const changes = getDiffChanges(normalizedLeft, normalizedRight, level);
  const parts = changes.map((change) => ({
    type: toPartType(change),
    value: change.value,
    count: change.count ?? change.value.length
  }));

  let addedPartCount = 0;
  let removedPartCount = 0;
  let unchangedPartCount = 0;
  let addedTokenCount = 0;
  let removedTokenCount = 0;
  let unchangedTokenCount = 0;

  for (const part of parts) {
    if (part.type === 'added') {
      addedPartCount += 1;
      addedTokenCount += part.count;
    } else if (part.type === 'removed') {
      removedPartCount += 1;
      removedTokenCount += part.count;
    } else {
      unchangedPartCount += 1;
      unchangedTokenCount += part.count;
    }
  }

  return {
    level,
    equal: addedPartCount === 0 && removedPartCount === 0,
    partCount: parts.length,
    addedPartCount,
    removedPartCount,
    unchangedPartCount,
    addedTokenCount,
    removedTokenCount,
    unchangedTokenCount,
    parts
  };
};

const normalizeBoolean = (value: unknown, defaultValue: boolean): boolean => {
  if (value === undefined) return defaultValue;
  if (typeof value !== 'boolean') {
    throw new ToolboxError(
      'INVALID_TEXT_STATS_INPUT',
      'boolean options must be booleans'
    );
  }

  return value;
};

const normalizeReplaceMode = (value: unknown): TextReplaceMode => {
  const mode = value ?? 'literal';

  if (
    typeof mode !== 'string' ||
    !replaceModes.includes(mode as TextReplaceMode)
  ) {
    throw new ToolboxError(
      'INVALID_TEXT_REPLACE_INPUT',
      `mode must be one of: ${replaceModes.join(', ')}`
    );
  }

  return mode as TextReplaceMode;
};

const normalizeDuplicateRemovalMode = (
  value: unknown
): TextDuplicateRemovalMode => {
  const mode = value ?? 'all';

  if (
    typeof mode !== 'string' ||
    !duplicateRemovalModes.includes(mode as TextDuplicateRemovalMode)
  ) {
    throw new ToolboxError(
      'INVALID_TEXT_REMOVE_DUPLICATE_LINES_INPUT',
      `mode must be one of: ${duplicateRemovalModes.join(', ')}`
    );
  }

  return mode as TextDuplicateRemovalMode;
};

const normalizeDuplicateKeyMode = (value: unknown): TextDuplicateKeyMode => {
  const mode = value ?? 'line';

  if (
    typeof mode !== 'string' ||
    !duplicateKeyModes.includes(mode as TextDuplicateKeyMode)
  ) {
    throw new ToolboxError(
      'INVALID_TEXT_REMOVE_DUPLICATE_LINES_INPUT',
      `keyMode must be one of: ${duplicateKeyModes.join(', ')}`
    );
  }

  return mode as TextDuplicateKeyMode;
};

const normalizeDuplicateNewlineMode = (
  value: unknown
): TextDuplicateNewlineMode => {
  const mode = value ?? 'filter';

  if (
    typeof mode !== 'string' ||
    !duplicateNewlineModes.includes(mode as TextDuplicateNewlineMode)
  ) {
    throw new ToolboxError(
      'INVALID_TEXT_REMOVE_DUPLICATE_LINES_INPUT',
      `newlines must be one of: ${duplicateNewlineModes.join(', ')}`
    );
  }

  return mode as TextDuplicateNewlineMode;
};

const countLiteralOccurrences = (text: string, search: string): number => {
  if (!text || !search) return 0;

  let count = 0;
  let index = text.indexOf(search);
  while (index !== -1) {
    count += 1;
    index = text.indexOf(search, index + search.length);
  }

  return count;
};

const parseRegexSearch = (
  search: string,
  flags: string | undefined
): RegExp => {
  const slashExpression = search.match(/^\/(.*)\/([a-z]*)$/i);

  try {
    if (slashExpression) {
      const [, pattern, parsedFlags] = slashExpression;
      return new RegExp(pattern, parsedFlags);
    }

    return new RegExp(search, flags ?? 'g');
  } catch (error) {
    throw new ToolboxError(
      'INVALID_TEXT_REPLACE_REGEX',
      error instanceof Error ? error.message : 'Invalid regular expression'
    );
  }
};

const countRegexMatches = (text: string, regex: RegExp): number => {
  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
  const matcher = new RegExp(regex.source, flags);
  let count = 0;

  for (const _match of text.matchAll(matcher)) {
    count += 1;
  }

  return regex.global ? count : Math.min(count, 1);
};

export const replaceText = ({
  text,
  search,
  replacement,
  mode: inputMode,
  flags
}: TextReplaceInput): TextReplaceOutput => {
  const normalizedText = normalizeText(text, 'text');
  const normalizedSearch = normalizeStringOption(search, 'search');
  const normalizedReplacement = normalizeStringOption(
    replacement,
    'replacement'
  );
  const normalizedFlags =
    flags === undefined ? undefined : normalizeStringOption(flags, 'flags');
  const mode = normalizeReplaceMode(inputMode);

  if (!normalizedText || !normalizedSearch) {
    return {
      output: normalizedText,
      mode,
      replacementCount: 0,
      matched: false
    };
  }

  if (mode === 'literal') {
    const replacementCount = countLiteralOccurrences(
      normalizedText,
      normalizedSearch
    );

    return {
      output: normalizedText.replaceAll(
        normalizedSearch,
        normalizedReplacement
      ),
      mode,
      replacementCount,
      matched: replacementCount > 0
    };
  }

  const regex = parseRegexSearch(normalizedSearch, normalizedFlags);
  const replacementCount = countRegexMatches(normalizedText, regex);

  return {
    output: normalizedText.replace(regex, normalizedReplacement),
    mode,
    replacementCount,
    matched: replacementCount > 0
  };
};

const splitLines = (text: string): string[] =>
  text === '' ? [] : text.split('\n');

type DuplicateLineEntry = {
  originalLine: string;
  line: string;
  key: string;
  index: number;
};

const normalizeKeyIndex = (value: unknown): number => {
  if (value === undefined || value === null || value === '') return 1;

  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 1000
  ) {
    throw new ToolboxError(
      'INVALID_TEXT_REMOVE_DUPLICATE_LINES_INPUT',
      'keyIndex must be an integer from 1 to 1000'
    );
  }

  return value;
};

const normalizeFieldDelimiter = (value: unknown): string => {
  const delimiter = normalizeStringOption(value, 'fieldDelimiter', ',');
  if (!delimiter) {
    throw new ToolboxError(
      'INVALID_TEXT_REMOVE_DUPLICATE_LINES_INPUT',
      'fieldDelimiter must not be empty'
    );
  }

  return delimiter;
};

const normalizeRegexGroup = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw new ToolboxError(
      'INVALID_TEXT_REMOVE_DUPLICATE_LINES_INPUT',
      'keyRegexGroup must be a string'
    );
  }

  return value.trim() || undefined;
};

const buildDuplicateKeyResolver = ({
  keyMode,
  keyIndex,
  fieldDelimiter,
  keyRegex,
  keyRegexFlags,
  keyRegexGroup,
  shouldTrimLines
}: {
  keyMode: TextDuplicateKeyMode;
  keyIndex: number;
  fieldDelimiter: string;
  keyRegex: unknown;
  keyRegexFlags: unknown;
  keyRegexGroup: string | undefined;
  shouldTrimLines: boolean;
}): ((line: string) => string) => {
  if (keyMode === 'line') return (line) => line;

  if (keyMode === 'word') {
    return (line) => {
      const key = line.trim().split(/\s+/)[keyIndex - 1];
      return key ?? line;
    };
  }

  if (keyMode === 'field') {
    return (line) => {
      const key = line.split(fieldDelimiter)[keyIndex - 1];
      if (key === undefined) return line;
      return shouldTrimLines ? key.trim() : key;
    };
  }

  const regexSource = normalizeStringOption(keyRegex, 'keyRegex');
  if (!regexSource) {
    throw new ToolboxError(
      'INVALID_TEXT_REMOVE_DUPLICATE_LINES_INPUT',
      'keyRegex is required when keyMode is regex'
    );
  }

  const normalizedRegexFlags =
    keyRegexFlags === undefined
      ? undefined
      : normalizeStringOption(keyRegexFlags, 'keyRegexFlags');
  const regex = parseRegexSearch(regexSource, normalizedRegexFlags);

  return (line) => {
    regex.lastIndex = 0;
    const match = regex.exec(line);
    if (!match) return line;

    if (keyRegexGroup !== undefined) {
      const numericGroup = Number.parseInt(keyRegexGroup, 10);
      if (String(numericGroup) === keyRegexGroup) {
        return match[numericGroup] ?? line;
      }

      return match.groups?.[keyRegexGroup] ?? line;
    }

    return match[1] ?? match[0] ?? line;
  };
};

const removeDuplicateLineEntries = (
  entries: DuplicateLineEntry[],
  mode: TextDuplicateRemovalMode
): DuplicateLineEntry[] => {
  if (mode === 'all') {
    const seen = new Set<string>();
    return entries.filter((entry) => {
      if (seen.has(entry.key)) return false;
      seen.add(entry.key);
      return true;
    });
  }

  if (mode === 'consecutive') {
    return entries.filter((entry, index, allEntries) => {
      return index === 0 || entry.key !== allEntries[index - 1].key;
    });
  }

  const counts = new Map<string, number>();
  for (const entry of entries) {
    counts.set(entry.key, (counts.get(entry.key) ?? 0) + 1);
  }

  return entries.filter((entry) => counts.get(entry.key) === 1);
};

const preserveLineSlots = (
  originalLines: string[],
  keptEntries: DuplicateLineEntry[]
): string[] => {
  const keptLinesByIndex = new Map(
    keptEntries.map((entry) => [entry.index, entry.line])
  );

  return originalLines.map((originalLine, index) => {
    if (originalLine.trim() === '') return originalLine;
    return keptLinesByIndex.get(index) ?? '';
  });
};

export const removeDuplicateLines = ({
  text,
  mode: inputMode,
  keyMode: inputKeyMode,
  newlines: inputNewlines,
  sortLines,
  trimLines,
  fieldDelimiter,
  keyIndex,
  keyRegex,
  keyRegexFlags,
  keyRegexGroup
}: TextRemoveDuplicateLinesInput): TextRemoveDuplicateLinesOutput => {
  const normalizedText = normalizeText(text, 'text');
  const mode = normalizeDuplicateRemovalMode(inputMode);
  const keyMode = normalizeDuplicateKeyMode(inputKeyMode);
  const newlines = normalizeDuplicateNewlineMode(inputNewlines);
  const shouldSortLines = normalizeBoolean(sortLines, false);
  const shouldTrimLines = normalizeBoolean(trimLines, false);
  const normalizedKeyIndex = normalizeKeyIndex(keyIndex);
  const normalizedFieldDelimiter = normalizeFieldDelimiter(fieldDelimiter);
  const normalizedKeyRegexGroup = normalizeRegexGroup(keyRegexGroup);
  const resolveKey = buildDuplicateKeyResolver({
    keyMode,
    keyIndex: normalizedKeyIndex,
    fieldDelimiter: normalizedFieldDelimiter,
    keyRegex,
    keyRegexFlags,
    keyRegexGroup: normalizedKeyRegexGroup,
    shouldTrimLines
  });
  const originalLines = splitLines(normalizedText);
  let entries = originalLines.map<DuplicateLineEntry>((line, index) => {
    const normalizedLine = shouldTrimLines ? line.trim() : line;
    return {
      originalLine: line,
      line: normalizedLine,
      key: resolveKey(normalizedLine),
      index
    };
  });

  if (newlines === 'delete') {
    entries = entries.filter((entry) => entry.originalLine.trim() !== '');
  }

  let processedEntries = removeDuplicateLineEntries(entries, mode);

  if (shouldSortLines) {
    processedEntries = [...processedEntries].sort((left, right) =>
      left.line.localeCompare(right.line)
    );
  }

  let processedLines = processedEntries.map((entry) => entry.line);

  if (newlines === 'preserve' && !shouldSortLines) {
    processedLines = preserveLineSlots(originalLines, processedEntries);
  }

  const output = processedLines.join('\n');
  const outputLineCount = output === '' ? 0 : processedLines.length;

  return {
    output,
    mode,
    keyMode,
    newlines,
    originalLineCount: originalLines.length,
    outputLineCount,
    removedLineCount: Math.max(0, originalLines.length - outputLineCount)
  };
};

const unicodeLabelFor = (char: string): string => {
  const codePoint = char.codePointAt(0) ?? 0;
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`;
};

const getHiddenCharacterInfo = (
  char: string,
  position: number,
  codePointIndex: number
): TextHiddenCharacter => {
  const rtlChar = rtlCharacters.find((item) => item.char === char);
  if (rtlChar) {
    return {
      char,
      displayValue: displayValueFor(char),
      unicode: rtlChar.unicode,
      name: rtlChar.name,
      category: 'RTL Override',
      position,
      codePointIndex,
      isRTL: true,
      isInvisible: false,
      isZeroWidth: false
    };
  }

  const invisibleChar = invisibleCharacters.find((item) => item.char === char);
  if (invisibleChar) {
    return {
      char,
      displayValue: displayValueFor(char),
      unicode: invisibleChar.unicode,
      name: invisibleChar.name,
      category: 'Invisible Character',
      position,
      codePointIndex,
      isRTL: false,
      isInvisible: true,
      isZeroWidth: zeroWidthCharacters.has(char)
    };
  }

  const codePoint = char.codePointAt(0) ?? 0;
  if (codePoint < 32 || codePoint === 127) {
    return {
      char,
      displayValue: displayValueFor(char),
      unicode: unicodeLabelFor(char),
      name: `Control Character (${codePoint})`,
      category: 'Control Character',
      position,
      codePointIndex,
      isRTL: false,
      isInvisible: true,
      isZeroWidth: false
    };
  }

  return {
    char,
    displayValue: displayValueFor(char),
    unicode: unicodeLabelFor(char),
    name: 'Regular Character',
    category: 'Regular',
    position,
    codePointIndex,
    isRTL: false,
    isInvisible: false,
    isZeroWidth: false
  };
};

const normalizeMaxHiddenItems = (value: unknown): number => {
  if (value === undefined) return 1_000;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > maxHiddenCharactersLimit
  ) {
    throw new ToolboxError(
      'INVALID_TEXT_HIDDEN_CHARS_INPUT',
      `maxItems must be an integer from 1 to ${maxHiddenCharactersLimit}`
    );
  }

  return value;
};

const shouldIncludeHiddenCharacter = (
  character: TextHiddenCharacter,
  options: {
    includeRtl: boolean;
    includeInvisible: boolean;
    includeZeroWidth: boolean;
    includeControls: boolean;
  }
): boolean => {
  if (character.isRTL) return options.includeRtl;
  if (character.category === 'Control Character')
    return options.includeControls;
  if (character.isZeroWidth) {
    return options.includeZeroWidth || options.includeInvisible;
  }
  if (character.isInvisible) return options.includeInvisible;
  return false;
};

export const analyzeHiddenChars = ({
  text,
  includeRtl,
  includeInvisible,
  includeZeroWidth,
  includeControls,
  maxItems
}: TextHiddenCharsInput): TextHiddenCharsOutput => {
  const normalizedText = normalizeText(text, 'text');
  const shouldIncludeRtl = normalizeBoolean(includeRtl, true);
  const shouldIncludeInvisible = normalizeBoolean(includeInvisible, true);
  const shouldIncludeZeroWidth = normalizeBoolean(includeZeroWidth, true);
  const shouldIncludeControls = normalizeBoolean(includeControls, true);
  const maxHiddenItems = normalizeMaxHiddenItems(maxItems);
  const hiddenCharacters: TextHiddenCharacter[] = [];
  let totalHiddenChars = 0;
  let hasRTLOverride = false;
  let hasInvisibleChars = false;
  let hasZeroWidthChars = false;
  let hasControlChars = false;
  let position = 0;
  let codePointIndex = 0;

  for (const char of normalizedText) {
    const character = getHiddenCharacterInfo(char, position, codePointIndex);
    if (
      shouldIncludeHiddenCharacter(character, {
        includeRtl: shouldIncludeRtl,
        includeInvisible: shouldIncludeInvisible,
        includeZeroWidth: shouldIncludeZeroWidth,
        includeControls: shouldIncludeControls
      })
    ) {
      totalHiddenChars += 1;
      hasRTLOverride = hasRTLOverride || character.isRTL;
      hasInvisibleChars = hasInvisibleChars || character.isInvisible;
      hasZeroWidthChars = hasZeroWidthChars || character.isZeroWidth;
      hasControlChars =
        hasControlChars || character.category === 'Control Character';
      if (hiddenCharacters.length < maxHiddenItems) {
        hiddenCharacters.push(character);
      }
    }

    position += char.length;
    codePointIndex += 1;
  }

  return {
    originalText: normalizedText,
    hiddenCharacters,
    hasRTLOverride,
    hasInvisibleChars,
    hasZeroWidthChars,
    hasControlChars,
    totalHiddenChars,
    truncated: hiddenCharacters.length < totalHiddenChars
  };
};

const normalizeSlugSeparator = (value: unknown): string => {
  if (value === undefined) return '-';
  if (typeof value !== 'string' || value.length === 0 || value.length > 16) {
    throw new ToolboxError(
      'INVALID_TEXT_SLUG_INPUT',
      'separator must be a non-empty string up to 16 characters'
    );
  }

  return value;
};

const slugLine = (
  line: string,
  options: { preserveCase: boolean; separator: string }
): string => {
  const separatorPattern = escapeRegExp(options.separator);
  return (options.preserveCase ? line : line.toLowerCase())
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, options.separator)
    .replace(
      new RegExp(`^${separatorPattern}+|${separatorPattern}+$`, 'g'),
      ''
    );
};

export const slugifyText = ({
  text,
  preserveCase,
  separator
}: TextSlugInput): TextSlugOutput => {
  const normalizedText = normalizeText(text, 'text');
  const shouldPreserveCase = normalizeBoolean(preserveCase, false);
  const normalizedSeparator = normalizeSlugSeparator(separator);
  const lines = splitLines(normalizedText);
  let changedLineCount = 0;
  const output = lines
    .map((line) => {
      const slug =
        line.trim() === ''
          ? ''
          : slugLine(line, {
              preserveCase: shouldPreserveCase,
              separator: normalizedSeparator
            });
      if (slug !== line) changedLineCount += 1;
      return slug;
    })
    .join('\n');

  return {
    output,
    separator: normalizedSeparator,
    preserveCase: shouldPreserveCase,
    lineCount: lines.length,
    changedLineCount
  };
};

const normalizeSplitMode = (value: unknown): TextSplitMode => {
  const mode = value ?? 'symbol';

  if (typeof mode !== 'string' || !splitModes.includes(mode as TextSplitMode)) {
    throw new ToolboxError(
      'INVALID_TEXT_SPLIT_INPUT',
      `mode must be one of: ${splitModes.join(', ')}`
    );
  }

  return mode as TextSplitMode;
};

const normalizeTruncateSide = (value: unknown): TextTruncateSide => {
  const side = value ?? 'right';

  if (
    typeof side !== 'string' ||
    !truncateSides.includes(side as TextTruncateSide)
  ) {
    throw new ToolboxError(
      'INVALID_TEXT_TRUNCATE_INPUT',
      `side must be one of: ${truncateSides.join(', ')}`
    );
  }

  return side as TextTruncateSide;
};

const normalizePositiveInteger = (
  value: unknown,
  name: string,
  errorCode: string
): number => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new ToolboxError(errorCode, `${name} must be a positive integer`);
  }

  return value;
};

const normalizeNonNegativeInteger = (
  value: unknown,
  name: string,
  errorCode: string
): number => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new ToolboxError(errorCode, `${name} must be a non-negative integer`);
  }

  return value;
};

const splitTextByLength = (text: string, length: number): string[] => {
  const result: string[] = [];
  for (let index = 0; index < text.length; index += length) {
    result.push(text.slice(index, index + length));
  }

  return result;
};

const splitTextIntoChunks = (text: string, chunks: number): string[] => {
  if (text.length < chunks) {
    throw new ToolboxError(
      'INVALID_TEXT_SPLIT_INPUT',
      'Text length must be at least as long as the number of chunks'
    );
  }

  const chunkSize = Math.ceil(text.length / chunks);
  let result: string[] = [];

  for (let index = 0; index < text.length; index += chunkSize) {
    result.push(text.slice(index, index + chunkSize));
  }

  if (result.length > chunks) {
    result[chunks - 1] = result.slice(chunks - 1).join('');
    result = result.slice(0, chunks);
  }

  return result;
};

export const splitText = ({
  text,
  mode: inputMode,
  symbol,
  regex,
  length,
  chunks,
  prefix,
  suffix,
  outputSeparator
}: TextSplitInput): TextSplitOutput => {
  const normalizedText = normalizeText(text, 'text');
  const mode = normalizeSplitMode(inputMode);
  const normalizedPrefix = normalizeStringOption(prefix, 'prefix');
  const normalizedSuffix = normalizeStringOption(suffix, 'suffix');
  const normalizedOutputSeparator = normalizeStringOption(
    outputSeparator,
    'outputSeparator',
    '\n'
  );

  let parts: string[];
  if (mode === 'symbol') {
    parts = normalizedText.split(normalizeStringOption(symbol, 'symbol', ' '));
  } else if (mode === 'regex') {
    parts = normalizedText.split(
      new RegExp(normalizeStringOption(regex, 'regex', '\\s+'))
    );
  } else if (mode === 'length') {
    parts = splitTextByLength(
      normalizedText,
      normalizePositiveInteger(length, 'length', 'INVALID_TEXT_SPLIT_INPUT')
    );
  } else {
    parts = splitTextIntoChunks(
      normalizedText,
      normalizePositiveInteger(chunks, 'chunks', 'INVALID_TEXT_SPLIT_INPUT')
    ).map((part) => `${normalizedPrefix}${part}${normalizedSuffix}`);
  }

  return {
    output: parts.join(normalizedOutputSeparator),
    parts,
    partCount: parts.length,
    mode,
    outputSeparator: normalizedOutputSeparator
  };
};

export const joinText = ({
  text,
  joiner,
  deleteBlankLines,
  trimTrailingSpaces
}: TextJoinInput): TextJoinOutput => {
  const normalizedText = normalizeText(text, 'text');
  const normalizedJoiner = normalizeStringOption(joiner, 'joiner');
  const shouldDeleteBlankLines = normalizeBoolean(deleteBlankLines, true);
  const shouldTrimTrailingSpaces = normalizeBoolean(trimTrailingSpaces, true);
  const originalLines = normalizedText.split('\n');
  let lines = [...originalLines];

  if (shouldTrimTrailingSpaces) {
    lines = lines.map((line) => line.trimEnd());
  }

  if (shouldDeleteBlankLines) {
    lines = lines.filter((line) => line.trim());
  }

  return {
    output: lines.join(normalizedJoiner),
    originalLineCount: normalizedText === '' ? 0 : originalLines.length,
    joinedLineCount: normalizedText === '' ? 0 : lines.length,
    removedBlankLineCount:
      normalizedText === ''
        ? 0
        : Math.max(0, originalLines.length - lines.length),
    joiner: normalizedJoiner
  };
};

const addTruncationIndicator = (
  text: string,
  indicator: string,
  side: TextTruncateSide
): string => {
  if (indicator.length > text.length && text.length) {
    throw new ToolboxError(
      'INVALID_TEXT_TRUNCATE_INPUT',
      'Indicator length is greater than truncation length'
    );
  }

  if (!text.length) return '';

  if (side === 'right') {
    return `${text.slice(0, text.length - indicator.length)}${indicator}`;
  }

  return `${indicator}${text.slice(-text.length + indicator.length)}`;
};

const truncateSingleText = (
  text: string,
  maxLength: number,
  side: TextTruncateSide,
  addIndicator: boolean,
  indicator: string
): string => {
  const truncated =
    side === 'right' ? text.slice(0, maxLength) : text.slice(-maxLength);
  return addIndicator
    ? addTruncationIndicator(truncated, indicator, side)
    : truncated;
};

export const truncateTextCore = ({
  text,
  maxLength,
  side: inputSide,
  lineByLine,
  addIndicator,
  indicator
}: TextTruncateInput): TextTruncateOutput => {
  const normalizedText = normalizeText(text, 'text');
  const normalizedMaxLength = normalizeNonNegativeInteger(
    maxLength,
    'maxLength',
    'INVALID_TEXT_TRUNCATE_INPUT'
  );
  const side = normalizeTruncateSide(inputSide);
  const shouldProcessLineByLine = normalizeBoolean(lineByLine, false);
  const shouldAddIndicator = normalizeBoolean(addIndicator, false);
  const normalizedIndicator = normalizeStringOption(indicator, 'indicator');

  const output = shouldProcessLineByLine
    ? normalizedText
        .split('\n')
        .map((line) =>
          truncateSingleText(
            line,
            normalizedMaxLength,
            side,
            shouldAddIndicator,
            normalizedIndicator
          )
        )
        .join('\n')
    : truncateSingleText(
        normalizedText,
        normalizedMaxLength,
        side,
        shouldAddIndicator,
        normalizedIndicator
      );

  return {
    output,
    maxLength: normalizedMaxLength,
    side,
    lineByLine: shouldProcessLineByLine,
    truncated: output !== normalizedText
  };
};

export const reverseText = ({
  text,
  multiLine,
  removeEmptyItems,
  trimItems
}: TextReverseInput): TextReverseOutput => {
  const normalizedText = normalizeText(text, 'text');
  const shouldProcessMultiLine = normalizeBoolean(multiLine, false);
  const shouldRemoveEmptyItems = normalizeBoolean(removeEmptyItems, false);
  const shouldTrimItems = normalizeBoolean(trimItems, false);
  let items = shouldProcessMultiLine
    ? normalizedText.split('\n')
    : [normalizedText];

  if (shouldRemoveEmptyItems) {
    items = items.filter(Boolean);
  }

  if (shouldTrimItems) {
    items = items.map((item) => item.trim());
  }

  return {
    output: items.map((item) => item.split('').reverse().join('')).join('\n'),
    itemCount:
      normalizedText === '' && !shouldProcessMultiLine ? 0 : items.length,
    multiLine: shouldProcessMultiLine
  };
};

export const changeTextCase = (
  text: string,
  mode: TextCaseMode
): TextCaseOutput => {
  const normalizedText = normalizeText(text, 'text');
  let output: string;

  switch (mode) {
    case 'uppercase':
      output = normalizedText.toUpperCase();
      break;
    case 'lowercase':
      output = normalizedText.toLowerCase();
      break;
    case 'title_case':
      output = normalizedText.replace(
        /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu,
        (word) => {
          const lower = word.toLowerCase();
          const [first = '', ...rest] = Array.from(lower);
          return `${first.toUpperCase()}${rest.join('')}`;
        }
      );
      break;
    case 'capitalize':
      output = normalizedText
        .split('\n')
        .map((line) => line.replace(/\p{L}/u, (letter) => letter.toUpperCase()))
        .join('\n');
      break;
    default:
      throw new ToolboxError(
        'INVALID_TEXT_CASE_INPUT',
        'mode must be one of: uppercase, lowercase, title_case, capitalize'
      );
  }

  return {
    output,
    changed: output !== normalizedText
  };
};

const normalizeCamelSnakeMode = (value: unknown): TextCamelSnakeMode => {
  const mode = value ?? 'camel_to_snake';

  if (
    typeof mode !== 'string' ||
    !camelSnakeModes.includes(mode as TextCamelSnakeMode)
  ) {
    throw new ToolboxError(
      'INVALID_TEXT_CAMEL_SNAKE_INPUT',
      `mode must be one of: ${camelSnakeModes.join(', ')}`
    );
  }

  return mode as TextCamelSnakeMode;
};

const normalizeFullHalfWidthMode = (value: unknown): TextFullHalfWidthMode => {
  const mode = value ?? 'full_to_half';

  if (
    typeof mode !== 'string' ||
    !fullHalfWidthModes.includes(mode as TextFullHalfWidthMode)
  ) {
    throw new ToolboxError(
      'INVALID_TEXT_FULL_HALF_WIDTH_INPUT',
      `mode must be one of: ${fullHalfWidthModes.join(', ')}`
    );
  }

  return mode as TextFullHalfWidthMode;
};

const camelToSnakeLine = (line: string): string =>
  line
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/-/g, '_')
    .toLowerCase();

const capitalizeIdentifierPart = (part: string): string =>
  part.length === 0
    ? ''
    : `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`;

const snakeToCamelLine = (line: string, pascalCase: boolean): string => {
  const parts = line.split(/[_-]+/);
  return parts
    .map((part, index) => {
      if (index === 0 && !pascalCase) return part.toLowerCase();
      return capitalizeIdentifierPart(part);
    })
    .join('');
};

export const convertCamelSnake = ({
  text,
  mode: inputMode,
  pascalCase
}: TextCamelSnakeInput): TextCamelSnakeOutput => {
  const normalizedText = normalizeText(text, 'text');
  const mode = normalizeCamelSnakeMode(inputMode);
  const shouldUsePascalCase = normalizeBoolean(pascalCase, false);
  const lines = splitLines(normalizedText);
  const output = lines
    .map((line) =>
      mode === 'camel_to_snake'
        ? camelToSnakeLine(line)
        : snakeToCamelLine(line, shouldUsePascalCase)
    )
    .join('\n');

  return {
    output,
    mode,
    changed: output !== normalizedText,
    lineCount: lines.length
  };
};

const fullWidthOffset = 0xfee0;

const convertCharacterWidth = (
  character: string,
  mode: TextFullHalfWidthMode,
  convertSpaces: boolean
): string => {
  const codePoint = character.codePointAt(0);
  if (codePoint === undefined) return character;

  if (mode === 'full_to_half') {
    if (convertSpaces && codePoint === 0x3000) return ' ';
    if (codePoint >= 0xff01 && codePoint <= 0xff5e) {
      return String.fromCodePoint(codePoint - fullWidthOffset);
    }
    return character;
  }

  if (convertSpaces && codePoint === 0x20) return '\u3000';
  if (codePoint >= 0x21 && codePoint <= 0x7e) {
    return String.fromCodePoint(codePoint + fullWidthOffset);
  }
  return character;
};

export const convertFullHalfWidth = ({
  text,
  mode: inputMode,
  convertSpaces
}: TextFullHalfWidthInput): TextFullHalfWidthOutput => {
  const normalizedText = normalizeText(text, 'text');
  const mode = normalizeFullHalfWidthMode(inputMode);
  const shouldConvertSpaces = normalizeBoolean(convertSpaces, true);
  const output = Array.from(normalizedText)
    .map((character) =>
      convertCharacterWidth(character, mode, shouldConvertSpaces)
    )
    .join('');

  return {
    output,
    mode,
    changed: output !== normalizedText
  };
};

const normalizeMaxFrequencyItems = (value: unknown): number => {
  if (value === undefined) return 100;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > maxFrequencyItemsLimit
  ) {
    throw new ToolboxError(
      'INVALID_TEXT_STATS_INPUT',
      `maxFrequencyItems must be an integer from 1 to ${maxFrequencyItemsLimit}`
    );
  }

  return value;
};

const normalizeSentenceDelimiters = (value: unknown): string[] => {
  if (value === undefined) return defaultSentenceDelimiters;
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== 'string' || item.length === 0)
  ) {
    throw new ToolboxError(
      'INVALID_TEXT_STATS_INPUT',
      'sentenceDelimiters must be an array of non-empty strings'
    );
  }

  return value as string[];
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const splitWords = (text: string, delimiters: string): string[] => {
  const regex = new RegExp(`[${delimiters}]`, 'gu');
  return text.split(regex).filter((word) => word.trim() !== '');
};

const countSentences = (text: string, delimiters: string[]): number => {
  if (!text.trim()) return 0;
  if (delimiters.length === 0) return 1;

  const pattern = delimiters
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join('|');
  const regex = new RegExp(pattern, 'gu');

  return text.split(regex).filter((sentence) => sentence.trim() !== '').length;
};

const displayValueFor = (value: string): string => {
  if (displayValues[value]) return displayValues[value];
  if (value.length === 1) {
    const code = value.charCodeAt(0);
    if (code < 32 || code === 127) {
      return `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;
    }
  }

  return value;
};

const frequency = (
  values: Iterable<string>,
  options: {
    ignoreCase: boolean;
    maxItems: number;
  }
): TextFrequencyItem[] => {
  const counts = new Map<string, number>();
  let total = 0;

  for (const value of values) {
    const key = options.ignoreCase ? value.toLowerCase() : value;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    total += 1;
  }

  return Array.from(counts.entries())
    .sort(([leftValue, leftCount], [rightValue, rightCount]) => {
      if (rightCount !== leftCount) return rightCount - leftCount;
      return leftValue.localeCompare(rightValue);
    })
    .slice(0, options.maxItems)
    .map(([value, count]) => ({
      value,
      displayValue: displayValueFor(value),
      count,
      percentage: total === 0 ? 0 : count / total
    }));
};

export const getTextStats = ({
  text,
  includeEmptyLines,
  sentenceDelimiters,
  wordDelimiters,
  includeCharacterFrequency,
  includeWordFrequency,
  maxFrequencyItems
}: TextStatsInput): TextStatsOutput => {
  const normalizedText = normalizeText(text, 'text');
  const shouldIncludeEmptyLines = normalizeBoolean(includeEmptyLines, false);
  const shouldIncludeCharacterFrequency = normalizeBoolean(
    includeCharacterFrequency,
    false
  );
  const shouldIncludeWordFrequency = normalizeBoolean(
    includeWordFrequency,
    false
  );
  const maxItems = normalizeMaxFrequencyItems(maxFrequencyItems);
  const sentenceDelimiterList = normalizeSentenceDelimiters(sentenceDelimiters);
  const wordDelimiterText = wordDelimiters || defaultWordDelimiters;
  const words = splitWords(normalizedText, wordDelimiterText);
  const codePoints = Array.from(normalizedText);

  return {
    characters: normalizedText.length,
    codePoints: codePoints.length,
    words: words.length,
    lines: shouldIncludeEmptyLines
      ? normalizedText.split('\n').length
      : normalizedText.split('\n').filter((line) => line.trim() !== '').length,
    sentences: countSentences(normalizedText, sentenceDelimiterList),
    paragraphs: normalizedText
      .split(/\r?\n\s*\r?\n/)
      .filter((paragraph) => paragraph.trim() !== '').length,
    bytesUtf8: new TextEncoder().encode(normalizedText).byteLength,
    characterFrequency: shouldIncludeCharacterFrequency
      ? frequency(codePoints, {
          ignoreCase: false,
          maxItems
        })
      : [],
    wordFrequency: shouldIncludeWordFrequency
      ? frequency(words, {
          ignoreCase: true,
          maxItems
        })
      : []
  };
};

export const textTools: ToolboxTool[] = [
  {
    name: 'text.diff',
    title: 'Diff Text',
    description: 'Compare two text inputs and return structured diff parts.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['left', 'right'],
      additionalProperties: false,
      properties: {
        left: { type: 'string', maxLength: maxTextLength },
        right: { type: 'string', maxLength: maxTextLength },
        level: {
          type: 'string',
          enum: levels,
          default: 'word'
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'level',
        'equal',
        'partCount',
        'addedPartCount',
        'removedPartCount',
        'unchangedPartCount',
        'addedTokenCount',
        'removedTokenCount',
        'unchangedTokenCount',
        'parts'
      ],
      additionalProperties: false,
      properties: {
        level: { type: 'string', enum: levels },
        equal: { type: 'boolean' },
        partCount: { type: 'integer' },
        addedPartCount: { type: 'integer' },
        removedPartCount: { type: 'integer' },
        unchangedPartCount: { type: 'integer' },
        addedTokenCount: { type: 'integer' },
        removedTokenCount: { type: 'integer' },
        unchangedTokenCount: { type: 'integer' },
        parts: {
          type: 'array',
          items: {
            type: 'object',
            required: ['type', 'value', 'count'],
            additionalProperties: false,
            properties: {
              type: { type: 'string', enum: ['added', 'removed', 'unchanged'] },
              value: { type: 'string' },
              count: { type: 'integer' }
            }
          }
        }
      }
    },
    execute: (input) => {
      try {
        return ok(diffText(input as TextDiffInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'text.replace',
    title: 'Replace Text',
    description:
      'Replace literal text or regular expression matches and return the replacement count.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text', 'search'],
      additionalProperties: false,
      properties: {
        text: { type: 'string', maxLength: maxTextLength },
        search: { type: 'string', maxLength: maxTextLength },
        replacement: {
          type: 'string',
          maxLength: maxTextLength,
          default: ''
        },
        mode: {
          type: 'string',
          enum: replaceModes,
          default: 'literal'
        },
        flags: {
          type: 'string',
          description:
            'Regular expression flags used when mode is regex and search is not written as /pattern/flags.',
          default: 'g'
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['output', 'mode', 'replacementCount', 'matched'],
      additionalProperties: false,
      properties: {
        output: { type: 'string' },
        mode: { type: 'string', enum: replaceModes },
        replacementCount: { type: 'integer' },
        matched: { type: 'boolean' }
      }
    },
    execute: (input) => {
      try {
        return ok(replaceText(input as TextReplaceInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'text.remove_duplicate_lines',
    title: 'Remove Duplicate Lines',
    description:
      'Remove duplicate lines or duplicate line keys using line, word, field, or regular expression keys.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string', maxLength: maxTextLength },
        mode: {
          type: 'string',
          enum: duplicateRemovalModes,
          default: 'all'
        },
        keyMode: {
          type: 'string',
          enum: duplicateKeyModes,
          default: 'line'
        },
        newlines: {
          type: 'string',
          enum: duplicateNewlineModes,
          default: 'filter'
        },
        sortLines: { type: 'boolean', default: false },
        trimLines: { type: 'boolean', default: false },
        fieldDelimiter: {
          type: 'string',
          default: ',',
          description: 'Delimiter used when keyMode is field.'
        },
        keyIndex: {
          type: 'integer',
          minimum: 1,
          maximum: 1000,
          default: 1,
          description:
            'One-based word or field index used as the duplicate key.'
        },
        keyRegex: {
          type: 'string',
          description: 'Regular expression used when keyMode is regex.'
        },
        keyRegexFlags: {
          type: 'string',
          description: 'Regular expression flags used with keyRegex.'
        },
        keyRegexGroup: {
          type: 'string',
          description:
            'Optional numeric or named capture group to use as the regex key.'
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'output',
        'mode',
        'keyMode',
        'newlines',
        'originalLineCount',
        'outputLineCount',
        'removedLineCount'
      ],
      additionalProperties: false,
      properties: {
        output: { type: 'string' },
        mode: { type: 'string', enum: duplicateRemovalModes },
        keyMode: { type: 'string', enum: duplicateKeyModes },
        newlines: { type: 'string', enum: duplicateNewlineModes },
        originalLineCount: { type: 'integer' },
        outputLineCount: { type: 'integer' },
        removedLineCount: { type: 'integer' }
      }
    },
    execute: (input) => {
      try {
        return ok(removeDuplicateLines(input as TextRemoveDuplicateLinesInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'text.hidden_chars',
    title: 'Hidden Character Detector',
    description:
      'Detect RTL override, invisible, zero-width, and control characters in text.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string', maxLength: maxTextLength },
        includeRtl: { type: 'boolean', default: true },
        includeInvisible: { type: 'boolean', default: true },
        includeZeroWidth: { type: 'boolean', default: true },
        includeControls: { type: 'boolean', default: true },
        maxItems: {
          type: 'integer',
          minimum: 1,
          maximum: maxHiddenCharactersLimit,
          default: 1000
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'originalText',
        'hiddenCharacters',
        'hasRTLOverride',
        'hasInvisibleChars',
        'hasZeroWidthChars',
        'hasControlChars',
        'totalHiddenChars',
        'truncated'
      ],
      additionalProperties: false,
      properties: {
        originalText: { type: 'string' },
        hiddenCharacters: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'char',
              'displayValue',
              'unicode',
              'name',
              'category',
              'position',
              'codePointIndex',
              'isRTL',
              'isInvisible',
              'isZeroWidth'
            ],
            additionalProperties: false,
            properties: {
              char: { type: 'string' },
              displayValue: { type: 'string' },
              unicode: { type: 'string' },
              name: { type: 'string' },
              category: {
                type: 'string',
                enum: hiddenCharacterCategories
              },
              position: { type: 'integer' },
              codePointIndex: { type: 'integer' },
              isRTL: { type: 'boolean' },
              isInvisible: { type: 'boolean' },
              isZeroWidth: { type: 'boolean' }
            }
          }
        },
        hasRTLOverride: { type: 'boolean' },
        hasInvisibleChars: { type: 'boolean' },
        hasZeroWidthChars: { type: 'boolean' },
        hasControlChars: { type: 'boolean' },
        totalHiddenChars: { type: 'integer' },
        truncated: { type: 'boolean' }
      }
    },
    execute: (input) => {
      try {
        return ok(analyzeHiddenChars(input as TextHiddenCharsInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'text.slug',
    title: 'Slug Generator',
    description:
      'Generate URL-friendly slugs from text, preserving line breaks.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string', maxLength: maxTextLength },
        preserveCase: { type: 'boolean', default: false },
        separator: { type: 'string', default: '-', maxLength: 16 }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'output',
        'separator',
        'preserveCase',
        'lineCount',
        'changedLineCount'
      ],
      additionalProperties: false,
      properties: {
        output: { type: 'string' },
        separator: { type: 'string' },
        preserveCase: { type: 'boolean' },
        lineCount: { type: 'integer' },
        changedLineCount: { type: 'integer' }
      }
    },
    execute: (input) => {
      try {
        return ok(slugifyText(input as TextSlugInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'text.split',
    title: 'Split Text',
    description:
      'Split text by literal symbol, regular expression, fixed length, or chunk count.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string', maxLength: maxTextLength },
        mode: { type: 'string', enum: splitModes, default: 'symbol' },
        symbol: { type: 'string', default: ' ' },
        regex: { type: 'string', default: '\\s+' },
        length: { type: 'integer', minimum: 1 },
        chunks: { type: 'integer', minimum: 1 },
        prefix: { type: 'string', default: '' },
        suffix: { type: 'string', default: '' },
        outputSeparator: { type: 'string', default: '\n' }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['output', 'parts', 'partCount', 'mode', 'outputSeparator'],
      additionalProperties: false,
      properties: {
        output: { type: 'string' },
        parts: { type: 'array', items: { type: 'string' } },
        partCount: { type: 'integer' },
        mode: { type: 'string', enum: splitModes },
        outputSeparator: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok(splitText(input as TextSplitInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'text.join',
    title: 'Join Text',
    description: 'Join text lines with a separator and optional cleanup.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string', maxLength: maxTextLength },
        joiner: { type: 'string', default: '' },
        deleteBlankLines: { type: 'boolean', default: true },
        trimTrailingSpaces: { type: 'boolean', default: true }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'output',
        'originalLineCount',
        'joinedLineCount',
        'removedBlankLineCount',
        'joiner'
      ],
      additionalProperties: false,
      properties: {
        output: { type: 'string' },
        originalLineCount: { type: 'integer' },
        joinedLineCount: { type: 'integer' },
        removedBlankLineCount: { type: 'integer' },
        joiner: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok(joinText(input as TextJoinInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'text.truncate',
    title: 'Truncate Text',
    description:
      'Truncate text from the left or right, optionally line by line with an indicator.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text', 'maxLength'],
      additionalProperties: false,
      properties: {
        text: { type: 'string', maxLength: maxTextLength },
        maxLength: { type: 'integer', minimum: 0 },
        side: { type: 'string', enum: truncateSides, default: 'right' },
        lineByLine: { type: 'boolean', default: false },
        addIndicator: { type: 'boolean', default: false },
        indicator: { type: 'string', default: '' }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['output', 'maxLength', 'side', 'lineByLine', 'truncated'],
      additionalProperties: false,
      properties: {
        output: { type: 'string' },
        maxLength: { type: 'integer' },
        side: { type: 'string', enum: truncateSides },
        lineByLine: { type: 'boolean' },
        truncated: { type: 'boolean' }
      }
    },
    execute: (input) => {
      try {
        return ok(truncateTextCore(input as TextTruncateInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'text.reverse',
    title: 'Reverse Text',
    description: 'Reverse a whole text input or reverse each line separately.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string', maxLength: maxTextLength },
        multiLine: { type: 'boolean', default: false },
        removeEmptyItems: { type: 'boolean', default: false },
        trimItems: { type: 'boolean', default: false }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['output', 'itemCount', 'multiLine'],
      additionalProperties: false,
      properties: {
        output: { type: 'string' },
        itemCount: { type: 'integer' },
        multiLine: { type: 'boolean' }
      }
    },
    execute: (input) => {
      try {
        return ok(reverseText(input as TextReverseInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'text.uppercase',
    title: 'Uppercase Text',
    description: 'Convert text to uppercase.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string', maxLength: maxTextLength }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['output', 'changed'],
      additionalProperties: false,
      properties: {
        output: { type: 'string' },
        changed: { type: 'boolean' }
      }
    },
    execute: (input) => {
      try {
        const text = (input as { text: string }).text;
        return ok(changeTextCase(text, 'uppercase'));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'text.lowercase',
    title: 'Lowercase Text',
    description: 'Convert text to lowercase.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string', maxLength: maxTextLength }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['output', 'changed'],
      additionalProperties: false,
      properties: {
        output: { type: 'string' },
        changed: { type: 'boolean' }
      }
    },
    execute: (input) => {
      try {
        const text = (input as { text: string }).text;
        return ok(changeTextCase(text, 'lowercase'));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'text.title_case',
    title: 'Title Case Text',
    description: 'Convert text to title case.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string', maxLength: maxTextLength }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['output', 'changed'],
      additionalProperties: false,
      properties: {
        output: { type: 'string' },
        changed: { type: 'boolean' }
      }
    },
    execute: (input) => {
      try {
        const text = (input as { text: string }).text;
        return ok(changeTextCase(text, 'title_case'));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'text.capitalize',
    title: 'Capitalize Text',
    description: 'Capitalize the first letter of each line.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string', maxLength: maxTextLength }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['output', 'changed'],
      additionalProperties: false,
      properties: {
        output: { type: 'string' },
        changed: { type: 'boolean' }
      }
    },
    execute: (input) => {
      try {
        const text = (input as { text: string }).text;
        return ok(changeTextCase(text, 'capitalize'));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'text.camel_snake',
    title: 'Camel / Snake Case',
    description:
      'Convert identifier lines between camelCase/PascalCase and snake_case.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string', maxLength: maxTextLength },
        mode: {
          type: 'string',
          enum: camelSnakeModes,
          default: 'camel_to_snake'
        },
        pascalCase: {
          type: 'boolean',
          default: false,
          description:
            'When converting snake_case to camelCase, capitalize the first identifier part.'
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['output', 'mode', 'changed', 'lineCount'],
      additionalProperties: false,
      properties: {
        output: { type: 'string' },
        mode: { type: 'string', enum: camelSnakeModes },
        changed: { type: 'boolean' },
        lineCount: { type: 'integer' }
      }
    },
    execute: (input) => {
      try {
        return ok(convertCamelSnake(input as TextCamelSnakeInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'text.full_half_width',
    title: 'Fullwidth / Halfwidth Text',
    description:
      'Convert ASCII-compatible fullwidth characters to halfwidth, or the reverse.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string', maxLength: maxTextLength },
        mode: {
          type: 'string',
          enum: fullHalfWidthModes,
          default: 'full_to_half'
        },
        convertSpaces: { type: 'boolean', default: true }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['output', 'mode', 'changed'],
      additionalProperties: false,
      properties: {
        output: { type: 'string' },
        mode: { type: 'string', enum: fullHalfWidthModes },
        changed: { type: 'boolean' }
      }
    },
    execute: (input) => {
      try {
        return ok(convertFullHalfWidth(input as TextFullHalfWidthInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'text.stats',
    title: 'Text Statistics',
    description:
      'Count characters, words, lines, sentences, paragraphs, bytes, and optional frequency tables.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string', maxLength: maxTextLength },
        includeEmptyLines: { type: 'boolean', default: false },
        sentenceDelimiters: {
          type: 'array',
          items: { type: 'string' },
          default: defaultSentenceDelimiters
        },
        wordDelimiters: {
          type: 'string',
          default: defaultWordDelimiters
        },
        includeCharacterFrequency: { type: 'boolean', default: false },
        includeWordFrequency: { type: 'boolean', default: false },
        maxFrequencyItems: {
          type: 'integer',
          minimum: 1,
          maximum: maxFrequencyItemsLimit,
          default: 100
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'characters',
        'codePoints',
        'words',
        'lines',
        'sentences',
        'paragraphs',
        'bytesUtf8',
        'characterFrequency',
        'wordFrequency'
      ],
      additionalProperties: false,
      properties: {
        characters: { type: 'integer' },
        codePoints: { type: 'integer' },
        words: { type: 'integer' },
        lines: { type: 'integer' },
        sentences: { type: 'integer' },
        paragraphs: { type: 'integer' },
        bytesUtf8: { type: 'integer' },
        characterFrequency: {
          type: 'array',
          items: {
            type: 'object',
            required: ['value', 'displayValue', 'count', 'percentage'],
            additionalProperties: false,
            properties: {
              value: { type: 'string' },
              displayValue: { type: 'string' },
              count: { type: 'integer' },
              percentage: { type: 'number' }
            }
          }
        },
        wordFrequency: {
          type: 'array',
          items: {
            type: 'object',
            required: ['value', 'displayValue', 'count', 'percentage'],
            additionalProperties: false,
            properties: {
              value: { type: 'string' },
              displayValue: { type: 'string' },
              count: { type: 'integer' },
              percentage: { type: 'number' }
            }
          }
        }
      }
    },
    execute: (input) => {
      try {
        return ok(getTextStats(input as TextStatsInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
