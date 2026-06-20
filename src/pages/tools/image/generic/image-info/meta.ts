import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('image-generic', {
  i18n: {
    name: 'image:imageInfo.title',
    description: 'image:imageInfo.description',
    shortDescription: 'image:imageInfo.shortDescription'
  },
  path: 'image-info',
  icon: 'mdi:image-search-outline',
  keywords: ['image', 'info', 'metadata', 'dimensions', 'size'],
  component: lazy(() => import('./index'))
});
