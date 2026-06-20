import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('number', {
  path: 'color-converter',
  icon: 'material-symbols:palette-outline',
  keywords: ['color', 'rgb', 'rgba', 'hex', 'convert'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'number:colorConverter.title',
    description: 'number:colorConverter.description',
    shortDescription: 'number:colorConverter.shortDescription',
    userTypes: ['developers', 'generalUsers']
  }
});
