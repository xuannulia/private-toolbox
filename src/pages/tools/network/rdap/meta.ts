import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('network', {
  path: 'rdap-lookup',
  icon: 'mdi:card-search-outline',
  keywords: ['rdap', 'whois', 'domain', 'ip', 'registration', 'lookup'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'network:rdap.title',
    description: 'network:rdap.description',
    shortDescription: 'network:rdap.shortDescription',
    longDescription: 'network:rdap.description',
    userTypes: ['developers']
  }
});
