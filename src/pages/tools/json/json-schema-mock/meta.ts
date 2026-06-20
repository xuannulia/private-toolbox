import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('json', {
  path: 'json-schema-mock',
  icon: 'material-symbols:dataset',
  keywords: ['json', 'schema', 'mock', 'sample', 'generate'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'json:jsonSchemaMock.title',
    description: 'json:jsonSchemaMock.description',
    shortDescription: 'json:jsonSchemaMock.shortDescription',
    userTypes: ['developers']
  }
});
