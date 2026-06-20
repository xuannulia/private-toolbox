import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('string', {
  path: 'hash',
  icon: 'material-symbols:fingerprint',
  keywords: ['hash', 'md5', 'sha1', 'sha256', 'sha512', 'digest'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'string:textHash.title',
    description: 'string:textHash.description',
    shortDescription: 'string:textHash.shortDescription',
    userTypes: ['developers']
  }
});
