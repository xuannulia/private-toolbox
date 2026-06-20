import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('network', {
  path: 'ssl-inspect',
  icon: 'mdi:certificate-outline',
  keywords: ['ssl', 'tls', 'certificate', 'https', 'expiry', 'inspect'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'network:ssl.title',
    description: 'network:ssl.description',
    shortDescription: 'network:ssl.shortDescription',
    longDescription: 'network:ssl.description',
    userTypes: ['developers']
  }
});
