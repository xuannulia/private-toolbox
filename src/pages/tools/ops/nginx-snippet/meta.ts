import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('ops', {
  path: 'nginx-snippet',
  icon: 'simple-icons:nginx',
  keywords: ['nginx', 'snippet', 'proxy', 'static', 'spa', 'redirect', 'ops'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'ops:nginxSnippet.title',
    description: 'ops:nginxSnippet.description',
    shortDescription: 'ops:nginxSnippet.shortDescription'
  }
});
