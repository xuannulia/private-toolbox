import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('ops', {
  path: 'docker-commands',
  icon: 'mdi:docker',
  keywords: [
    'docker',
    'commands',
    'cheatsheet',
    'container',
    'image',
    'compose',
    'logs'
  ],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'ops:dockerCommands.title',
    description: 'ops:dockerCommands.description',
    shortDescription: 'ops:dockerCommands.shortDescription',
    userTypes: ['developers']
  }
});
