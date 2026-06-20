import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('string', {
  path: 'pem-inspector',
  icon: 'mdi:certificate-outline',
  keywords: [
    'pem',
    'x509',
    'certificate',
    'csr',
    'public key',
    'private key',
    'openssl'
  ],
  component: lazy(() => import('./index')),
  i18n: {
    name: 'string:pemInspector.title',
    description: 'string:pemInspector.description',
    shortDescription: 'string:pemInspector.shortDescription',
    userTypes: ['developers']
  }
});
