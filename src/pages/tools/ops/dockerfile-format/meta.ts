import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('ops', {
  path: 'dockerfile-format',
  icon: 'mdi:docker',
  keywords: ['dockerfile', 'docker', 'format', 'validate', 'container', 'ops'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'ops:dockerfileFormat.title',
    description: 'ops:dockerfileFormat.description',
    shortDescription: 'ops:dockerfileFormat.shortDescription',
    userTypes: ['developers']
  }
});
