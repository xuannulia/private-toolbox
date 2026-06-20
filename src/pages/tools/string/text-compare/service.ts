import { diffText } from '@private-toolbox/core';
import { level } from './types';
import { escapeHtml } from 'utils/string';

export function compareTextsHtml(
  textA: string,
  textB: string,
  level: level
): string {
  const diff = diffText({
    left: textA,
    right: textB,
    level
  });

  const html = diff.parts
    .map((part) => {
      const val = escapeHtml(part.value).replace(/\n/g, '<br>');
      if (part.type === 'added') {
        return `<span class="diff-added">${val}</span>`;
      }
      if (part.type === 'removed') {
        return `<span class="diff-removed">${val}</span>`;
      }
      return val;
    })
    .join('');

  return `<div class="diff-line">${html}</div>`;
}
