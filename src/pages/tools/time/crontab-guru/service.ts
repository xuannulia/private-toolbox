import { parseCronExpression, validateCronExpression } from '@private-toolbox/core';

const LANG: Record<string, string> = {
  fr: 'fr',
  en: 'en',
  es: 'es',
  de: 'de',
  ja: 'ja',
  zh: 'zh_CN',
  pt: 'pt_PT',
  nl: 'nl',
  ru: 'ru'
};

const getLanguage = (): string => {
  const lang = localStorage.getItem('lang') || 'en';
  return LANG[lang] || 'en';
};

export function explainCrontab(expr: string): string {
  const result = parseCronExpression({
    expression: expr,
    locale: getLanguage()
  });

  if (!result.valid || result.description === null) {
    throw new Error(result.error ?? 'Invalid crontab expression');
  }

  return result.description;
}

export function validateCrontab(expr: string): boolean {
  return validateCronExpression({ expression: expr }).valid;
}

export function main(input: string): string {
  if (!input?.trim()) return '';

  return input
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (!validateCrontab(trimmed))
        return `Invalid crontab expression: "${trimmed}"`;
      return explainCrontab(trimmed);
    })
    .join('\n');
}
