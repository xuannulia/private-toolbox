import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('image-generic', {
  path: 'barcode',
  icon: 'mdi:barcode',
  keywords: ['barcode', 'code128', 'code 128', 'svg', 'label'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'image:barcode.title',
    description: 'image:barcode.description',
    shortDescription: 'image:barcode.shortDescription',
    userTypes: ['developers']
  }
});
