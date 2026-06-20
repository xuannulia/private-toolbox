import { analyzeHiddenChars } from '@private-toolbox/core';
import { InitialValuesType, AnalysisResult } from './types';

export type HiddenCharacterReportLabels = {
  category: string;
  foundChars: (count: number) => string;
  invisibleChar: string;
  noHiddenChars: string;
  position: string;
  rtlOverride: string;
  rtlWarning: string;
  truncated: string;
  unicode: string;
  zeroWidthChar: string;
};

const defaultReportLabels: HiddenCharacterReportLabels = {
  category: 'Category',
  foundChars: (count) => `Found ${count} hidden character(s):`,
  invisibleChar: 'Invisible Character',
  noHiddenChars: 'No hidden characters detected in the text.',
  position: 'Position',
  rtlOverride: 'RTL Override Character',
  rtlWarning:
    'WARNING: RTL Override characters detected! This could be used in attacks.',
  truncated:
    'Result truncated. Increase the maximum result size in core usage.',
  unicode: 'Unicode',
  zeroWidthChar: 'Zero Width Character'
};

export function analyzeHiddenCharacters(
  text: string,
  options: InitialValuesType
): AnalysisResult {
  return analyzeHiddenChars({
    text,
    includeRtl: options.highlightRTL,
    includeInvisible: options.showInvisibleChars,
    includeZeroWidth: options.includeZeroWidthChars,
    includeControls: options.showInvisibleChars,
    maxItems: 10_000
  });
}

export function formatHiddenCharacterReport(
  result: AnalysisResult,
  options: InitialValuesType,
  labels: HiddenCharacterReportLabels = defaultReportLabels
): string {
  if (result.totalHiddenChars === 0) {
    return labels.noHiddenChars;
  }

  let output = `${labels.foundChars(result.totalHiddenChars)}\n\n`;

  result.hiddenCharacters.forEach((char) => {
    output += `${labels.position} ${char.position}: ${char.name} (${char.unicode})\n`;
    if (options.showUnicodeCodes) {
      output += `  ${labels.unicode}: ${char.unicode}\n`;
    }
    output += `  ${labels.category}: ${char.category}\n`;
    if (char.isRTL) output += `  ⚠️  ${labels.rtlOverride}\n`;
    if (char.isInvisible) output += `  👁️  ${labels.invisibleChar}\n`;
    if (char.isZeroWidth) output += `  📏  ${labels.zeroWidthChar}\n`;
    output += '\n';
  });

  if (result.truncated) {
    output += `${labels.truncated}\n`;
  }

  if (result.hasRTLOverride) {
    output += `⚠️  ${labels.rtlWarning}\n`;
  }

  return output;
}

export function main(input: string, options: InitialValuesType): string {
  return formatHiddenCharacterReport(
    analyzeHiddenCharacters(input, options),
    options
  );
}
