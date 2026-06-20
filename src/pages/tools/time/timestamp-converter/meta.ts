import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('time', {
  path: 'timestamp-converter',
  icon: 'material-symbols:timer',
  keywords: [
    'timestamp',
    'unix',
    'epoch',
    'date',
    'time',
    'milliseconds',
    'seconds',
    'iso8601'
  ],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'time:timestampConverter.title',
    description: 'time:timestampConverter.description',
    shortDescription: 'time:timestampConverter.shortDescription',
    userTypes: ['developers']
  }
});
