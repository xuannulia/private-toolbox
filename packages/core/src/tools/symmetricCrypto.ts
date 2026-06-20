import CryptoJS from 'crypto-js';
import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type SymmetricCryptoAlgorithm =
  | 'AES'
  | 'DES'
  | 'TripleDES'
  | 'RC4'
  | 'Rabbit';
export type SymmetricCryptoOperation = 'encrypt' | 'decrypt';
export type SymmetricCryptoEncoding = 'base64' | 'hex';

export type SymmetricCryptoInput = {
  text: string;
  key?: string;
  algorithm?: SymmetricCryptoAlgorithm;
  operation?: SymmetricCryptoOperation;
  inputEncoding?: SymmetricCryptoEncoding;
  outputEncoding?: SymmetricCryptoEncoding;
};

export type SymmetricCryptoOutput = {
  algorithm: SymmetricCryptoAlgorithm;
  operation: SymmetricCryptoOperation;
  encoding: SymmetricCryptoEncoding;
  text: string;
};

const algorithms: SymmetricCryptoAlgorithm[] = [
  'AES',
  'DES',
  'TripleDES',
  'RC4',
  'Rabbit'
];
const operations: SymmetricCryptoOperation[] = ['encrypt', 'decrypt'];
const encodings: SymmetricCryptoEncoding[] = ['base64', 'hex'];

const algorithmMap: Record<
  SymmetricCryptoAlgorithm,
  {
    encrypt: (message: string, key: string) => CryptoJS.lib.CipherParams;
    decrypt: (ciphertext: string, key: string) => CryptoJS.lib.WordArray;
  }
> = {
  AES: CryptoJS.AES,
  DES: CryptoJS.DES,
  TripleDES: CryptoJS.TripleDES,
  RC4: CryptoJS.RC4,
  Rabbit: CryptoJS.Rabbit
};

const normalizeAlgorithm = (
  value?: SymmetricCryptoAlgorithm
): SymmetricCryptoAlgorithm => {
  if (!value) return 'AES';
  if (algorithms.includes(value)) return value;

  throw new ToolboxError(
    'CRYPTO_INVALID_ALGORITHM',
    `Unsupported algorithm: ${value}`
  );
};

const normalizeOperation = (
  value?: SymmetricCryptoOperation
): SymmetricCryptoOperation => {
  if (!value) return 'encrypt';
  if (operations.includes(value)) return value;

  throw new ToolboxError(
    'CRYPTO_INVALID_OPERATION',
    `Unsupported operation: ${value}`
  );
};

const normalizeEncoding = (
  value: SymmetricCryptoEncoding | undefined,
  fallback: SymmetricCryptoEncoding
): SymmetricCryptoEncoding => {
  if (!value) return fallback;
  if (encodings.includes(value)) return value;

  throw new ToolboxError(
    'CRYPTO_INVALID_ENCODING',
    `Unsupported encoding: ${value}`
  );
};

const requireText = (text: unknown): string => {
  if (typeof text !== 'string') {
    throw new ToolboxError('CRYPTO_INVALID_TEXT', 'text must be a string');
  }

  if (!text.length) {
    throw new ToolboxError('CRYPTO_TEXT_REQUIRED', 'text is required');
  }

  return text;
};

const hexToBase64 = (value: string): string => {
  const normalized = value.replace(/\s+/g, '');
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(normalized)) {
    throw new ToolboxError('CRYPTO_INVALID_HEX', 'Invalid hex ciphertext');
  }

  return CryptoJS.enc.Hex.parse(normalized).toString(CryptoJS.enc.Base64);
};

const base64ToHex = (value: string): string =>
  CryptoJS.enc.Base64.parse(value).toString(CryptoJS.enc.Hex);

export const runSymmetricCrypto = (
  input: SymmetricCryptoInput
): SymmetricCryptoOutput => {
  const text = requireText(input.text);
  const key = input.key ?? '';
  const algorithm = normalizeAlgorithm(input.algorithm);
  const operation = normalizeOperation(input.operation);
  const inputEncoding = normalizeEncoding(input.inputEncoding, 'base64');
  const outputEncoding = normalizeEncoding(input.outputEncoding, 'base64');
  const cryptoAlgorithm = algorithmMap[algorithm];

  if (operation === 'encrypt') {
    const encrypted = cryptoAlgorithm.encrypt(text, key).toString();

    return {
      algorithm,
      operation,
      encoding: outputEncoding,
      text: outputEncoding === 'hex' ? base64ToHex(encrypted) : encrypted
    };
  }

  const normalizedCiphertext =
    inputEncoding === 'hex' ? hexToBase64(text) : text.replace(/\s+/g, '');
  const decrypted = cryptoAlgorithm
    .decrypt(normalizedCiphertext, key)
    .toString(CryptoJS.enc.Utf8);

  if (!decrypted) {
    throw new ToolboxError(
      'CRYPTO_DECRYPT_FAILED',
      'Unable to decrypt text with the selected algorithm and key'
    );
  }

  return {
    algorithm,
    operation,
    encoding: 'base64',
    text: decrypted
  };
};

export const symmetricCryptoTools: ToolboxTool[] = [
  {
    name: 'crypto.symmetric',
    title: 'Symmetric Encrypt / Decrypt',
    description:
      'Encrypt or decrypt text locally using AES, DES, TripleDES, RC4, or Rabbit.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local', 'secret'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        key: { type: 'string' },
        algorithm: { type: 'string', enum: algorithms, default: 'AES' },
        operation: { type: 'string', enum: operations, default: 'encrypt' },
        inputEncoding: { type: 'string', enum: encodings, default: 'base64' },
        outputEncoding: { type: 'string', enum: encodings, default: 'base64' }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['algorithm', 'operation', 'encoding', 'text'],
      additionalProperties: false,
      properties: {
        algorithm: { type: 'string', enum: algorithms },
        operation: { type: 'string', enum: operations },
        encoding: { type: 'string', enum: encodings },
        text: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok(runSymmetricCrypto(input as unknown as SymmetricCryptoInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
