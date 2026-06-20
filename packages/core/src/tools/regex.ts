import {
  type JsonValue,
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type RegexInputBase = {
  pattern: string;
  flags?: string;
};

export type RegexTestInput = RegexInputBase & {
  text: string;
  global?: boolean;
  maxMatches?: number;
};

export type RegexReplaceInput = RegexInputBase & {
  text: string;
  replacement: string;
  global?: boolean;
};

export type RegexExplainInput = RegexInputBase;

const regexCodeLanguages = [
  'javascript',
  'python',
  'go',
  'java',
  'php',
  'ruby'
] as const;

export type RegexCodeLanguage = (typeof regexCodeLanguages)[number];

export type RegexToCodeInput = RegexInputBase & {
  language?: RegexCodeLanguage;
  variableName?: string;
  textVariableName?: string;
};

export type RegexVisualizeInput = RegexInputBase & {
  maxNodes?: number;
};

export type RegexMatch = {
  match: string;
  index: number;
  captures: (string | null)[];
  namedGroups: Record<string, string>;
};

export type RegexTestOutput = {
  matched: boolean;
  matchCount: number;
  matches: RegexMatch[];
};

export type RegexReplaceOutput = {
  output: string;
  matchCount: number;
};

export type RegexExplanationToken = {
  type: string;
  value: string;
  description: string;
  start: number;
  end: number;
};

export type RegexExplainOutput = {
  valid: boolean;
  pattern: string;
  flags: string;
  summary: string;
  tokens: RegexExplanationToken[];
  flagDescriptions: string[];
  error: string | null;
};

export type RegexToCodeOutput = {
  language: RegexCodeLanguage;
  pattern: string;
  flags: string;
  code: string;
  warnings: string[];
};

export type RegexVisualizationNode = {
  id: string;
  type: string;
  label: string;
  value: string;
  description: string;
  start: number | null;
  end: number | null;
  depth: number;
};

export type RegexVisualizationEdge = {
  from: string;
  to: string;
  label: string | null;
};

export type RegexVisualizeOutput = {
  valid: boolean;
  pattern: string;
  flags: string;
  summary: string;
  nodes: RegexVisualizationNode[];
  edges: RegexVisualizationEdge[];
  mermaid: string;
  warnings: string[];
  error: string | null;
};

const allowedFlags = new Set(['d', 'g', 'i', 'm', 's', 'u', 'v', 'y']);
const maxPatternLength = 10_000;
const maxTextLength = 200_000;

const flagDescriptions: Record<string, string> = {
  d: 'Return match index ranges.',
  g: 'Find all matches.',
  i: 'Ignore character case.',
  m: 'Make ^ and $ match line boundaries.',
  s: 'Let . match line terminators.',
  u: 'Use Unicode mode.',
  v: 'Use Unicode sets mode.',
  y: 'Match only from lastIndex.'
};

const regexInputSchema = {
  type: 'object',
  required: ['pattern'],
  additionalProperties: false,
  properties: {
    pattern: { type: 'string' },
    flags: { type: 'string' }
  }
} as const;

const normalizeString = (
  value: unknown,
  fieldName: string,
  maxLength: number
): string => {
  if (typeof value !== 'string') {
    throw new ToolboxError(
      'INVALID_REGEX_INPUT',
      `${fieldName} must be a string`
    );
  }

  if (value.length > maxLength) {
    throw new ToolboxError(
      'REGEX_INPUT_TOO_LARGE',
      `${fieldName} is too large; maximum length is ${maxLength}`
    );
  }

  return value;
};

const parsePatternLiteral = (
  pattern: string,
  explicitFlags: string | undefined
): { pattern: string; flags: string } => {
  if (explicitFlags !== undefined) {
    return {
      pattern,
      flags: explicitFlags
    };
  }

  if (!pattern.startsWith('/')) {
    return {
      pattern,
      flags: ''
    };
  }

  let escaped = false;
  let inCharacterClass = false;

  for (let index = pattern.length - 1; index > 0; index -= 1) {
    const character = pattern[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      continue;
    }

    if (character === ']') {
      inCharacterClass = true;
      continue;
    }

    if (character === '[') {
      inCharacterClass = false;
      continue;
    }

    if (character === '/' && !inCharacterClass) {
      return {
        pattern: pattern.slice(1, index),
        flags: pattern.slice(index + 1)
      };
    }
  }

  return {
    pattern,
    flags: ''
  };
};

const normalizeFlags = (flags: unknown, ensureGlobal = false): string => {
  if (flags === undefined || flags === null) {
    flags = '';
  }

  if (typeof flags !== 'string') {
    throw new ToolboxError('INVALID_REGEX_INPUT', 'flags must be a string');
  }

  const normalizedFlags =
    ensureGlobal && !flags.includes('g') ? `${flags}g` : flags;
  const uniqueFlags: string[] = [];

  for (const flag of normalizedFlags) {
    if (!allowedFlags.has(flag)) {
      throw new ToolboxError(
        'INVALID_REGEX_FLAG',
        `Unsupported regex flag: ${flag}`
      );
    }

    if (uniqueFlags.includes(flag)) {
      throw new ToolboxError(
        'INVALID_REGEX_FLAG',
        `Duplicate regex flag: ${flag}`
      );
    }

    uniqueFlags.push(flag);
  }

  if (uniqueFlags.includes('u') && uniqueFlags.includes('v')) {
    throw new ToolboxError(
      'INVALID_REGEX_FLAG',
      'Regex flags u and v cannot be used together'
    );
  }

  return uniqueFlags.sort().join('');
};

const makeRegex = (
  input: RegexInputBase,
  ensureGlobal = false
): { regex: RegExp; pattern: string; flags: string } => {
  const rawPattern = normalizeString(
    input.pattern,
    'pattern',
    maxPatternLength
  );
  const parsed = parsePatternLiteral(rawPattern, input.flags);
  const flags = normalizeFlags(parsed.flags, ensureGlobal);

  try {
    return {
      regex: new RegExp(parsed.pattern, flags),
      pattern: parsed.pattern,
      flags
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid regular expression';
    throw new ToolboxError('INVALID_REGEX', message);
  }
};

const normalizeBoolean = (
  value: unknown,
  fieldName: string,
  defaultValue: boolean
): boolean => {
  if (value === undefined) return defaultValue;
  if (typeof value !== 'boolean') {
    throw new ToolboxError(
      'INVALID_REGEX_INPUT',
      `${fieldName} must be a boolean`
    );
  }

  return value;
};

const normalizeMaxMatches = (value: unknown): number => {
  if (value === undefined) return 100;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 1000
  ) {
    throw new ToolboxError(
      'INVALID_REGEX_INPUT',
      'maxMatches must be an integer from 1 to 1000'
    );
  }

  return value;
};

const normalizeMaxNodes = (value: unknown): number => {
  if (value === undefined) return 120;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 500
  ) {
    throw new ToolboxError(
      'INVALID_REGEX_INPUT',
      'maxNodes must be an integer from 1 to 500'
    );
  }

  return value;
};

const toNamedGroups = (
  groups: Record<string, string> | undefined
): Record<string, string> => (groups ? { ...groups } : {});

const toRegexMatch = (match: RegExpExecArray): RegexMatch => ({
  match: match[0],
  index: match.index,
  captures: match.slice(1).map((capture) => capture ?? null),
  namedGroups: toNamedGroups(match.groups)
});

const collectMatches = (regex: RegExp, text: string, maxMatches: number) => {
  const matches: RegexMatch[] = [];
  let result: RegExpExecArray | null;

  while ((result = regex.exec(text)) !== null) {
    matches.push(toRegexMatch(result));
    if (matches.length >= maxMatches) break;

    if (result[0] === '') {
      regex.lastIndex += 1;
    }

    if (!regex.global && !regex.sticky) break;
  }

  return matches;
};

export const testRegex = (input: RegexTestInput): RegexTestOutput => {
  const text = normalizeString(input.text, 'text', maxTextLength);
  const global = normalizeBoolean(input.global, 'global', true);
  const maxMatches = normalizeMaxMatches(input.maxMatches);
  const { regex } = makeRegex(input, global);
  const matches = collectMatches(regex, text, maxMatches);

  return {
    matched: matches.length > 0,
    matchCount: matches.length,
    matches
  };
};

export const replaceRegex = (input: RegexReplaceInput): RegexReplaceOutput => {
  const text = normalizeString(input.text, 'text', maxTextLength);
  const replacement = normalizeString(
    input.replacement,
    'replacement',
    maxTextLength
  );
  const global = normalizeBoolean(input.global, 'global', true);
  const { regex } = makeRegex(input, global);
  const matches = collectMatches(regex, text, Number.MAX_SAFE_INTEGER);

  return {
    output: text.replace(regex, replacement),
    matchCount: matches.length
  };
};

const token = (
  type: string,
  value: string,
  description: string,
  start: number,
  end: number
): RegexExplanationToken => ({
  type,
  value,
  description,
  start,
  end
});

const describeEscape = (value: string): string => {
  switch (value) {
    case '\\d':
      return 'A digit character.';
    case '\\D':
      return 'A non-digit character.';
    case '\\w':
      return 'A word character.';
    case '\\W':
      return 'A non-word character.';
    case '\\s':
      return 'A whitespace character.';
    case '\\S':
      return 'A non-whitespace character.';
    case '\\b':
      return 'A word boundary.';
    case '\\B':
      return 'Not a word boundary.';
    case '\\n':
      return 'A line feed character.';
    case '\\r':
      return 'A carriage return character.';
    case '\\t':
      return 'A tab character.';
    case '\\0':
      return 'A null character.';
    default:
      break;
  }

  if (/^\\[1-9]\d*$/.test(value)) {
    return `Backreference to capture group ${value.slice(1)}.`;
  }

  if (/^\\[pP]\{.+\}$/.test(value)) {
    return value.startsWith('\\p')
      ? `A character with Unicode property ${value.slice(3, -1)}.`
      : `A character without Unicode property ${value.slice(3, -1)}.`;
  }

  if (/^\\x[0-9A-Fa-f]{2}$/.test(value)) {
    return `Character with hexadecimal code ${value.slice(2)}.`;
  }

  if (/^\\u[0-9A-Fa-f]{4}$/.test(value)) {
    return `Character with Unicode code point ${value.slice(2)}.`;
  }

  if (/^\\k<[^>]+>$/.test(value)) {
    return `Backreference to named group ${value.slice(3, -1)}.`;
  }

  return `Escaped literal ${value.slice(1)}.`;
};

const readEscape = (pattern: string, start: number): RegexExplanationToken => {
  const rest = pattern.slice(start);
  const propertyMatch = rest.match(/^\\[pP]\{[^}]+\}/);
  if (propertyMatch) {
    return token(
      'escape',
      propertyMatch[0],
      describeEscape(propertyMatch[0]),
      start,
      start + propertyMatch[0].length
    );
  }

  const namedBackref = rest.match(/^\\k<[^>]+>/);
  if (namedBackref) {
    return token(
      'backreference',
      namedBackref[0],
      describeEscape(namedBackref[0]),
      start,
      start + namedBackref[0].length
    );
  }

  const hexMatch = rest.match(/^\\x[0-9A-Fa-f]{2}/);
  if (hexMatch) {
    return token(
      'escape',
      hexMatch[0],
      describeEscape(hexMatch[0]),
      start,
      start + hexMatch[0].length
    );
  }

  const unicodeMatch = rest.match(/^\\u[0-9A-Fa-f]{4}/);
  if (unicodeMatch) {
    return token(
      'escape',
      unicodeMatch[0],
      describeEscape(unicodeMatch[0]),
      start,
      start + unicodeMatch[0].length
    );
  }

  const value = pattern.slice(start, start + 2);
  return token(
    'escape',
    value,
    describeEscape(value),
    start,
    start + value.length
  );
};

const readCharacterClass = (
  pattern: string,
  start: number
): RegexExplanationToken => {
  let index = start + 1;
  let escaped = false;

  while (index < pattern.length) {
    const character = pattern[index];
    if (escaped) {
      escaped = false;
      index += 1;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      index += 1;
      continue;
    }

    if (character === ']') {
      index += 1;
      break;
    }

    index += 1;
  }

  const value = pattern.slice(start, index);
  const negated = value.startsWith('[^');
  return token(
    'character_class',
    value,
    negated
      ? `Any character except one of ${value.slice(2, -1)}.`
      : `One character from ${value.slice(1, -1)}.`,
    start,
    index
  );
};

const readQuantifier = (
  pattern: string,
  start: number
): RegexExplanationToken | null => {
  const simple = pattern[start];
  const lazy = pattern[start + 1] === '?';

  if (simple === '*') {
    return token(
      'quantifier',
      lazy ? '*?' : '*',
      lazy
        ? 'Repeat zero or more times, lazily.'
        : 'Repeat zero or more times.',
      start,
      start + (lazy ? 2 : 1)
    );
  }

  if (simple === '+') {
    return token(
      'quantifier',
      lazy ? '+?' : '+',
      lazy ? 'Repeat one or more times, lazily.' : 'Repeat one or more times.',
      start,
      start + (lazy ? 2 : 1)
    );
  }

  if (simple === '?') {
    return token(
      'quantifier',
      lazy ? '??' : '?',
      lazy ? 'Match zero or one time, lazily.' : 'Match zero or one time.',
      start,
      start + (lazy ? 2 : 1)
    );
  }

  const rangeMatch = pattern.slice(start).match(/^\{(\d+)(,(\d*)?)?\}\??/);
  if (!rangeMatch) return null;

  const value = rangeMatch[0];
  const minimum = rangeMatch[1];
  const maximum = rangeMatch[3];
  const hasComma = rangeMatch[2] !== undefined;
  const isLazy = value.endsWith('?');
  let description = '';

  if (!hasComma) {
    description = `Repeat exactly ${minimum} times.`;
  } else if (maximum === undefined || maximum === '') {
    description = `Repeat at least ${minimum} times.`;
  } else {
    description = `Repeat from ${minimum} to ${maximum} times.`;
  }

  if (isLazy) {
    description = description.replace(/\.$/, ', lazily.');
  }

  return token('quantifier', value, description, start, start + value.length);
};

const readGroup = (pattern: string, start: number): RegexExplanationToken => {
  const rest = pattern.slice(start);

  if (rest.startsWith('(?:')) {
    return token(
      'group',
      '(?:',
      'Start a non-capturing group.',
      start,
      start + 3
    );
  }

  if (rest.startsWith('(?=')) {
    return token(
      'lookahead',
      '(?=',
      'Start a positive lookahead.',
      start,
      start + 3
    );
  }

  if (rest.startsWith('(?!')) {
    return token(
      'lookahead',
      '(?!',
      'Start a negative lookahead.',
      start,
      start + 3
    );
  }

  if (rest.startsWith('(?<=')) {
    return token(
      'lookbehind',
      '(?<=',
      'Start a positive lookbehind.',
      start,
      start + 4
    );
  }

  if (rest.startsWith('(?<!')) {
    return token(
      'lookbehind',
      '(?<!',
      'Start a negative lookbehind.',
      start,
      start + 4
    );
  }

  const namedGroup = rest.match(/^\(\?<([^>]+)>/);
  if (namedGroup) {
    return token(
      'group',
      namedGroup[0],
      `Start named capture group ${namedGroup[1]}.`,
      start,
      start + namedGroup[0].length
    );
  }

  return token('group', '(', 'Start a capture group.', start, start + 1);
};

const explainPattern = (pattern: string): RegexExplanationToken[] => {
  const tokens: RegexExplanationToken[] = [];
  let index = 0;

  while (index < pattern.length) {
    const character = pattern[index];

    if (character === '\\') {
      const escapeToken = readEscape(pattern, index);
      tokens.push(escapeToken);
      index = escapeToken.end;
      continue;
    }

    if (character === '[') {
      const classToken = readCharacterClass(pattern, index);
      tokens.push(classToken);
      index = classToken.end;
      continue;
    }

    if (character === '(') {
      const groupToken = readGroup(pattern, index);
      tokens.push(groupToken);
      index = groupToken.end;
      continue;
    }

    if (character === ')') {
      tokens.push(
        token('group', ')', 'End the current group.', index, index + 1)
      );
      index += 1;
      continue;
    }

    const quantifier = readQuantifier(pattern, index);
    if (quantifier) {
      tokens.push(quantifier);
      index = quantifier.end;
      continue;
    }

    if (character === '^') {
      tokens.push(
        token('anchor', '^', 'Start of input or line.', index, index + 1)
      );
      index += 1;
      continue;
    }

    if (character === '$') {
      tokens.push(
        token('anchor', '$', 'End of input or line.', index, index + 1)
      );
      index += 1;
      continue;
    }

    if (character === '.') {
      tokens.push(
        token(
          'wildcard',
          '.',
          'Any character except line terminators unless the s flag is set.',
          index,
          index + 1
        )
      );
      index += 1;
      continue;
    }

    if (character === '|') {
      tokens.push(
        token(
          'alternation',
          '|',
          'Match the expression on either side.',
          index,
          index + 1
        )
      );
      index += 1;
      continue;
    }

    tokens.push(
      token(
        'literal',
        character,
        `Literal character ${character}.`,
        index,
        index + 1
      )
    );
    index += 1;
  }

  return tokens;
};

const buildSummary = (
  tokens: RegexExplanationToken[],
  flagDescriptionList: string[]
): string => {
  const featureNames = new Set(
    tokens
      .filter((item) => item.type !== 'literal')
      .map((item) => item.type.replace('_', ' '))
  );
  const features =
    featureNames.size > 0
      ? Array.from(featureNames).join(', ')
      : 'literal text';
  const flags =
    flagDescriptionList.length > 0
      ? ` Flags: ${flagDescriptionList.join(' ')}`
      : '';

  return `Pattern uses ${features}.${flags}`;
};

export const explainRegex = (input: RegexExplainInput): RegexExplainOutput => {
  let pattern = '';
  let flags = '';

  try {
    const parsed = makeRegex(input);
    pattern = parsed.pattern;
    flags = parsed.flags;
    const tokens = explainPattern(pattern);
    const descriptions = flags.split('').map((flag) => flagDescriptions[flag]);

    return {
      valid: true,
      pattern,
      flags,
      summary: buildSummary(tokens, descriptions),
      tokens,
      flagDescriptions: descriptions,
      error: null
    };
  } catch (error) {
    return {
      valid: false,
      pattern,
      flags,
      summary: '',
      tokens: [],
      flagDescriptions: [],
      error:
        error instanceof Error ? error.message : 'Invalid regular expression'
    };
  }
};

const normalizeCodeLanguage = (value: unknown): RegexCodeLanguage => {
  if (value === undefined || value === null || value === '')
    return 'javascript';
  if (
    typeof value !== 'string' ||
    !regexCodeLanguages.includes(value as RegexCodeLanguage)
  ) {
    throw new ToolboxError(
      'INVALID_REGEX_CODE_LANGUAGE',
      `language must be one of: ${regexCodeLanguages.join(', ')}`
    );
  }

  return value as RegexCodeLanguage;
};

const normalizeIdentifier = (
  value: unknown,
  fallback: string,
  fieldName: string
): string => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string' || !/^[A-Za-z_$][\w$]*$/.test(value)) {
    throw new ToolboxError(
      'INVALID_REGEX_CODE_IDENTIFIER',
      `${fieldName} must be a valid identifier`
    );
  }

  return value;
};

const jsString = (value: string): string => JSON.stringify(value);

const regexUnsupportedFlags = (
  flags: string,
  supported: string[],
  language: string
): string[] => {
  const unsupported = flags
    .split('')
    .filter((flag) => !supported.includes(flag));
  return unsupported.length
    ? [
        `${language} snippet omits unsupported JavaScript flags: ${unsupported.join(
          ', '
        )}`
      ]
    : [];
};

const pythonFlags = (flags: string): { code: string; warnings: string[] } => {
  const parts: string[] = [];
  if (flags.includes('i')) parts.push('re.IGNORECASE');
  if (flags.includes('m')) parts.push('re.MULTILINE');
  if (flags.includes('s')) parts.push('re.DOTALL');

  return {
    code: parts.length ? parts.join(' | ') : '0',
    warnings: regexUnsupportedFlags(flags, ['i', 'm', 's', 'u'], 'Python')
  };
};

const javaFlags = (flags: string): { code: string; warnings: string[] } => {
  const parts: string[] = [];
  if (flags.includes('i')) parts.push('Pattern.CASE_INSENSITIVE');
  if (flags.includes('m')) parts.push('Pattern.MULTILINE');
  if (flags.includes('s')) parts.push('Pattern.DOTALL');
  if (flags.includes('u')) parts.push('Pattern.UNICODE_CASE');

  return {
    code: parts.length ? parts.join(' | ') : '0',
    warnings: regexUnsupportedFlags(flags, ['i', 'm', 's', 'u'], 'Java')
  };
};

const phpDelimitPattern = (pattern: string): string =>
  pattern.replace(/\\/g, '\\\\').replace(/\//g, '\\/');

const rubyOptions = (flags: string): { code: string; warnings: string[] } => {
  const options: string[] = [];
  if (flags.includes('i')) options.push('Regexp::IGNORECASE');
  if (flags.includes('m') || flags.includes('s'))
    options.push('Regexp::MULTILINE');

  return {
    code: options.length ? `, ${options.join(' | ')}` : '',
    warnings: regexUnsupportedFlags(flags, ['i', 'm', 's', 'u'], 'Ruby')
  };
};

const goPattern = (pattern: string, flags: string): string => {
  const inlineFlags = ['i', 'm', 's']
    .filter((flag) => flags.includes(flag))
    .join('');
  return `${inlineFlags ? `(?${inlineFlags})` : ''}${pattern}`;
};

export const regexToCode = (input: RegexToCodeInput): RegexToCodeOutput => {
  const { pattern, flags } = makeRegex(input, false);
  const language = normalizeCodeLanguage(input.language);
  const variableName = normalizeIdentifier(
    input.variableName,
    'regex',
    'variableName'
  );
  const textVariableName = normalizeIdentifier(
    input.textVariableName,
    'text',
    'textVariableName'
  );
  const warnings: string[] = [];
  let code = '';

  if (language === 'javascript') {
    code = `const ${textVariableName} = \"sample text\";\nconst ${variableName} = new RegExp(${jsString(
      pattern
    )}, ${jsString(
      flags
    )});\nconst matches = [...${textVariableName}.matchAll(${variableName}.global ? ${variableName} : new RegExp(${variableName}.source, ${variableName}.flags.includes(\"g\") ? ${variableName}.flags : ${variableName}.flags + \"g\"))];`;
  } else if (language === 'python') {
    const flagInfo = pythonFlags(flags);
    warnings.push(...flagInfo.warnings);
    code = `import re\n\n${textVariableName} = \"sample text\"\n${variableName} = re.compile(${jsString(
      pattern
    )}, ${
      flagInfo.code
    })\nmatches = list(${variableName}.finditer(${textVariableName}))`;
  } else if (language === 'go') {
    warnings.push(...regexUnsupportedFlags(flags, ['i', 'm', 's', 'u'], 'Go'));
    code = `package main\n\nimport \"regexp\"\n\nfunc main() {\n\t${textVariableName} := \"sample text\"\n\t${variableName} := regexp.MustCompile(${jsString(
      goPattern(pattern, flags)
    )})\n\tmatches := ${variableName}.FindAllStringSubmatch(${textVariableName}, -1)\n\t_ = matches\n}`;
  } else if (language === 'java') {
    const flagInfo = javaFlags(flags);
    warnings.push(...flagInfo.warnings);
    code = `import java.util.regex.*;\n\nString ${textVariableName} = \"sample text\";\nPattern ${variableName} = Pattern.compile(${jsString(
      pattern
    )}, ${
      flagInfo.code
    });\nMatcher matcher = ${variableName}.matcher(${textVariableName});\nwhile (matcher.find()) {\n    System.out.println(matcher.group());\n}`;
  } else if (language === 'php') {
    const phpFlags = flags
      .split('')
      .filter((flag) => ['i', 'm', 's', 'u'].includes(flag))
      .join('');
    warnings.push(...regexUnsupportedFlags(flags, ['i', 'm', 's', 'u'], 'PHP'));
    code = `$${textVariableName} = \"sample text\";\n$${variableName} = '/${phpDelimitPattern(
      pattern
    )}/${phpFlags}';\npreg_match_all($${variableName}, $${textVariableName}, $matches);`;
  } else {
    const optionInfo = rubyOptions(flags);
    warnings.push(...optionInfo.warnings);
    code = `${textVariableName} = \"sample text\"\n${variableName} = Regexp.new(${jsString(
      pattern
    )}${optionInfo.code})\nmatches = ${textVariableName}.scan(${variableName})`;
  }

  return {
    language,
    pattern,
    flags,
    code,
    warnings
  };
};

const isGroupStartToken = (item: RegexExplanationToken): boolean =>
  item.type === 'group' && item.value !== ')';

const isGroupEndToken = (item: RegexExplanationToken): boolean =>
  item.type === 'group' && item.value === ')';

const truncateDescription = (description: string): string =>
  description.length > 90 ? `${description.slice(0, 87)}...` : description;

const mermaidLabel = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\[/g, '&#91;')
    .replace(/\]/g, '&#93;')
    .replace(/\n/g, '<br/>');

const buildRegexMermaid = (
  nodes: RegexVisualizationNode[],
  edges: RegexVisualizationEdge[]
): string => {
  const nodeLines = nodes.map((node) => {
    const label =
      node.id === 'start' || node.id === 'end'
        ? node.label
        : `${node.label}: ${node.value}\n${truncateDescription(
            node.description
          )}`;

    return `  ${node.id}["${mermaidLabel(label)}"]`;
  });
  const edgeLines = edges.map((edge) =>
    edge.label
      ? `  ${edge.from} -->|"${mermaidLabel(edge.label)}"| ${edge.to}`
      : `  ${edge.from} --> ${edge.to}`
  );

  return ['flowchart LR', ...nodeLines, ...edgeLines].join('\n');
};

export const visualizeRegex = (
  input: RegexVisualizeInput
): RegexVisualizeOutput => {
  const maxNodes = normalizeMaxNodes(input.maxNodes);
  const explain = explainRegex(input);

  if (!explain.valid) {
    return {
      valid: false,
      pattern: explain.pattern,
      flags: explain.flags,
      summary: explain.summary,
      nodes: [],
      edges: [],
      mermaid: '',
      warnings: [],
      error: explain.error
    };
  }

  const visibleTokens = explain.tokens.slice(0, maxNodes);
  const warnings: string[] = [];
  let depth = 0;
  const nodes: RegexVisualizationNode[] = [
    {
      id: 'start',
      type: 'boundary',
      label: 'Start',
      value: '',
      description: 'Start of the pattern.',
      start: null,
      end: null,
      depth
    }
  ];

  visibleTokens.forEach((item, index) => {
    if (isGroupEndToken(item)) {
      depth = Math.max(0, depth - 1);
    }

    nodes.push({
      id: `n${index + 1}`,
      type: item.type,
      label: item.type.replace(/_/g, ' '),
      value: item.value,
      description: item.description,
      start: item.start,
      end: item.end,
      depth
    });

    if (isGroupStartToken(item)) {
      depth += 1;
    }
  });

  if (explain.tokens.length > maxNodes) {
    warnings.push(
      `Visualization truncated to ${maxNodes} tokens from ${explain.tokens.length}.`
    );
    nodes.push({
      id: 'truncated',
      type: 'truncated',
      label: 'More',
      value: '...',
      description: 'Additional tokens were omitted from the graph.',
      start: null,
      end: null,
      depth: 0
    });
  }

  nodes.push({
    id: 'end',
    type: 'boundary',
    label: 'End',
    value: '',
    description: 'End of the pattern.',
    start: null,
    end: null,
    depth: 0
  });

  const edges: RegexVisualizationEdge[] = [];
  for (let index = 0; index < nodes.length - 1; index += 1) {
    const current = nodes[index];
    const next = nodes[index + 1];
    edges.push({
      from: current.id,
      to: next.id,
      label: next.type === 'alternation' ? 'or' : null
    });
  }

  return {
    valid: true,
    pattern: explain.pattern,
    flags: explain.flags,
    summary: explain.summary,
    nodes,
    edges,
    mermaid: buildRegexMermaid(nodes, edges),
    warnings,
    error: null
  };
};

const regexMatchSchema = {
  type: 'object',
  required: ['match', 'index', 'captures', 'namedGroups'],
  additionalProperties: false,
  properties: {
    match: { type: 'string' },
    index: { type: 'number' },
    captures: {
      type: 'array',
      items: { type: ['string', 'null'] }
    },
    namedGroups: {
      type: 'object',
      additionalProperties: { type: 'string' }
    }
  }
} as const;

const regexTestInputSchema = {
  type: 'object',
  required: ['pattern', 'text'],
  additionalProperties: false,
  properties: {
    ...regexInputSchema.properties,
    text: { type: 'string' },
    global: { type: 'boolean' },
    maxMatches: {
      type: 'integer',
      minimum: 1,
      maximum: 1000
    }
  }
} as const;

export const regexTools: ToolboxTool[] = [
  {
    name: 'regex.test',
    title: 'Regex Test',
    description: 'Test a JavaScript regular expression against text.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: regexTestInputSchema,
    outputSchema: {
      type: 'object',
      required: ['matched', 'matchCount', 'matches'],
      additionalProperties: false,
      properties: {
        matched: { type: 'boolean' },
        matchCount: { type: 'number' },
        matches: {
          type: 'array',
          items: regexMatchSchema
        }
      }
    },
    execute: (input) => {
      try {
        return ok(testRegex(input as RegexTestInput) as unknown as JsonValue);
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'regex.replace',
    title: 'Regex Replace',
    description: 'Replace text using a JavaScript regular expression.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['pattern', 'text', 'replacement'],
      additionalProperties: false,
      properties: {
        ...regexInputSchema.properties,
        text: { type: 'string' },
        replacement: { type: 'string' },
        global: { type: 'boolean' }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['output', 'matchCount'],
      additionalProperties: false,
      properties: {
        output: { type: 'string' },
        matchCount: { type: 'number' }
      }
    },
    execute: (input) => {
      try {
        return ok(replaceRegex(input as RegexReplaceInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'regex.explain',
    title: 'Regex Explain',
    description: 'Explain common JavaScript regular expression syntax.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: regexInputSchema,
    outputSchema: {
      type: 'object',
      required: [
        'valid',
        'pattern',
        'flags',
        'summary',
        'tokens',
        'flagDescriptions',
        'error'
      ],
      additionalProperties: false,
      properties: {
        valid: { type: 'boolean' },
        pattern: { type: 'string' },
        flags: { type: 'string' },
        summary: { type: 'string' },
        tokens: {
          type: 'array',
          items: {
            type: 'object',
            required: ['type', 'value', 'description', 'start', 'end'],
            additionalProperties: false,
            properties: {
              type: { type: 'string' },
              value: { type: 'string' },
              description: { type: 'string' },
              start: { type: 'number' },
              end: { type: 'number' }
            }
          }
        },
        flagDescriptions: {
          type: 'array',
          items: { type: 'string' }
        },
        error: { type: ['string', 'null'] }
      }
    },
    execute: (input) => {
      try {
        return ok(
          explainRegex(input as RegexExplainInput) as unknown as JsonValue
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'regex.to_code',
    title: 'Regex to Code',
    description:
      'Generate a small code snippet for using a JavaScript regular expression in common languages.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['pattern'],
      additionalProperties: false,
      properties: {
        ...regexInputSchema.properties,
        language: {
          type: 'string',
          enum: regexCodeLanguages,
          default: 'javascript'
        },
        variableName: { type: 'string', default: 'regex' },
        textVariableName: { type: 'string', default: 'text' }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['language', 'pattern', 'flags', 'code', 'warnings'],
      additionalProperties: false,
      properties: {
        language: { type: 'string', enum: regexCodeLanguages },
        pattern: { type: 'string' },
        flags: { type: 'string' },
        code: { type: 'string' },
        warnings: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },
    execute: (input) => {
      try {
        return ok(
          regexToCode(input as RegexToCodeInput) as unknown as JsonValue
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'regex.visualize',
    title: 'Regex Visualization',
    description:
      'Build a lightweight graph representation of a JavaScript regular expression.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['pattern'],
      additionalProperties: false,
      properties: {
        ...regexInputSchema.properties,
        maxNodes: {
          type: 'integer',
          minimum: 1,
          maximum: 500,
          default: 120
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'valid',
        'pattern',
        'flags',
        'summary',
        'nodes',
        'edges',
        'mermaid',
        'warnings',
        'error'
      ],
      additionalProperties: false,
      properties: {
        valid: { type: 'boolean' },
        pattern: { type: 'string' },
        flags: { type: 'string' },
        summary: { type: 'string' },
        nodes: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'id',
              'type',
              'label',
              'value',
              'description',
              'start',
              'end',
              'depth'
            ],
            additionalProperties: false,
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              label: { type: 'string' },
              value: { type: 'string' },
              description: { type: 'string' },
              start: { type: ['number', 'null'] },
              end: { type: ['number', 'null'] },
              depth: { type: 'number' }
            }
          }
        },
        edges: {
          type: 'array',
          items: {
            type: 'object',
            required: ['from', 'to', 'label'],
            additionalProperties: false,
            properties: {
              from: { type: 'string' },
              to: { type: 'string' },
              label: { type: ['string', 'null'] }
            }
          }
        },
        mermaid: { type: 'string' },
        warnings: {
          type: 'array',
          items: { type: 'string' }
        },
        error: { type: ['string', 'null'] }
      }
    },
    execute: (input) => {
      try {
        return ok(
          visualizeRegex(input as RegexVisualizeInput) as unknown as JsonValue
        );
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
