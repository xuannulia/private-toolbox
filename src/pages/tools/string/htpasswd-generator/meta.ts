import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('string', {
  path: 'htpasswd-generator',
  icon: 'material-symbols:admin-panel-settings',
  keywords: ['htpasswd', 'basic auth', 'apache', 'nginx', 'apr1', 'sha1'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'string:htpasswdGenerator.title',
    description: 'string:htpasswdGenerator.description',
    shortDescription: 'string:htpasswdGenerator.shortDescription',
    userTypes: ['developers']
  }
});
