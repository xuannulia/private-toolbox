import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('ops', {
  path: 'docker-compose',
  icon: 'mdi:docker',
  keywords: ['docker', 'compose', 'yaml', 'format', 'validate', 'ops'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'ops:dockerCompose.title',
    description: 'ops:dockerCompose.description',
    shortDescription: 'ops:dockerCompose.shortDescription'
  }
});
