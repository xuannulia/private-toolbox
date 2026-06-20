import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('xml', {
  path: 'xpath-evaluator',
  icon: 'mdi:xml',
  keywords: ['xml', 'xpath', 'query', 'evaluate', 'namespace'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'xml:xpathEvaluator.title',
    description: 'xml:xpathEvaluator.description',
    shortDescription: 'xml:xpathEvaluator.shortDescription',
    userTypes: ['developers']
  }
});
