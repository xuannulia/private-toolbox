import {
  type JsonValue,
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type BannerFont = 'block' | 'compact' | 'modular';
export type BannerCommentStyle = 'none' | 'hash' | 'slash' | 'block';
export type BannerAnsiColor =
  | 'none'
  | 'gray'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white';
export type BannerOutputMode =
  | 'text'
  | 'shell'
  | 'javascript'
  | 'python'
  | 'go'
  | 'java';

export type BannerAsciiInput = {
  text: string;
  font?: BannerFont;
  fillCharacter?: string;
  emptyCharacter?: string;
  horizontalSpacing?: number;
  commentStyle?: BannerCommentStyle;
  outputMode?: BannerOutputMode;
  ansiColor?: BannerAnsiColor;
};

export type BannerAsciiOutput = {
  output: string;
  lines: string[];
  bannerOutput: string;
  bannerLines: string[];
  width: number;
  height: number;
  font: BannerFont;
  commentStyle: BannerCommentStyle;
  outputMode: BannerOutputMode;
  ansiColor: BannerAnsiColor;
  fallbackCharacters: string[];
};

type Glyph = string[];

const maxTextLength = 120;
const blockHeight = 7;

const fontMap: Record<string, Glyph> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  ' ': ['000', '000', '000', '000', '000', '000', '000'],
  '.': ['0', '0', '0', '0', '0', '0', '1'],
  ',': ['0', '0', '0', '0', '0', '1', '1'],
  ':': ['0', '1', '0', '0', '0', '1', '0'],
  ';': ['0', '1', '0', '0', '0', '1', '1'],
  '!': ['1', '1', '1', '1', '1', '0', '1'],
  '?': ['1110', '0001', '0001', '0010', '0100', '0000', '0100'],
  '-': ['0000', '0000', '0000', '1111', '0000', '0000', '0000'],
  _: ['0000', '0000', '0000', '0000', '0000', '0000', '1111'],
  '+': ['0000', '0010', '0010', '1111', '0010', '0010', '0000'],
  '=': ['0000', '0000', '1111', '0000', '1111', '0000', '0000'],
  '*': ['0000', '1001', '0110', '1111', '0110', '1001', '0000'],
  '/': ['0001', '0001', '0010', '0010', '0100', '1000', '1000'],
  '\\': ['1000', '1000', '0100', '0100', '0010', '0001', '0001'],
  '|': ['1', '1', '1', '1', '1', '1', '1'],
  '(': ['001', '010', '100', '100', '100', '010', '001'],
  ')': ['100', '010', '001', '001', '001', '010', '100'],
  '[': ['111', '100', '100', '100', '100', '100', '111'],
  ']': ['111', '001', '001', '001', '001', '001', '111'],
  '{': ['011', '010', '010', '100', '010', '010', '011'],
  '}': ['110', '010', '010', '001', '010', '010', '110'],
  '<': ['0001', '0010', '0100', '1000', '0100', '0010', '0001'],
  '>': ['1000', '0100', '0010', '0001', '0010', '0100', '1000'],
  '#': ['01010', '11111', '01010', '01010', '11111', '01010', '01010'],
  '@': ['01110', '10001', '10111', '10101', '10111', '10000', '01111'],
  $: ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '%': ['11001', '11010', '00100', '01000', '10110', '00110', '00000'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '"': ['101', '101', '000', '000', '000', '000', '000'],
  "'": ['1', '1', '0', '0', '0', '0', '0']
};

const compactRows = [0, 1, 3, 5, 6];
const allowedFonts = new Set<BannerFont>(['block', 'compact', 'modular']);
const allowedCommentStyles = new Set<BannerCommentStyle>([
  'none',
  'hash',
  'slash',
  'block'
]);
const allowedOutputModes = new Set<BannerOutputMode>([
  'text',
  'shell',
  'javascript',
  'python',
  'go',
  'java'
]);
const ansiColorCodes: Record<Exclude<BannerAnsiColor, 'none'>, number> = {
  gray: 90,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37
};
const allowedAnsiColors = new Set<BannerAnsiColor>([
  'none',
  ...Object.keys(ansiColorCodes)
] as BannerAnsiColor[]);

const inputSchema = {
  type: 'object',
  required: ['text'],
  additionalProperties: false,
  properties: {
    text: { type: 'string', minLength: 1, maxLength: maxTextLength },
    font: { enum: ['block', 'compact', 'modular'] },
    fillCharacter: { type: 'string', minLength: 1, maxLength: 2 },
    emptyCharacter: { type: 'string', minLength: 0, maxLength: 1 },
    horizontalSpacing: { type: 'integer', minimum: 0, maximum: 8 },
    commentStyle: { enum: ['none', 'hash', 'slash', 'block'] },
    outputMode: {
      enum: ['text', 'shell', 'javascript', 'python', 'go', 'java']
    },
    ansiColor: {
      enum: [
        'none',
        'gray',
        'red',
        'green',
        'yellow',
        'blue',
        'magenta',
        'cyan',
        'white'
      ]
    }
  }
} as const;

const outputSchema = {
  type: 'object',
  required: [
    'output',
    'lines',
    'bannerOutput',
    'bannerLines',
    'width',
    'height',
    'font',
    'commentStyle',
    'outputMode',
    'ansiColor',
    'fallbackCharacters'
  ],
  additionalProperties: false,
  properties: {
    output: { type: 'string' },
    lines: { type: 'array', items: { type: 'string' } },
    bannerOutput: { type: 'string' },
    bannerLines: { type: 'array', items: { type: 'string' } },
    width: { type: 'integer' },
    height: { type: 'integer' },
    font: { type: 'string' },
    commentStyle: { type: 'string' },
    outputMode: { type: 'string' },
    ansiColor: { type: 'string' },
    fallbackCharacters: { type: 'array', items: { type: 'string' } }
  }
} as const;

const firstCharacter = (value: string, fallback: string): string =>
  Array.from(value)[0] ?? fallback;

const normalizeText = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new ToolboxError('INVALID_BANNER_INPUT', 'text must be a string');
  }

  const text = value.replace(/\r\n?/g, '\n');
  if (!text.trim()) {
    throw new ToolboxError('INVALID_BANNER_INPUT', 'text is required');
  }

  if (Array.from(text).length > maxTextLength) {
    throw new ToolboxError(
      'BANNER_INPUT_TOO_LARGE',
      `text is too large; maximum length is ${maxTextLength}`
    );
  }

  return text;
};

const normalizeFont = (value: unknown): BannerFont => {
  if (value === undefined) return 'block';
  if (typeof value !== 'string' || !allowedFonts.has(value as BannerFont)) {
    throw new ToolboxError('INVALID_BANNER_INPUT', 'font is not supported');
  }

  return value as BannerFont;
};

const normalizeCommentStyle = (value: unknown): BannerCommentStyle => {
  if (value === undefined) return 'none';
  if (
    typeof value !== 'string' ||
    !allowedCommentStyles.has(value as BannerCommentStyle)
  ) {
    throw new ToolboxError(
      'INVALID_BANNER_INPUT',
      'commentStyle is not supported'
    );
  }

  return value as BannerCommentStyle;
};

const normalizeOutputMode = (value: unknown): BannerOutputMode => {
  if (value === undefined) return 'text';
  if (
    typeof value !== 'string' ||
    !allowedOutputModes.has(value as BannerOutputMode)
  ) {
    throw new ToolboxError(
      'INVALID_BANNER_INPUT',
      'outputMode is not supported'
    );
  }

  return value as BannerOutputMode;
};

const normalizeAnsiColor = (value: unknown): BannerAnsiColor => {
  if (value === undefined) return 'none';
  if (
    typeof value !== 'string' ||
    !allowedAnsiColors.has(value as BannerAnsiColor)
  ) {
    throw new ToolboxError(
      'INVALID_BANNER_INPUT',
      'ansiColor is not supported'
    );
  }

  return value as BannerAnsiColor;
};

const normalizeSpacing = (value: unknown): number => {
  if (value === undefined) return 1;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 8
  ) {
    throw new ToolboxError(
      'INVALID_BANNER_INPUT',
      'horizontalSpacing must be an integer from 0 to 8'
    );
  }

  return value;
};

const normalizeRenderCharacter = (
  value: unknown,
  fallback: string,
  fieldName: string
): string => {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string') {
    throw new ToolboxError(
      'INVALID_BANNER_INPUT',
      `${fieldName} must be a string`
    );
  }

  if (fieldName === 'emptyCharacter' && value === '') return '';

  return firstCharacter(value, fallback);
};

const getHeight = (font: BannerFont): number =>
  font === 'compact' ? compactRows.length : blockHeight;

const applyFontRows = (glyph: Glyph, font: BannerFont): Glyph =>
  font === 'compact' ? compactRows.map((rowIndex) => glyph[rowIndex]) : glyph;

const renderGlyph = (
  glyph: Glyph,
  font: BannerFont,
  fillCharacter: string,
  emptyCharacter: string
): string[] =>
  applyFontRows(glyph, font).map((row) =>
    Array.from(row)
      .map((cell) => (cell === '1' ? fillCharacter : emptyCharacter))
      .join('')
  );

const renderFallbackCharacter = (
  character: string,
  font: BannerFont,
  fillCharacter: string,
  emptyCharacter: string
): string[] => {
  const height = getHeight(font);
  const width = font === 'compact' ? 5 : 7;
  const middle = Math.floor(height / 2);

  return Array.from({ length: height }, (_, rowIndex) => {
    if (rowIndex === 0 || rowIndex === height - 1) {
      return fillCharacter.repeat(width);
    }

    if (rowIndex === middle) {
      const innerWidth = width - 2;
      const visibleCharacter = Array.from(character)[0] ?? '?';
      const leftPadding = Math.max(0, Math.floor((innerWidth - 1) / 2));
      const rightPadding = Math.max(0, innerWidth - leftPadding - 1);
      return [
        fillCharacter,
        emptyCharacter.repeat(leftPadding),
        visibleCharacter,
        emptyCharacter.repeat(rightPadding),
        fillCharacter
      ].join('');
    }

    return [
      fillCharacter,
      emptyCharacter.repeat(width - 2),
      fillCharacter
    ].join('');
  });
};

const padLines = (lines: string[], width: number, emptyCharacter: string) =>
  lines.map((line) => line.padEnd(width, emptyCharacter || ' '));

const renderLine = (
  text: string,
  font: BannerFont,
  fillCharacter: string,
  emptyCharacter: string,
  horizontalSpacing: number,
  fallbackCharacters: Set<string>
): string[] => {
  const height = getHeight(font);
  const rows = Array.from({ length: height }, () => '');
  const spacing = ' '.repeat(horizontalSpacing);

  Array.from(text).forEach((rawCharacter, characterIndex) => {
    const character = rawCharacter.toUpperCase();
    const glyph = fontMap[character];
    const rendered = glyph
      ? renderGlyph(glyph, font, fillCharacter, emptyCharacter)
      : renderFallbackCharacter(
          rawCharacter,
          font,
          fillCharacter,
          emptyCharacter
        );

    if (!glyph && rawCharacter !== '\t') {
      fallbackCharacters.add(rawCharacter);
    }

    const glyphWidth = Math.max(...rendered.map((line) => line.length), 0);
    const padded = padLines(rendered, glyphWidth, emptyCharacter);

    for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
      rows[rowIndex] +=
        (characterIndex === 0 ? '' : spacing) + (padded[rowIndex] ?? '');
    }
  });

  return rows;
};

const applyCommentStyle = (
  lines: string[],
  commentStyle: BannerCommentStyle
): string[] => {
  switch (commentStyle) {
    case 'hash':
      return lines.map((line) => `# ${line}`);
    case 'slash':
      return lines.map((line) => `// ${line}`);
    case 'block':
      return ['/*', ...lines.map((line) => ` * ${line}`), ' */'];
    case 'none':
    default:
      return lines;
  }
};

const toQuotedLiteral = (value: string): string => JSON.stringify(value);

const getHereDocDelimiter = (value: string): string => {
  const lines = new Set(value.split('\n'));
  let delimiter = 'PRIVATE_TOOLBOX_BANNER';
  let suffix = 1;

  while (lines.has(delimiter)) {
    delimiter = `PRIVATE_TOOLBOX_BANNER_${suffix}`;
    suffix += 1;
  }

  return delimiter;
};

const toCodeSnippet = (
  bannerOutput: string,
  outputMode: BannerOutputMode
): string => {
  const literal = toQuotedLiteral(bannerOutput);

  switch (outputMode) {
    case 'shell': {
      const delimiter = getHereDocDelimiter(bannerOutput);
      return `cat <<'${delimiter}'\n${bannerOutput}\n${delimiter}`;
    }
    case 'javascript':
      return `const banner = ${literal};\nconsole.log(banner);`;
    case 'python':
      return `banner = ${literal}\nprint(banner)`;
    case 'go':
      return [
        'package main',
        '',
        'import "fmt"',
        '',
        'func main() {',
        `\tbanner := ${literal}`,
        '\tfmt.Println(banner)',
        '}'
      ].join('\n');
    case 'java':
      return [
        'public class Banner {',
        '    public static void main(String[] args) {',
        `        String banner = ${literal};`,
        '        System.out.println(banner);',
        '    }',
        '}'
      ].join('\n');
    case 'text':
    default:
      return bannerOutput;
  }
};

const applyAnsiColor = (value: string, ansiColor: BannerAnsiColor): string => {
  if (ansiColor === 'none') return value;

  const code = ansiColorCodes[ansiColor];
  return `\u001b[${code}m${value}\u001b[0m`;
};

export const generateAsciiBanner = (
  input: BannerAsciiInput
): BannerAsciiOutput => {
  const text = normalizeText(input.text);
  const font = normalizeFont(input.font);
  const commentStyle = normalizeCommentStyle(input.commentStyle);
  const outputMode = normalizeOutputMode(input.outputMode);
  const ansiColor = normalizeAnsiColor(input.ansiColor);
  const horizontalSpacing = normalizeSpacing(input.horizontalSpacing);
  const fillCharacter = normalizeRenderCharacter(
    input.fillCharacter,
    font === 'modular' ? '*' : '#',
    'fillCharacter'
  );
  const emptyCharacter = normalizeRenderCharacter(
    input.emptyCharacter,
    ' ',
    'emptyCharacter'
  );
  const fallbackCharacters = new Set<string>();
  const renderedLines = text
    .split('\n')
    .flatMap((line, lineIndex) => [
      ...(lineIndex === 0 ? [] : ['']),
      ...renderLine(
        line,
        font,
        fillCharacter,
        emptyCharacter,
        horizontalSpacing,
        fallbackCharacters
      )
    ]);
  const bannerLines = applyCommentStyle(renderedLines, commentStyle);
  const bannerOutput = bannerLines.join('\n');
  const coloredBannerOutput = applyAnsiColor(bannerOutput, ansiColor);
  const output = toCodeSnippet(coloredBannerOutput, outputMode);
  const lines = output.split('\n');
  const width = Math.max(...bannerLines.map((line) => line.length), 0);

  return {
    output,
    lines,
    bannerOutput,
    bannerLines,
    width,
    height: bannerLines.length,
    font,
    commentStyle,
    outputMode,
    ansiColor,
    fallbackCharacters: Array.from(fallbackCharacters)
  };
};

export const bannerTools: ToolboxTool[] = [
  {
    name: 'banner.ascii',
    title: 'ASCII Banner',
    description: 'Generate terminal-friendly ASCII banners from text.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema,
    outputSchema,
    execute: (input) => {
      try {
        return ok(generateAsciiBanner(input as BannerAsciiInput) as JsonValue);
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
