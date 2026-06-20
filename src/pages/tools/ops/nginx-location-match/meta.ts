import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('ops', {
  path: 'nginx-location-match',
  icon: 'simple-icons:nginx',
  keywords: ['nginx', 'location', 'match', 'rewrite', 'proxy', 'ops'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'ops:nginxLocationMatch.title',
    description: 'ops:nginxLocationMatch.description',
    shortDescription: 'ops:nginxLocationMatch.shortDescription'
  }
});
