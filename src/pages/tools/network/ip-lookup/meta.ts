import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('network', {
  path: 'ip-lookup',
  icon: 'mdi:map-marker-radius-outline',
  keywords: ['ip', 'lookup', 'geo', 'asn', 'ippure', 'network'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'network:ipLookup.title',
    description: 'network:ipLookup.description',
    shortDescription: 'network:ipLookup.shortDescription',
    longDescription: 'network:ipLookup.description',
    userTypes: ['developers']
  }
});
