import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('string', {
  path: 'jwt-inspector',
  icon: 'material-symbols:encrypted',
  keywords: ['jwt', 'token', 'bearer', 'decode', 'inspect'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'string:jwtInspector.title',
    description: 'string:jwtInspector.description',
    shortDescription: 'string:jwtInspector.shortDescription'
  }
});
