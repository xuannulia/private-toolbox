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
export type SymmetricCryptoKeyEncoding = 'utf8' | 'hex' | 'base64';
export type SymmetricCryptoMode = 'CBC' | 'CFB' | 'CTR' | 'OFB' | 'ECB';
export type SymmetricCryptoPadding =
  | 'Pkcs7'
  | 'Iso97971'
  | 'AnsiX923'
  | 'Iso10126'
  | 'ZeroPadding'
  | 'NoPadding';

export type SymmetricCryptoInput = {
  text: string;
  key?: string;
  iv?: string;
  algorithm?: SymmetricCryptoAlgorithm;
  operation?: SymmetricCryptoOperation;
  inputEncoding?: SymmetricCryptoEncoding;
  outputEncoding?: SymmetricCryptoEncoding;
  keyEncoding?: SymmetricCryptoKeyEncoding;
  ivEncoding?: SymmetricCryptoKeyEncoding;
  mode?: SymmetricCryptoMode;
  padding?: SymmetricCryptoPadding;
};

export type SymmetricCryptoOutput = {
  algorithm: SymmetricCryptoAlgorithm;
  operation: SymmetricCryptoOperation;
  encoding: SymmetricCryptoEncoding;
  text: string;
  keyEncoding: SymmetricCryptoKeyEncoding;
  iv?: string;
  ivEncoding?: SymmetricCryptoKeyEncoding;
  mode?: SymmetricCryptoMode;
  padding?: SymmetricCryptoPadding;
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
const keyEncodings: SymmetricCryptoKeyEncoding[] = ['utf8', 'hex', 'base64'];
const modes: SymmetricCryptoMode[] = ['CBC', 'CFB', 'CTR', 'OFB', 'ECB'];
const paddings: SymmetricCryptoPadding[] = [
  'Pkcs7',
  'Iso97971',
  'AnsiX923',
  'Iso10126',
  'ZeroPadding',
  'NoPadding'
];

const blockAlgorithms: SymmetricCryptoAlgorithm[] = ['AES', 'DES', 'TripleDES'];

const defaultUtf8Keys: Record<SymmetricCryptoAlgorithm, string> = {
  AES: '1234567890123456',
  DES: '12345678',
  TripleDES: '123456789012345678901234',
  RC4: 'private-toolbox',
  Rabbit: '1234567890123456'
};

const defaultUtf8Ivs: Record<
  Extract<SymmetricCryptoAlgorithm, 'AES' | 'DES' | 'TripleDES'>,
  string
> = {
  AES: '1234567890123456',
  DES: '12345678',
  TripleDES: '12345678'
};

const keyByteLengths: Record<SymmetricCryptoAlgorithm, number[] | null> = {
  AES: [16, 24, 32],
  DES: [8],
  TripleDES: [16, 24],
  RC4: null,
  Rabbit: [16]
};

const ivByteLengths: Record<
  Extract<SymmetricCryptoAlgorithm, 'AES' | 'DES' | 'TripleDES'>,
  number
> = {
  AES: 16,
  DES: 8,
  TripleDES: 8
};

const algorithmMap: Record<SymmetricCryptoAlgorithm, typeof CryptoJS.AES> = {
  AES: CryptoJS.AES,
  DES: CryptoJS.DES,
  TripleDES: CryptoJS.TripleDES,
  RC4: CryptoJS.RC4,
  Rabbit: CryptoJS.Rabbit
};

const modeMap = {
  CBC: CryptoJS.mode.CBC,
  CFB: CryptoJS.mode.CFB,
  CTR: CryptoJS.mode.CTR,
  OFB: CryptoJS.mode.OFB,
  ECB: CryptoJS.mode.ECB
};

const paddingMap = {
  Pkcs7: CryptoJS.pad.Pkcs7,
  Iso97971: CryptoJS.pad.Iso97971,
  AnsiX923: CryptoJS.pad.AnsiX923,
  Iso10126: CryptoJS.pad.Iso10126,
  ZeroPadding: CryptoJS.pad.ZeroPadding,
  NoPadding: CryptoJS.pad.NoPadding
};

const isBlockAlgorithm = (
  algorithm: SymmetricCryptoAlgorithm
): algorithm is Extract<
  SymmetricCryptoAlgorithm,
  'AES' | 'DES' | 'TripleDES'
> => blockAlgorithms.includes(algorithm);

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

const normalizeKeyEncoding = (
  value?: SymmetricCryptoKeyEncoding
): SymmetricCryptoKeyEncoding => {
  if (!value) return 'utf8';
  if (keyEncodings.includes(value)) return value;

  throw new ToolboxError(
    'CRYPTO_INVALID_KEY_ENCODING',
    `Unsupported key encoding: ${value}`
  );
};

const normalizeMode = (value?: SymmetricCryptoMode): SymmetricCryptoMode => {
  if (!value) return 'CBC';
  if (modes.includes(value)) return value;

  throw new ToolboxError('CRYPTO_INVALID_MODE', `Unsupported mode: ${value}`);
};

const normalizePadding = (
  value?: SymmetricCryptoPadding
): SymmetricCryptoPadding => {
  if (!value) return 'Pkcs7';
  if (paddings.includes(value)) return value;

  throw new ToolboxError(
    'CRYPTO_INVALID_PADDING',
    `Unsupported padding: ${value}`
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

const toDefaultEncodedValue = (
  value: string,
  encoding: SymmetricCryptoKeyEncoding
): string => {
  const wordArray = CryptoJS.enc.Utf8.parse(value);
  if (encoding === 'hex') return wordArray.toString(CryptoJS.enc.Hex);
  if (encoding === 'base64') return wordArray.toString(CryptoJS.enc.Base64);
  return value;
};

const normalizeBase64 = (value: string, code: string): string => {
  const normalized = value.replace(/\s+/g, '');
  if (
    !normalized ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      normalized
    )
  ) {
    throw new ToolboxError(code, 'Invalid Base64 value');
  }

  return normalized;
};

const normalizeHex = (value: string, code: string): string => {
  const normalized = value.replace(/\s+/g, '');
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(normalized)) {
    throw new ToolboxError(code, 'Invalid hex value');
  }

  return normalized;
};

const parseEncodedWordArray = (
  value: string,
  encoding: SymmetricCryptoKeyEncoding,
  errorCode: string
): CryptoJS.lib.WordArray => {
  if (encoding === 'hex') {
    return CryptoJS.enc.Hex.parse(normalizeHex(value, errorCode));
  }

  if (encoding === 'base64') {
    return CryptoJS.enc.Base64.parse(normalizeBase64(value, errorCode));
  }

  if (!value.length) {
    throw new ToolboxError(errorCode, 'UTF-8 value is required');
  }

  return CryptoJS.enc.Utf8.parse(value);
};

const parseCiphertext = (
  value: string,
  encoding: SymmetricCryptoEncoding
): CryptoJS.lib.WordArray =>
  encoding === 'hex'
    ? CryptoJS.enc.Hex.parse(normalizeHex(value, 'CRYPTO_INVALID_HEX'))
    : CryptoJS.enc.Base64.parse(
        normalizeBase64(value, 'CRYPTO_INVALID_BASE64')
      );

const formatCiphertext = (
  value: CryptoJS.lib.WordArray,
  encoding: SymmetricCryptoEncoding
): string =>
  encoding === 'hex'
    ? value.toString(CryptoJS.enc.Hex)
    : value.toString(CryptoJS.enc.Base64);

const validateByteLength = (
  value: CryptoJS.lib.WordArray,
  allowedLengths: number[] | null,
  code: string,
  label: string
): void => {
  if (!allowedLengths || allowedLengths.includes(value.sigBytes)) return;

  throw new ToolboxError(
    code,
    `${label} must be ${allowedLengths.join(' or ')} bytes`,
    {
      actualBytes: value.sigBytes,
      expectedBytes: allowedLengths
    }
  );
};

const resolveKey = (
  input: SymmetricCryptoInput,
  algorithm: SymmetricCryptoAlgorithm,
  keyEncoding: SymmetricCryptoKeyEncoding
): CryptoJS.lib.WordArray => {
  const key =
    input.key && input.key.length
      ? input.key
      : toDefaultEncodedValue(defaultUtf8Keys[algorithm], keyEncoding);
  const parsedKey = parseEncodedWordArray(
    key,
    keyEncoding,
    'CRYPTO_INVALID_KEY'
  );

  validateByteLength(
    parsedKey,
    keyByteLengths[algorithm],
    'CRYPTO_INVALID_KEY_LENGTH',
    `${algorithm} key`
  );

  return parsedKey;
};

const resolveIv = (
  input: SymmetricCryptoInput,
  algorithm: Extract<SymmetricCryptoAlgorithm, 'AES' | 'DES' | 'TripleDES'>,
  ivEncoding: SymmetricCryptoKeyEncoding
): { iv: CryptoJS.lib.WordArray; value: string } => {
  const value =
    input.iv && input.iv.length
      ? input.iv
      : toDefaultEncodedValue(defaultUtf8Ivs[algorithm], ivEncoding);
  const iv = parseEncodedWordArray(value, ivEncoding, 'CRYPTO_INVALID_IV');
  const expectedBytes = ivByteLengths[algorithm];

  if (iv.sigBytes !== expectedBytes) {
    throw new ToolboxError(
      'CRYPTO_INVALID_IV_LENGTH',
      `${algorithm} IV must be ${expectedBytes} bytes`,
      {
        actualBytes: iv.sigBytes,
        expectedBytes
      }
    );
  }

  return { iv, value };
};

export const runSymmetricCrypto = (
  input: SymmetricCryptoInput
): SymmetricCryptoOutput => {
  const text = requireText(input.text);
  const algorithm = normalizeAlgorithm(input.algorithm);
  const operation = normalizeOperation(input.operation);
  const inputEncoding = normalizeEncoding(input.inputEncoding, 'base64');
  const outputEncoding = normalizeEncoding(input.outputEncoding, 'base64');
  const keyEncoding = normalizeKeyEncoding(input.keyEncoding);
  const ivEncoding = normalizeKeyEncoding(input.ivEncoding);
  const key = resolveKey(input, algorithm, keyEncoding);
  const cryptoAlgorithm = algorithmMap[algorithm];

  const blockAlgorithm = isBlockAlgorithm(algorithm) ? algorithm : null;
  const blockSettings = blockAlgorithm
    ? {
        mode: normalizeMode(input.mode),
        padding: normalizePadding(input.padding)
      }
    : null;
  const ivSettings =
    blockAlgorithm && blockSettings && blockSettings.mode !== 'ECB'
      ? resolveIv(input, blockAlgorithm, ivEncoding)
      : null;
  const cipherOptions = blockSettings
    ? {
        mode: modeMap[blockSettings.mode],
        padding: paddingMap[blockSettings.padding],
        ...(ivSettings ? { iv: ivSettings.iv } : {})
      }
    : undefined;

  if (operation === 'encrypt') {
    const encrypted = cryptoAlgorithm.encrypt(text, key, cipherOptions);

    return {
      algorithm,
      operation,
      encoding: outputEncoding,
      text: formatCiphertext(encrypted.ciphertext, outputEncoding),
      keyEncoding,
      ...(blockSettings
        ? {
            mode: blockSettings.mode,
            padding: blockSettings.padding,
            ...(ivSettings ? { iv: ivSettings.value, ivEncoding } : {})
          }
        : {})
    };
  }

  const ciphertext = CryptoJS.lib.CipherParams.create({
    ciphertext: parseCiphertext(text, inputEncoding)
  });
  const decrypted = cryptoAlgorithm
    .decrypt(ciphertext, key, cipherOptions)
    .toString(CryptoJS.enc.Utf8);

  if (!decrypted) {
    throw new ToolboxError(
      'CRYPTO_DECRYPT_FAILED',
      'Unable to decrypt text with the selected algorithm, key, IV, mode, and padding'
    );
  }

  return {
    algorithm,
    operation,
    encoding: inputEncoding,
    text: decrypted,
    keyEncoding,
    ...(blockSettings
      ? {
          mode: blockSettings.mode,
          padding: blockSettings.padding,
          ...(ivSettings ? { iv: ivSettings.value, ivEncoding } : {})
        }
      : {})
  };
};

export const symmetricCryptoTools: ToolboxTool[] = [
  {
    name: 'crypto.symmetric',
    title: 'Symmetric Encrypt / Decrypt',
    description:
      'Encrypt or decrypt text locally using AES, DES, TripleDES, RC4, or Rabbit with key, IV, mode, and padding controls.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local', 'secret'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        key: { type: 'string' },
        iv: { type: 'string' },
        algorithm: { type: 'string', enum: algorithms, default: 'AES' },
        operation: { type: 'string', enum: operations, default: 'encrypt' },
        inputEncoding: { type: 'string', enum: encodings, default: 'base64' },
        outputEncoding: { type: 'string', enum: encodings, default: 'base64' },
        keyEncoding: { type: 'string', enum: keyEncodings, default: 'utf8' },
        ivEncoding: { type: 'string', enum: keyEncodings, default: 'utf8' },
        mode: { type: 'string', enum: modes, default: 'CBC' },
        padding: { type: 'string', enum: paddings, default: 'Pkcs7' }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['algorithm', 'operation', 'encoding', 'text', 'keyEncoding'],
      additionalProperties: false,
      properties: {
        algorithm: { type: 'string', enum: algorithms },
        operation: { type: 'string', enum: operations },
        encoding: { type: 'string', enum: encodings },
        text: { type: 'string' },
        keyEncoding: { type: 'string', enum: keyEncodings },
        iv: { type: 'string' },
        ivEncoding: { type: 'string', enum: keyEncodings },
        mode: { type: 'string', enum: modes },
        padding: { type: 'string', enum: paddings }
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
