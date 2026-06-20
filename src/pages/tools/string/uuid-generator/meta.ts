import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('string', {
  path: 'uuid-generator',
  icon: 'material-symbols:fingerprint',
  keywords: ['uuid', 'guid', 'random', 'identifier'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'string:uuidGenerator.title',
    description: 'string:uuidGenerator.description',
    shortDescription: 'string:uuidGenerator.shortDescription'
  }
});
