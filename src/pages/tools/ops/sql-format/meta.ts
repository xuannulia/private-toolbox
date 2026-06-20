import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('ops', {
  path: 'sql-format',
  icon: 'mdi:database-search-outline',
  keywords: [
    'sql',
    'format',
    'minify',
    'mysql',
    'postgresql',
    'sqlite',
    'database'
  ],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'ops:sqlFormat.title',
    description: 'ops:sqlFormat.description',
    shortDescription: 'ops:sqlFormat.shortDescription',
    userTypes: ['developers']
  }
});
