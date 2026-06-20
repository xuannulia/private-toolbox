import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('xml', {
  path: 'xml-minifier',
  icon: 'material-symbols:compress',
  keywords: ['xml', 'minify', 'compress', 'code'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'xml:xmlMinifier.title',
    description: 'xml:xmlMinifier.description',
    shortDescription: 'xml:xmlMinifier.shortDescription'
  }
});
