import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('string', {
  path: 'symmetric-crypto',
  icon: 'material-symbols:enhanced-encryption',
  keywords: [
    'aes',
    'des',
    '3des',
    'tripledes',
    'rc4',
    'rabbit',
    'encrypt',
    'decrypt',
    'crypto',
    'cipher'
  ],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'string:symmetricCrypto.title',
    description: 'string:symmetricCrypto.description',
    shortDescription: 'string:symmetricCrypto.shortDescription',
    userTypes: ['developers']
  }
});
