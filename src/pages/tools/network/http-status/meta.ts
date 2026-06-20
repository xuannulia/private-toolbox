import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('network', {
  path: 'http-status',
  icon: 'mdi:web-check',
  keywords: ['http', 'status', 'headers', 'redirect', 'url'],
  i18n: {
    name: 'network:httpStatus.title',
    description: 'network:httpStatus.description',
    shortDescription: 'network:httpStatus.shortDescription'
  },
  component: lazy(() => import('./index'))
});
