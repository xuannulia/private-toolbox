import {
  extractRsaPublicKey,
  inspectRsaPrivateKey,
  type RsaExtractPublicKeyOutput,
  type RsaPrivateKeyInfo
} from '@private-toolbox/core';

export type RsaPrivateKeyInspectorOptions = {
  privateKeyPem: string;
};

export const inspectRsaPrivateKeyForTool = ({
  privateKeyPem
}: RsaPrivateKeyInspectorOptions): RsaPrivateKeyInfo | null => {
  if (!privateKeyPem.trim()) return null;
  return inspectRsaPrivateKey({ privateKeyPem });
};

export const extractRsaPublicKeyForTool = ({
  privateKeyPem
}: RsaPrivateKeyInspectorOptions): RsaExtractPublicKeyOutput | null => {
  if (!privateKeyPem.trim()) return null;
  return extractRsaPublicKey({ privateKeyPem });
};

export const createRsaPrivateKeyInfoText = (
  options: RsaPrivateKeyInspectorOptions
): string => {
  const result = inspectRsaPrivateKeyForTool(options);
  return result ? JSON.stringify(result, null, 2) : '';
};

export const createExtractedPublicKeyText = (
  options: RsaPrivateKeyInspectorOptions
): string => extractRsaPublicKeyForTool(options)?.publicKeyPem ?? '';
