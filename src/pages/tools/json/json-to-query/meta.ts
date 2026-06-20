import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('json', {
  path: 'json-to-query',
  icon: 'material-symbols:link',
  keywords: ['json', 'query', 'url', 'get', 'params', 'search'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'json:jsonToQuery.title',
    description: 'json:jsonToQuery.description',
    shortDescription: 'json:jsonToQuery.shortDescription',
    userTypes: ['developers']
  }
});
