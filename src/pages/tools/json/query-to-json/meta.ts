import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('json', {
  path: 'query-to-json',
  icon: 'material-symbols:link',
  keywords: ['query', 'url', 'get', 'params', 'json', 'search'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'json:queryToJson.title',
    description: 'json:queryToJson.description',
    shortDescription: 'json:queryToJson.shortDescription',
    userTypes: ['developers']
  }
});
