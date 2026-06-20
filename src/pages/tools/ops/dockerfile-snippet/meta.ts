import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('ops', {
  path: 'dockerfile-snippet',
  icon: 'mdi:docker',
  keywords: [
    'dockerfile',
    'docker',
    'snippet',
    'node',
    'python',
    'go',
    'nginx',
    'container'
  ],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'ops:dockerfileSnippet.title',
    description: 'ops:dockerfileSnippet.description',
    shortDescription: 'ops:dockerfileSnippet.shortDescription',
    userTypes: ['developers']
  }
});
