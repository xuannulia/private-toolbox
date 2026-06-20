import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('string', {
  path: 'hex',
  icon: 'mdi:hexadecimal',
  keywords: ['hex', 'hexadecimal', 'encode', 'decode', 'utf8', 'bytes'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'string:hex.title',
    description: 'string:hex.description',
    shortDescription: 'string:hex.shortDescription',
    userTypes: ['developers']
  }
});
