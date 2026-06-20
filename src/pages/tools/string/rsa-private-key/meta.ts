import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('string', {
  path: 'rsa-private-key',
  icon: 'material-symbols:key-vertical',
  keywords: ['rsa', 'private key', 'public key', 'pem', 'pkcs1', 'pkcs8'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'string:rsaPrivateKey.title',
    description: 'string:rsaPrivateKey.description',
    shortDescription: 'string:rsaPrivateKey.shortDescription',
    userTypes: ['developers']
  }
});
