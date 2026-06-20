import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('json', {
  path: 'prettify',
  icon: 'material-symbols:code',

  keywords: [
    'json',
    'json formatter',
    'json format',
    'json格式化',
    'json 格式化',
    'prettify',
    'format',
    'formatter',
    'beautify',
    '格式化',
    '美化'
  ],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'json:prettify.title',
    description: 'json:prettify.description',
    shortDescription: 'json:prettify.shortDescription'
  }
});
