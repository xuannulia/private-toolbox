import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('json', {
  path: 'json-to-yaml',
  icon: 'material-symbols:data-object',
  keywords: ['json', 'yaml', 'yml', 'convert', 'config'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'json:jsonToYaml.title',
    description: 'json:jsonToYaml.description',
    shortDescription: 'json:jsonToYaml.shortDescription',
    userTypes: ['developers']
  }
});
