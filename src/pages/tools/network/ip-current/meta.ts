import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('network', {
  path: 'current-ip',
  icon: 'mdi:ip-network-outline',
  keywords: ['ip', 'current', 'public', 'ippure', 'my ip'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'network:ipCurrent.title',
    description: 'network:ipCurrent.description',
    shortDescription: 'network:ipCurrent.shortDescription',
    longDescription: 'network:ipCurrent.description',
    userTypes: ['developers']
  }
});
