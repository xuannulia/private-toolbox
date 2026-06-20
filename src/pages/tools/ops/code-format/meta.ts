import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('ops', {
  path: 'code-format',
  icon: 'mdi:code-tags',
  keywords: ['html', 'css', 'javascript', 'js', 'format', 'minify', 'code'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'ops:codeFormat.title',
    description: 'ops:codeFormat.description',
    shortDescription: 'ops:codeFormat.shortDescription',
    userTypes: ['developers']
  }
});
