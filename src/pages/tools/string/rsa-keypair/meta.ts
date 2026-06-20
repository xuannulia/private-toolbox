import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('string', {
  path: 'rsa-keypair',
  icon: 'material-symbols:enhanced-encryption',
  keywords: ['rsa', 'keypair', 'pem', 'public key', 'private key'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'string:rsaKeyPair.title',
    description: 'string:rsaKeyPair.description',
    shortDescription: 'string:rsaKeyPair.shortDescription'
  }
});
