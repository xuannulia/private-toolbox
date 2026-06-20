import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('json', {
  path: 'json-to-excel',
  icon: 'material-symbols:table-chart',
  keywords: ['json', 'excel', 'xlsx', 'spreadsheet', 'sheet'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'json:jsonToExcel.title',
    description: 'json:jsonToExcel.description',
    shortDescription: 'json:jsonToExcel.shortDescription',
    userTypes: ['developers']
  }
});
