import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('number', {
  path: 'base-converter',
  icon: 'material-symbols:conversion-path',
  keywords: ['base', 'radix', 'binary', 'decimal', 'hex', 'octal'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'number:baseConverter.title',
    description: 'number:baseConverter.description',
    shortDescription: 'number:baseConverter.shortDescription',
    userTypes: ['developers']
  }
});
