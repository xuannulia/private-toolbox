import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('network', {
  path: 'dns-lookup',
  icon: 'mdi:dns-outline',
  keywords: ['dns', 'nslookup', 'a', 'aaaa', 'mx', 'txt', 'cname', 'records'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'network:dns.title',
    description: 'network:dns.description',
    shortDescription: 'network:dns.shortDescription',
    longDescription: 'network:dns.description',
    userTypes: ['developers']
  }
});
