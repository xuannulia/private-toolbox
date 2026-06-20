import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('ops', {
  path: 'nginx-format',
  icon: 'simple-icons:nginx',
  keywords: ['nginx', 'config', 'format', 'validate', 'location', 'ops'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'ops:nginxFormat.title',
    description: 'ops:nginxFormat.description',
    shortDescription: 'ops:nginxFormat.shortDescription'
  }
});
