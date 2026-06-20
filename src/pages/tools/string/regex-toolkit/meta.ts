import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('string', {
  path: 'regex-toolkit',
  icon: 'material-symbols:regular-expression',
  keywords: ['regex', 'regexp', 'regular expression', 'test', 'replace'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'string:regexToolkit.title',
    description: 'string:regexToolkit.description',
    shortDescription: 'string:regexToolkit.shortDescription'
  }
});
