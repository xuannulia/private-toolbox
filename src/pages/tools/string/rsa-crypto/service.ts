import {
  decryptRsa,
  encryptRsa,
  signRsa,
  verifyRsa,
  type RsaDataEncoding,
  type RsaHashAlgorithm
} from '@private-toolbox/core';

export type RsaCryptoOperation = 'encrypt' | 'decrypt' | 'sign' | 'verify';

export type RsaCryptoInput = {
  operation: RsaCryptoOperation;
  keyPem: string;
  text: string;
  signatureBase64?: string;
  hash: RsaHashAlgorithm;
  inputEncoding: RsaDataEncoding;
  outputEncoding: RsaDataEncoding;
};

export const rsaCryptoOperations: RsaCryptoOperation[] = [
  'encrypt',
  'decrypt',
  'sign',
  'verify'
];

export const rsaCryptoHashes: RsaHashAlgorithm[] = [
  'SHA-256',
  'SHA-384',
  'SHA-512'
];

export const rsaCryptoEncodings: RsaDataEncoding[] = ['utf8', 'base64'];

export const runRsaCryptoTool = async ({
  operation,
  keyPem,
  text,
  signatureBase64,
  hash,
  inputEncoding,
  outputEncoding
}: RsaCryptoInput): Promise<string> => {
  switch (operation) {
    case 'encrypt':
      return JSON.stringify(
        await encryptRsa({
          publicKeyPem: keyPem,
          text,
          hash,
          inputEncoding
        }),
        null,
        2
      );
    case 'decrypt':
      return JSON.stringify(
        await decryptRsa({
          privateKeyPem: keyPem,
          ciphertextBase64: text,
          hash,
          outputEncoding
        }),
        null,
        2
      );
    case 'sign':
      return JSON.stringify(
        await signRsa({
          privateKeyPem: keyPem,
          text,
          hash,
          inputEncoding
        }),
        null,
        2
      );
    case 'verify':
      return JSON.stringify(
        await verifyRsa({
          publicKeyPem: keyPem,
          text,
          signatureBase64: signatureBase64 ?? '',
          hash,
          inputEncoding
        }),
        null,
        2
      );
  }
};
