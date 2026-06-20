import type { Options } from 'prettier';
import { format as prettierFormat } from 'prettier/standalone';
import * as babelPlugin from 'prettier/plugins/babel';
import * as estreePlugin from 'prettier/plugins/estree';
import * as htmlPlugin from 'prettier/plugins/html';
import * as postcssPlugin from 'prettier/plugins/postcss';
import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type CodeLanguage = 'html' | 'css' | 'javascript';

export type CodeFormatInput = {
  text: string;
  language: CodeLanguage;
  printWidth?: number;
  tabWidth?: number;
  useTabs?: boolean;
  singleQuote?: boolean;
};

export type CodeTextOutput = {
  language: CodeLanguage;
  text: string;
  changed: boolean;
};

export type CodeMinifyOutput = CodeTextOutput & {
  originalBytes: number;
  resultBytes: number;
  savedBytes: number;
  savedPercent: number;
};

const supportedLanguages: CodeLanguage[] = ['html', 'css', 'javascript'];

type PrettierPlugin = NonNullable<Options['plugins']>[number];

const asPrettierPlugin = (plugin: unknown): PrettierPlugin =>
  plugin as PrettierPlugin;

const languageConfig: Record<
  CodeLanguage,
  {
    parser: string;
    plugins: NonNullable<Options['plugins']>;
  }
> = {
  html: {
    parser: 'html',
    plugins: [asPrettierPlugin(htmlPlugin)]
  },
  css: {
    parser: 'css',
    plugins: [asPrettierPlugin(postcssPlugin)]
  },
  javascript: {
    parser: 'babel',
    plugins: [asPrettierPlugin(babelPlugin), asPrettierPlugin(estreePlugin)]
  }
};

const normalizeCodeText = (text: unknown): string => {
  if (typeof text !== 'string') {
    throw new ToolboxError('INVALID_CODE_INPUT', 'text must be a string');
  }

  if (!text.trim()) {
    throw new ToolboxError('INVALID_CODE_INPUT', 'text is required');
  }

  return text;
};

const normalizeLanguage = (language: unknown): CodeLanguage => {
  if (
    typeof language === 'string' &&
    supportedLanguages.includes(language as CodeLanguage)
  ) {
    return language as CodeLanguage;
  }

  throw new ToolboxError(
    'INVALID_CODE_LANGUAGE',
    `language must be one of: ${supportedLanguages.join(', ')}`
  );
};

const normalizeInteger = (
  value: unknown,
  fallback: number,
  min: number,
  max: number
): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.trunc(value)));
};

const byteLength = (text: string): number =>
  new TextEncoder().encode(text).length;

const roundPercent = (value: number): number => Math.round(value * 100) / 100;

const toCodeError = (error: unknown, language: CodeLanguage): ToolboxError => {
  if (error instanceof ToolboxError) return error;

  const message =
    error instanceof Error ? error.message : 'Code formatting failed';

  return new ToolboxError('INVALID_CODE', message, { language });
};

export const formatCode = async (
  input: CodeFormatInput
): Promise<CodeTextOutput> => {
  const text = normalizeCodeText(input.text);
  const language = normalizeLanguage(input.language);
  const config = languageConfig[language];

  try {
    const formatted = await prettierFormat(text, {
      parser: config.parser,
      plugins: config.plugins,
      printWidth: normalizeInteger(input.printWidth, 80, 40, 240),
      tabWidth: normalizeInteger(input.tabWidth, 2, 1, 8),
      useTabs: input.useTabs === true,
      singleQuote: input.singleQuote === true
    });

    return {
      language,
      text: formatted,
      changed: formatted !== text
    };
  } catch (error) {
    throw toCodeError(error, language);
  }
};

const removeHtmlComments = (text: string): string =>
  text.replace(/<!--(?!\[if\b)[\s\S]*?-->/gi, '');

const minifyHtml = async (text: string): Promise<string> => {
  await formatCode({ text, language: 'html' });

  return removeHtmlComments(text).replace(/>\s+</g, '><').trim();
};

const removeCssComments = (text: string): string => {
  let result = '';
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quote) {
      result += char;

      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }

      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      result += char;
      continue;
    }

    if (char === '/' && next === '*') {
      const end = text.indexOf('*/', index + 2);
      index = end === -1 ? text.length : end + 1;
      continue;
    }

    result += char;
  }

  return result;
};

const cssIdentifierPattern = /[a-zA-Z0-9_$#%.-]/;
const cssTightPunctuation = new Set([
  '{',
  '}',
  ':',
  ';',
  ',',
  '>',
  '+',
  '~',
  '(',
  ')',
  '[',
  ']',
  '='
]);

const shouldKeepCssSpace = (
  previous: string | undefined,
  next: string
): boolean =>
  Boolean(
    previous &&
      cssIdentifierPattern.test(previous) &&
      cssIdentifierPattern.test(next)
  );

const compactCssWhitespace = (text: string): string => {
  let result = '';
  let quote: '"' | "'" | null = null;
  let escaped = false;
  let pendingSpace = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (quote) {
      result += char;

      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }

      continue;
    }

    if (char === '"' || char === "'") {
      if (pendingSpace && shouldKeepCssSpace(result.at(-1), char)) {
        result += ' ';
      }
      pendingSpace = false;
      quote = char;
      result += char;
      continue;
    }

    if (/\s/.test(char)) {
      pendingSpace = true;
      continue;
    }

    if (cssTightPunctuation.has(char)) {
      result = result.trimEnd();
      result += char;
      pendingSpace = false;
      continue;
    }

    if (pendingSpace && shouldKeepCssSpace(result.at(-1), char)) {
      result += ' ';
    }

    pendingSpace = false;
    result += char;
  }

  return result.replace(/;}/g, '}').trim();
};

const minifyCss = async (text: string): Promise<string> => {
  await formatCode({ text, language: 'css' });

  return compactCssWhitespace(removeCssComments(text));
};

const minifyJavaScript = async (text: string): Promise<string> => {
  const { minify } = await import('terser');
  const result = await minify(text, {
    compress: false,
    mangle: false,
    module: false,
    parse: {
      bare_returns: true
    },
    format: {
      comments: false,
      beautify: false
    },
    ecma: 2022
  });

  if (!result.code) {
    throw new ToolboxError(
      'INVALID_CODE',
      'JavaScript minify produced no code'
    );
  }

  return result.code;
};

export const minifyCode = async (
  input: CodeFormatInput
): Promise<CodeMinifyOutput> => {
  const text = normalizeCodeText(input.text);
  const language = normalizeLanguage(input.language);

  try {
    const minified =
      language === 'html'
        ? await minifyHtml(text)
        : language === 'css'
          ? await minifyCss(text)
          : await minifyJavaScript(text);
    const originalBytes = byteLength(text);
    const resultBytes = byteLength(minified);
    const savedBytes = originalBytes - resultBytes;

    return {
      language,
      text: minified,
      changed: minified !== text,
      originalBytes,
      resultBytes,
      savedBytes,
      savedPercent:
        originalBytes === 0
          ? 0
          : roundPercent((savedBytes / originalBytes) * 100)
    };
  } catch (error) {
    throw toCodeError(error, language);
  }
};

const codeLanguageSchema = {
  type: 'string',
  enum: supportedLanguages
};

const codeTextOutputSchema = {
  type: 'object',
  required: ['language', 'text', 'changed'],
  additionalProperties: false,
  properties: {
    language: codeLanguageSchema,
    text: { type: 'string' },
    changed: { type: 'boolean' }
  }
};

export const codeTools: ToolboxTool[] = [
  {
    name: 'code.format',
    title: 'Format code',
    description: 'Format HTML, CSS, or JavaScript snippets.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text', 'language'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        language: codeLanguageSchema,
        printWidth: { type: 'number', default: 80 },
        tabWidth: { type: 'number', default: 2 },
        useTabs: { type: 'boolean', default: false },
        singleQuote: { type: 'boolean', default: false }
      }
    },
    outputSchema: codeTextOutputSchema,
    execute: async (input) => {
      try {
        return ok(await formatCode(input as CodeFormatInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'code.minify',
    title: 'Minify code',
    description: 'Minify HTML, CSS, or JavaScript snippets.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text', 'language'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        language: codeLanguageSchema
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'language',
        'text',
        'changed',
        'originalBytes',
        'resultBytes',
        'savedBytes',
        'savedPercent'
      ],
      additionalProperties: false,
      properties: {
        ...codeTextOutputSchema.properties,
        originalBytes: { type: 'number' },
        resultBytes: { type: 'number' },
        savedBytes: { type: 'number' },
        savedPercent: { type: 'number' }
      }
    },
    execute: async (input) => {
      try {
        return ok(await minifyCode(input as CodeFormatInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
