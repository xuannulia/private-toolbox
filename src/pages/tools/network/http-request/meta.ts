import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('network', {
  path: 'http-request',
  icon: 'mdi:web-sync',
  keywords: ['http', 'request', 'api', 'status', 'headers'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'network:httpRequest.title',
    description: 'network:httpRequest.description',
    shortDescription: 'network:httpRequest.shortDescription'
  }
});
