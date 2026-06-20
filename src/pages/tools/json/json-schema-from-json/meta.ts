import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('json', {
  path: 'json-schema-from-json',
  icon: 'material-symbols:data-object',
  keywords: ['json', 'schema', 'generate', 'infer'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'json:jsonSchemaFromJson.title',
    description: 'json:jsonSchemaFromJson.description',
    shortDescription: 'json:jsonSchemaFromJson.shortDescription'
  }
});
