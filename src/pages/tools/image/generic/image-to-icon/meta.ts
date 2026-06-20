import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('image-generic', {
  i18n: {
    name: 'image:imageToIcon.title',
    description: 'image:imageToIcon.description',
    shortDescription: 'image:imageToIcon.shortDescription'
  },
  path: 'image-to-icon',
  icon: 'mdi:image-filter-center-focus-strong-outline',
  keywords: ['image', 'icon', 'ico', 'favicon', 'app icon'],
  component: lazy(() => import('./index'))
});
