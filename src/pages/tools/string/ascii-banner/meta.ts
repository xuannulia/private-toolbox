import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('string', {
  path: 'ascii-banner',
  icon: 'material-symbols:text-fields',
  keywords: ['ascii', 'banner', 'figlet', 'console', 'terminal', 'chinese'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'string:asciiBanner.title',
    description: 'string:asciiBanner.description',
    shortDescription: 'string:asciiBanner.shortDescription'
  }
});
