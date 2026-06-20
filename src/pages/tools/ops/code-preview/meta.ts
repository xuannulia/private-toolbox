import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('ops', {
  path: 'code-preview',
  icon: 'mdi:application-brackets-outline',
  keywords: [
    'html',
    'css',
    'javascript',
    'js',
    'preview',
    'snippet',
    'sandbox'
  ],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'ops:codePreview.title',
    description: 'ops:codePreview.description',
    shortDescription: 'ops:codePreview.shortDescription',
    userTypes: ['developers']
  }
});
