import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('string', {
  path: 'rsa-crypto',
  icon: 'material-symbols:lock',
  keywords: ['rsa', 'encrypt', 'decrypt', 'sign', 'verify', 'signature'],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'string:rsaCrypto.title',
    description: 'string:rsaCrypto.description',
    shortDescription: 'string:rsaCrypto.shortDescription',
    userTypes: ['developers']
  }
});
