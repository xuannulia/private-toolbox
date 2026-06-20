import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('network', {
  path: 'cidr-calculator',
  icon: 'material-symbols:lan-outline',
  keywords: ['cidr', 'subnet', 'mask', 'ipv4', 'network'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'network:cidrCalculator.title',
    description: 'network:cidrCalculator.description',
    shortDescription: 'network:cidrCalculator.shortDescription',
    userTypes: ['developers']
  }
});
