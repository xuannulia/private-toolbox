import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('json', {
  path: 'yaml-to-json',
  icon: 'material-symbols:data-object',
  keywords: ['yaml', 'yml', 'json', 'convert', 'config'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'json:yamlToJson.title',
    description: 'json:yamlToJson.description',
    shortDescription: 'json:yamlToJson.shortDescription',
    userTypes: ['developers']
  }
});
