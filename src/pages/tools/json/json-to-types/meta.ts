import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('json', {
  path: 'json-to-types',
  icon: 'material-symbols:deployed-code-outline',
  keywords: [
    'json',
    'typescript',
    'interface',
    'java',
    'go',
    'csharp',
    'class',
    'entity',
    'model'
  ],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'json:jsonToTypes.title',
    description: 'json:jsonToTypes.description',
    shortDescription: 'json:jsonToTypes.shortDescription',
    userTypes: ['developers']
  }
});
