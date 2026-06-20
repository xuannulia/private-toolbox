import { defineTool } from '@tools/defineTool';
import { lazy } from 'react';

export const tool = defineTool('image-generic', {
  i18n: {
    name: 'image:qrCodeDecode.title',
    description: 'image:qrCodeDecode.description',
    shortDescription: 'image:qrCodeDecode.shortDescription'
  },
  path: 'qr-code-decode',
  icon: 'mdi:qrcode-scan',
  keywords: ['qrcode', 'qr', 'decode', 'scan', 'reader', 'image'],
  component: lazy(() => import('./index'))
});
