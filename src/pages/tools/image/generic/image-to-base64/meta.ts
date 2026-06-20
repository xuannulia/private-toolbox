import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('image-generic', {
  i18n: {
    name: 'image:imageToBase64.title',
    description: 'image:imageToBase64.description',
    shortDescription: 'image:imageToBase64.shortDescription'
  },
  path: 'image-to-base64',
  icon: 'mdi:file-image-outline',
  keywords: ['image', 'base64', 'data url', 'data uri', 'encode'],
  component: lazy(() => import('./index'))
});
