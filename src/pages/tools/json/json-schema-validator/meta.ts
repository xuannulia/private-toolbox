import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('json', {
  path: 'json-schema-validator',
  icon: 'material-symbols:rule-settings',
  keywords: ['json', 'schema', 'validate', 'ajv'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'json:jsonSchemaValidator.title',
    description: 'json:jsonSchemaValidator.description',
    shortDescription: 'json:jsonSchemaValidator.shortDescription'
  }
});
