import {
  type CodeFormatInput,
  type CodeLanguage,
  formatCode,
  minifyCode
} from '@private-toolbox/core';

export type CodeOperation = 'format' | 'minify';

export type CodeToolInput = CodeFormatInput & {
  operation: CodeOperation;
};

export const codeExtensions: Record<CodeLanguage, string> = {
  html: 'html',
  css: 'css',
  javascript: 'js'
};

export const monacoLanguages: Record<CodeLanguage, string> = {
  html: 'html',
  css: 'css',
  javascript: 'javascript'
};

export const runCodeTool = async ({
  operation,
  ...input
}: CodeToolInput): Promise<{
  text: string;
  summary: string;
}> => {
  if (operation === 'format') {
    const result = await formatCode(input);

    return {
      text: result.text,
      summary: JSON.stringify(
        {
          language: result.language,
          changed: result.changed
        },
        null,
        2
      )
    };
  }

  const result = await minifyCode(input);

  return {
    text: result.text,
    summary: JSON.stringify(
      {
        language: result.language,
        changed: result.changed,
        originalBytes: result.originalBytes,
        resultBytes: result.resultBytes,
        savedBytes: result.savedBytes,
        savedPercent: result.savedPercent
      },
      null,
      2
    )
  };
};
