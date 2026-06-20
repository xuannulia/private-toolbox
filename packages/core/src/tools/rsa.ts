import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type RsaKeyPairAlgorithm = 'RSA-OAEP' | 'RSASSA-PKCS1-v1_5';
export type RsaHashAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512';
export type RsaModulusLength = 2048 | 3072 | 4096;

export type RsaGenerateKeyPairInput = {
  algorithm?: RsaKeyPairAlgorithm;
  modulusLength?: RsaModulusLength;
  hash?: RsaHashAlgorithm;
};

export type RsaGenerateKeyPairOutput = {
  algorithm: RsaKeyPairAlgorithm;
  modulusLength: RsaModulusLength;
  hash: RsaHashAlgorithm;
  publicKeyPem: string;
  privateKeyPem: string;
};

export type RsaPrivateKeyFormat = 'pkcs1' | 'pkcs8';

export type RsaPrivateKeyInput = {
  privateKeyPem: string;
};

export type RsaPrivateKeyInfo = {
  keyType: 'rsa';
  format: RsaPrivateKeyFormat;
  pemLabel: string;
  algorithmOid: string;
  modulusLength: number;
  publicExponent: string;
  multiPrime: boolean;
};

export type RsaExtractPublicKeyOutput = RsaPrivateKeyInfo & {
  publicKeyPem: string;
};

export type RsaDataEncoding = 'utf8' | 'base64';

export type RsaEncryptInput = {
  publicKeyPem: string;
  text: string;
  hash?: RsaHashAlgorithm;
  inputEncoding?: RsaDataEncoding;
};

export type RsaEncryptOutput = {
  algorithm: 'RSA-OAEP';
  hash: RsaHashAlgorithm;
  inputEncoding: RsaDataEncoding;
  ciphertextBase64: string;
};

export type RsaDecryptInput = {
  privateKeyPem: string;
  ciphertextBase64: string;
  hash?: RsaHashAlgorithm;
  outputEncoding?: RsaDataEncoding;
};

export type RsaDecryptOutput = {
  algorithm: 'RSA-OAEP';
  hash: RsaHashAlgorithm;
  outputEncoding: RsaDataEncoding;
  plaintext: string;
};

export type RsaSignInput = {
  privateKeyPem: string;
  text: string;
  hash?: RsaHashAlgorithm;
  inputEncoding?: RsaDataEncoding;
};

export type RsaSignOutput = {
  algorithm: 'RSASSA-PKCS1-v1_5';
  hash: RsaHashAlgorithm;
  inputEncoding: RsaDataEncoding;
  signatureBase64: string;
};

export type RsaVerifyInput = {
  publicKeyPem: string;
  text: string;
  signatureBase64: string;
  hash?: RsaHashAlgorithm;
  inputEncoding?: RsaDataEncoding;
};

export type RsaVerifyOutput = {
  algorithm: 'RSASSA-PKCS1-v1_5';
  hash: RsaHashAlgorithm;
  inputEncoding: RsaDataEncoding;
  valid: boolean;
};

const algorithms: RsaKeyPairAlgorithm[] = ['RSA-OAEP', 'RSASSA-PKCS1-v1_5'];
const hashes: RsaHashAlgorithm[] = ['SHA-256', 'SHA-384', 'SHA-512'];
const dataEncodings: RsaDataEncoding[] = ['utf8', 'base64'];
const modulusLengths: RsaModulusLength[] = [2048, 3072, 4096];
const rsaEncryptionOid = '1.2.840.113549.1.1.1';
const rsaEncryptionOidBytes = new Uint8Array([
  0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01
]);

const toBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
};

const toPem = (label: string, buffer: ArrayBuffer): string => {
  const base64 = toBase64(buffer);
  const lines = base64.match(/.{1,64}/g) ?? [];

  return [`-----BEGIN ${label}-----`, ...lines, `-----END ${label}-----`].join(
    '\n'
  );
};

const bytesToPem = (label: string, bytes: Uint8Array): string => {
  const base64 = bytesToBase64(bytes);
  const lines = base64.match(/.{1,64}/g) ?? [];

  return [`-----BEGIN ${label}-----`, ...lines, `-----END ${label}-----`].join(
    '\n'
  );
};

const keyUsagesFor = (algorithm: RsaKeyPairAlgorithm): KeyUsage[] =>
  algorithm === 'RSA-OAEP' ? ['encrypt', 'decrypt'] : ['sign', 'verify'];

type PemBlock = {
  label: string;
  der: Uint8Array;
};

type DerElement = {
  tag: number;
  contentStart: number;
  contentEnd: number;
  end: number;
};

type ParsedRsaPrivateKey = {
  format: RsaPrivateKeyFormat;
  pemLabel: string;
  algorithmOid: string;
  modulus: Uint8Array;
  publicExponent: Uint8Array;
  multiPrime: boolean;
};

const normalizePrivateKeyPem = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new ToolboxError(
      'INVALID_RSA_PRIVATE_KEY',
      'privateKeyPem must be a string'
    );
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ToolboxError(
      'INVALID_RSA_PRIVATE_KEY',
      'privateKeyPem is required'
    );
  }

  if (trimmed.length > 100_000) {
    throw new ToolboxError(
      'RSA_PRIVATE_KEY_TOO_LARGE',
      'privateKeyPem must be at most 100000 characters'
    );
  }

  return trimmed;
};

const base64ToBytes = (
  value: string,
  code = 'INVALID_RSA_PRIVATE_KEY',
  message = 'PEM body is not valid base64'
): Uint8Array => {
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  } catch {
    throw new ToolboxError(code, message);
  }
};

const readPemBlock = (pem: string): PemBlock => {
  const match = pem.match(/-----BEGIN ([^-]+)-----([\s\S]*?)-----END \1-----/);

  if (!match) {
    throw new ToolboxError(
      'INVALID_RSA_PRIVATE_KEY',
      'PEM block was not found'
    );
  }

  const label = match[1].trim();
  const body = match[2].replace(/\s+/g, '');

  if (label === 'ENCRYPTED PRIVATE KEY') {
    throw new ToolboxError(
      'UNSUPPORTED_RSA_PRIVATE_KEY',
      'Encrypted private keys are not supported'
    );
  }

  if (label !== 'PRIVATE KEY' && label !== 'RSA PRIVATE KEY') {
    throw new ToolboxError(
      'UNSUPPORTED_RSA_PRIVATE_KEY',
      `Unsupported PEM label: ${label}`
    );
  }

  return {
    label,
    der: base64ToBytes(body)
  };
};

const normalizePublicKeyPem = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new ToolboxError(
      'INVALID_RSA_PUBLIC_KEY',
      'publicKeyPem must be a string'
    );
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new ToolboxError(
      'INVALID_RSA_PUBLIC_KEY',
      'publicKeyPem is required'
    );
  }

  if (trimmed.length > 100_000) {
    throw new ToolboxError(
      'RSA_PUBLIC_KEY_TOO_LARGE',
      'publicKeyPem must be at most 100000 characters'
    );
  }

  return trimmed;
};

const readPublicKeyBlock = (pem: string): PemBlock => {
  const match = pem.match(/-----BEGIN ([^-]+)-----([\s\S]*?)-----END \1-----/);

  if (!match) {
    throw new ToolboxError('INVALID_RSA_PUBLIC_KEY', 'PEM block was not found');
  }

  const label = match[1].trim();
  const body = match[2].replace(/\s+/g, '');

  if (label !== 'PUBLIC KEY' && label !== 'RSA PUBLIC KEY') {
    throw new ToolboxError(
      'UNSUPPORTED_RSA_PUBLIC_KEY',
      `Unsupported PEM label: ${label}`
    );
  }

  return {
    label,
    der: base64ToBytes(
      body,
      'INVALID_RSA_PUBLIC_KEY',
      'PEM body is not valid base64'
    )
  };
};

const normalizeRequiredString = (
  value: unknown,
  fieldName: string,
  maxLength: number,
  code = 'INVALID_RSA_INPUT'
): string => {
  if (typeof value !== 'string') {
    throw new ToolboxError(code, `${fieldName} must be a string`);
  }

  if (!value.trim()) {
    throw new ToolboxError(code, `${fieldName} is required`);
  }

  if (value.length > maxLength) {
    throw new ToolboxError(
      'RSA_INPUT_TOO_LARGE',
      `${fieldName} must be at most ${maxLength} characters`
    );
  }

  return value;
};

const normalizeHash = (value: unknown): RsaHashAlgorithm => {
  const hash =
    value === undefined || value === null || value === '' ? 'SHA-256' : value;

  if (typeof hash !== 'string' || !hashes.includes(hash as RsaHashAlgorithm)) {
    throw new ToolboxError(
      'UNSUPPORTED_RSA_HASH',
      `Unsupported RSA hash: ${hash}`
    );
  }

  return hash as RsaHashAlgorithm;
};

const normalizeDataEncoding = (
  value: unknown,
  defaultEncoding: RsaDataEncoding
): RsaDataEncoding => {
  const encoding =
    value === undefined || value === null || value === ''
      ? defaultEncoding
      : value;

  if (
    typeof encoding !== 'string' ||
    !dataEncodings.includes(encoding as RsaDataEncoding)
  ) {
    throw new ToolboxError(
      'UNSUPPORTED_RSA_ENCODING',
      `Unsupported RSA data encoding: ${encoding}`
    );
  }

  return encoding as RsaDataEncoding;
};

const readDerElement = (bytes: Uint8Array, offset: number): DerElement => {
  if (offset >= bytes.length) {
    throw new ToolboxError(
      'INVALID_RSA_PRIVATE_KEY',
      'Unexpected end of DER data'
    );
  }

  const tag = bytes[offset];
  let cursor = offset + 1;
  const firstLengthByte = bytes[cursor];

  if (firstLengthByte === undefined) {
    throw new ToolboxError(
      'INVALID_RSA_PRIVATE_KEY',
      'DER element is missing a length'
    );
  }

  cursor += 1;
  let length = firstLengthByte;

  if (firstLengthByte & 0x80) {
    const lengthByteCount = firstLengthByte & 0x7f;

    if (lengthByteCount === 0 || lengthByteCount > 4) {
      throw new ToolboxError(
        'INVALID_RSA_PRIVATE_KEY',
        'Unsupported DER length encoding'
      );
    }

    if (cursor + lengthByteCount > bytes.length) {
      throw new ToolboxError(
        'INVALID_RSA_PRIVATE_KEY',
        'DER length exceeds available data'
      );
    }

    length = 0;
    for (let index = 0; index < lengthByteCount; index += 1) {
      length = length * 256 + bytes[cursor + index];
    }
    cursor += lengthByteCount;
  }

  const contentStart = cursor;
  const contentEnd = cursor + length;

  if (contentEnd > bytes.length) {
    throw new ToolboxError(
      'INVALID_RSA_PRIVATE_KEY',
      'DER element exceeds available data'
    );
  }

  return {
    tag,
    contentStart,
    contentEnd,
    end: contentEnd
  };
};

const expectDerElement = (
  bytes: Uint8Array,
  offset: number,
  tag: number,
  label: string
): DerElement => {
  const element = readDerElement(bytes, offset);

  if (element.tag !== tag) {
    throw new ToolboxError(
      'INVALID_RSA_PRIVATE_KEY',
      `Expected ${label} in DER data`
    );
  }

  return element;
};

const stripIntegerPadding = (bytes: Uint8Array): Uint8Array => {
  let offset = 0;

  while (offset < bytes.length - 1 && bytes[offset] === 0) {
    offset += 1;
  }

  return bytes.slice(offset);
};

const readDerInteger = (
  bytes: Uint8Array,
  offset: number
): { value: Uint8Array; nextOffset: number } => {
  const integer = expectDerElement(bytes, offset, 0x02, 'INTEGER');

  return {
    value: stripIntegerPadding(
      bytes.slice(integer.contentStart, integer.contentEnd)
    ),
    nextOffset: integer.end
  };
};

const bytesToBigIntString = (bytes: Uint8Array): string => {
  let value = 0n;

  for (const byte of bytes) {
    value = (value << 8n) + BigInt(byte);
  }

  return value.toString(10);
};

const bytesToSmallInteger = (bytes: Uint8Array): number => {
  const value = Number(bytesToBigIntString(bytes));

  if (!Number.isSafeInteger(value)) {
    throw new ToolboxError(
      'INVALID_RSA_PRIVATE_KEY',
      'DER integer is too large for this field'
    );
  }

  return value;
};

const getBitLength = (bytes: Uint8Array): number => {
  const normalized = stripIntegerPadding(bytes);
  const first = normalized[0];
  if (first === undefined || first === 0) return 0;

  return (normalized.length - 1) * 8 + first.toString(2).length;
};

const decodeOid = (bytes: Uint8Array): string => {
  if (bytes.length === 0) {
    throw new ToolboxError('INVALID_RSA_PRIVATE_KEY', 'OID is empty');
  }

  const parts = [Math.floor(bytes[0] / 40), bytes[0] % 40];
  let value = 0;

  for (let index = 1; index < bytes.length; index += 1) {
    const byte = bytes[index];
    value = value * 128 + (byte & 0x7f);

    if ((byte & 0x80) === 0) {
      parts.push(value);
      value = 0;
    }
  }

  return parts.join('.');
};

const parsePkcs1PrivateKey = (
  der: Uint8Array,
  pemLabel: string,
  format: RsaPrivateKeyFormat,
  algorithmOid = rsaEncryptionOid
): ParsedRsaPrivateKey => {
  const sequence = expectDerElement(der, 0, 0x30, 'RSAPrivateKey SEQUENCE');
  let cursor = sequence.contentStart;
  const version = readDerInteger(der, cursor);
  cursor = version.nextOffset;

  const modulus = readDerInteger(der, cursor);
  cursor = modulus.nextOffset;
  const publicExponent = readDerInteger(der, cursor);

  return {
    format,
    pemLabel,
    algorithmOid,
    modulus: modulus.value,
    publicExponent: publicExponent.value,
    multiPrime: bytesToSmallInteger(version.value) > 0
  };
};

const parsePkcs8PrivateKey = (
  der: Uint8Array,
  pemLabel: string
): ParsedRsaPrivateKey => {
  const sequence = expectDerElement(der, 0, 0x30, 'PrivateKeyInfo SEQUENCE');
  let cursor = sequence.contentStart;
  const version = readDerInteger(der, cursor);
  cursor = version.nextOffset;

  const algorithm = expectDerElement(der, cursor, 0x30, 'AlgorithmIdentifier');
  const oid = expectDerElement(der, algorithm.contentStart, 0x06, 'OID');
  const algorithmOid = decodeOid(der.slice(oid.contentStart, oid.contentEnd));

  if (algorithmOid !== rsaEncryptionOid) {
    throw new ToolboxError(
      'UNSUPPORTED_RSA_PRIVATE_KEY',
      `Unsupported private key algorithm OID: ${algorithmOid}`
    );
  }

  cursor = algorithm.end;
  const privateKey = expectDerElement(
    der,
    cursor,
    0x04,
    'privateKey OCTET STRING'
  );

  if (bytesToSmallInteger(version.value) !== 0) {
    throw new ToolboxError(
      'UNSUPPORTED_RSA_PRIVATE_KEY',
      'Only PKCS#8 version 0 private keys are supported'
    );
  }

  return parsePkcs1PrivateKey(
    der.slice(privateKey.contentStart, privateKey.contentEnd),
    pemLabel,
    'pkcs8',
    algorithmOid
  );
};

const parseRsaPrivateKey = (pem: string): ParsedRsaPrivateKey => {
  const block = readPemBlock(normalizePrivateKeyPem(pem));

  if (block.label === 'RSA PRIVATE KEY') {
    return parsePkcs1PrivateKey(block.der, block.label, 'pkcs1');
  }

  return parsePkcs8PrivateKey(block.der, block.label);
};

const encodeDerLength = (length: number): Uint8Array => {
  if (length < 0x80) return new Uint8Array([length]);

  const bytes: number[] = [];
  let remaining = length;

  while (remaining > 0) {
    bytes.unshift(remaining & 0xff);
    remaining >>= 8;
  }

  return new Uint8Array([0x80 | bytes.length, ...bytes]);
};

const concatBytes = (...parts: Uint8Array[]): Uint8Array => {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
};

const bytesToArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);

  return buffer;
};

const encodeDerElement = (tag: number, content: Uint8Array): Uint8Array =>
  concatBytes(new Uint8Array([tag]), encodeDerLength(content.length), content);

const encodeDerInteger = (value: Uint8Array): Uint8Array => {
  const normalized = stripIntegerPadding(value);
  const padded =
    normalized[0] !== undefined && normalized[0] >= 0x80
      ? concatBytes(new Uint8Array([0]), normalized)
      : normalized;

  return encodeDerElement(
    0x02,
    padded.length > 0 ? padded : new Uint8Array([0])
  );
};

const buildPublicKeyPem = (key: ParsedRsaPrivateKey): string => {
  const rsaPublicKey = encodeDerElement(
    0x30,
    concatBytes(
      encodeDerInteger(key.modulus),
      encodeDerInteger(key.publicExponent)
    )
  );
  const algorithmIdentifier = encodeDerElement(
    0x30,
    concatBytes(
      encodeDerElement(0x06, rsaEncryptionOidBytes),
      encodeDerElement(0x05, new Uint8Array())
    )
  );
  const subjectPublicKeyInfo = encodeDerElement(
    0x30,
    concatBytes(
      algorithmIdentifier,
      encodeDerElement(0x03, concatBytes(new Uint8Array([0]), rsaPublicKey))
    )
  );

  return bytesToPem('PUBLIC KEY', subjectPublicKeyInfo);
};

const buildPkcs8PrivateKeyDer = (
  pkcs1PrivateKeyDer: Uint8Array
): Uint8Array => {
  const algorithmIdentifier = encodeDerElement(
    0x30,
    concatBytes(
      encodeDerElement(0x06, rsaEncryptionOidBytes),
      encodeDerElement(0x05, new Uint8Array())
    )
  );

  return encodeDerElement(
    0x30,
    concatBytes(
      encodeDerInteger(new Uint8Array([0])),
      algorithmIdentifier,
      encodeDerElement(0x04, pkcs1PrivateKeyDer)
    )
  );
};

const buildSpkiPublicKeyDer = (rsaPublicKeyDer: Uint8Array): Uint8Array => {
  const algorithmIdentifier = encodeDerElement(
    0x30,
    concatBytes(
      encodeDerElement(0x06, rsaEncryptionOidBytes),
      encodeDerElement(0x05, new Uint8Array())
    )
  );

  return encodeDerElement(
    0x30,
    concatBytes(
      algorithmIdentifier,
      encodeDerElement(0x03, concatBytes(new Uint8Array([0]), rsaPublicKeyDer))
    )
  );
};

const getPrivateKeyPkcs8Der = (privateKeyPem: string): Uint8Array => {
  const block = readPemBlock(normalizePrivateKeyPem(privateKeyPem));

  return block.label === 'RSA PRIVATE KEY'
    ? buildPkcs8PrivateKeyDer(block.der)
    : block.der;
};

const getPublicKeySpkiDer = (publicKeyPem: string): Uint8Array => {
  const block = readPublicKeyBlock(normalizePublicKeyPem(publicKeyPem));

  return block.label === 'RSA PUBLIC KEY'
    ? buildSpkiPublicKeyDer(block.der)
    : block.der;
};

const getSubtleCrypto = (): SubtleCrypto => {
  if (!globalThis.crypto?.subtle) {
    throw new ToolboxError(
      'RSA_CRYPTO_UNAVAILABLE',
      'Web Crypto RSA support is not available'
    );
  }

  return globalThis.crypto.subtle;
};

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const importRsaPublicKey = async (
  publicKeyPem: string,
  algorithm: RsaKeyPairAlgorithm,
  hash: RsaHashAlgorithm,
  keyUsages: KeyUsage[]
): Promise<CryptoKey> => {
  try {
    return await getSubtleCrypto().importKey(
      'spki',
      bytesToArrayBuffer(getPublicKeySpkiDer(publicKeyPem)),
      {
        name: algorithm,
        hash: { name: hash }
      },
      false,
      keyUsages
    );
  } catch (error) {
    throw new ToolboxError(
      'INVALID_RSA_PUBLIC_KEY',
      getErrorMessage(error, 'Unable to import RSA public key')
    );
  }
};

const importRsaPrivateKey = async (
  privateKeyPem: string,
  algorithm: RsaKeyPairAlgorithm,
  hash: RsaHashAlgorithm,
  keyUsages: KeyUsage[]
): Promise<CryptoKey> => {
  try {
    return await getSubtleCrypto().importKey(
      'pkcs8',
      bytesToArrayBuffer(getPrivateKeyPkcs8Der(privateKeyPem)),
      {
        name: algorithm,
        hash: { name: hash }
      },
      false,
      keyUsages
    );
  } catch (error) {
    throw new ToolboxError(
      'INVALID_RSA_PRIVATE_KEY',
      getErrorMessage(error, 'Unable to import RSA private key')
    );
  }
};

const decodeData = (
  value: string,
  encoding: RsaDataEncoding,
  fieldName: string
): Uint8Array =>
  encoding === 'base64'
    ? base64ToBytes(
        value.replace(/\s+/g, ''),
        'INVALID_RSA_INPUT',
        `${fieldName} is not valid base64`
      )
    : new TextEncoder().encode(value);

const encodeData = (bytes: Uint8Array, encoding: RsaDataEncoding): string =>
  encoding === 'base64'
    ? bytesToBase64(bytes)
    : new TextDecoder().decode(bytes);

const toPrivateKeyInfo = (key: ParsedRsaPrivateKey): RsaPrivateKeyInfo => ({
  keyType: 'rsa',
  format: key.format,
  pemLabel: key.pemLabel,
  algorithmOid: key.algorithmOid,
  modulusLength: getBitLength(key.modulus),
  publicExponent: bytesToBigIntString(key.publicExponent),
  multiPrime: key.multiPrime
});

export const generateRsaKeyPair = async ({
  algorithm = 'RSA-OAEP',
  modulusLength = 2048,
  hash = 'SHA-256'
}: RsaGenerateKeyPairInput = {}): Promise<RsaGenerateKeyPairOutput> => {
  if (!algorithms.includes(algorithm)) {
    throw new ToolboxError(
      'UNSUPPORTED_RSA_ALGORITHM',
      `Unsupported RSA algorithm: ${algorithm}`
    );
  }

  if (!modulusLengths.includes(modulusLength)) {
    throw new ToolboxError(
      'UNSUPPORTED_RSA_MODULUS_LENGTH',
      `Unsupported RSA modulus length: ${modulusLength}`
    );
  }

  if (!hashes.includes(hash)) {
    throw new ToolboxError(
      'UNSUPPORTED_RSA_HASH',
      `Unsupported RSA hash: ${hash}`
    );
  }

  if (!globalThis.crypto?.subtle) {
    throw new ToolboxError(
      'RSA_CRYPTO_UNAVAILABLE',
      'Web Crypto RSA support is not available'
    );
  }

  const keyPair = (await globalThis.crypto.subtle.generateKey(
    {
      name: algorithm,
      modulusLength,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: { name: hash }
    },
    true,
    keyUsagesFor(algorithm)
  )) as CryptoKeyPair;

  const [publicKey, privateKey] = await Promise.all([
    globalThis.crypto.subtle.exportKey('spki', keyPair.publicKey),
    globalThis.crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
  ]);

  return {
    algorithm,
    modulusLength,
    hash,
    publicKeyPem: toPem('PUBLIC KEY', publicKey),
    privateKeyPem: toPem('PRIVATE KEY', privateKey)
  };
};

export const inspectRsaPrivateKey = (
  input: RsaPrivateKeyInput
): RsaPrivateKeyInfo =>
  toPrivateKeyInfo(parseRsaPrivateKey(input.privateKeyPem));

export const extractRsaPublicKey = (
  input: RsaPrivateKeyInput
): RsaExtractPublicKeyOutput => {
  const key = parseRsaPrivateKey(input.privateKeyPem);

  return {
    ...toPrivateKeyInfo(key),
    publicKeyPem: buildPublicKeyPem(key)
  };
};

export const encryptRsa = async ({
  publicKeyPem,
  text,
  hash,
  inputEncoding
}: RsaEncryptInput): Promise<RsaEncryptOutput> => {
  const normalizedHash = normalizeHash(hash);
  const normalizedEncoding = normalizeDataEncoding(inputEncoding, 'utf8');
  const normalizedText = normalizeRequiredString(text, 'text', 200_000);
  const key = await importRsaPublicKey(
    publicKeyPem,
    'RSA-OAEP',
    normalizedHash,
    ['encrypt']
  );

  try {
    const ciphertext = await getSubtleCrypto().encrypt(
      {
        name: 'RSA-OAEP'
      },
      key,
      bytesToArrayBuffer(decodeData(normalizedText, normalizedEncoding, 'text'))
    );

    return {
      algorithm: 'RSA-OAEP',
      hash: normalizedHash,
      inputEncoding: normalizedEncoding,
      ciphertextBase64: toBase64(ciphertext)
    };
  } catch (error) {
    throw new ToolboxError(
      'RSA_ENCRYPT_FAILED',
      getErrorMessage(error, 'RSA encryption failed')
    );
  }
};

export const decryptRsa = async ({
  privateKeyPem,
  ciphertextBase64,
  hash,
  outputEncoding
}: RsaDecryptInput): Promise<RsaDecryptOutput> => {
  const normalizedHash = normalizeHash(hash);
  const normalizedEncoding = normalizeDataEncoding(outputEncoding, 'utf8');
  const normalizedCiphertext = normalizeRequiredString(
    ciphertextBase64,
    'ciphertextBase64',
    1_000_000
  );
  const key = await importRsaPrivateKey(
    privateKeyPem,
    'RSA-OAEP',
    normalizedHash,
    ['decrypt']
  );

  try {
    const plaintext = await getSubtleCrypto().decrypt(
      {
        name: 'RSA-OAEP'
      },
      key,
      bytesToArrayBuffer(
        base64ToBytes(
          normalizedCiphertext.replace(/\s+/g, ''),
          'INVALID_RSA_INPUT',
          'ciphertextBase64 is not valid base64'
        )
      )
    );

    return {
      algorithm: 'RSA-OAEP',
      hash: normalizedHash,
      outputEncoding: normalizedEncoding,
      plaintext: encodeData(new Uint8Array(plaintext), normalizedEncoding)
    };
  } catch (error) {
    throw new ToolboxError(
      'RSA_DECRYPT_FAILED',
      getErrorMessage(error, 'RSA decryption failed')
    );
  }
};

export const signRsa = async ({
  privateKeyPem,
  text,
  hash,
  inputEncoding
}: RsaSignInput): Promise<RsaSignOutput> => {
  const normalizedHash = normalizeHash(hash);
  const normalizedEncoding = normalizeDataEncoding(inputEncoding, 'utf8');
  const normalizedText = normalizeRequiredString(text, 'text', 200_000);
  const key = await importRsaPrivateKey(
    privateKeyPem,
    'RSASSA-PKCS1-v1_5',
    normalizedHash,
    ['sign']
  );

  try {
    const signature = await getSubtleCrypto().sign(
      {
        name: 'RSASSA-PKCS1-v1_5'
      },
      key,
      bytesToArrayBuffer(decodeData(normalizedText, normalizedEncoding, 'text'))
    );

    return {
      algorithm: 'RSASSA-PKCS1-v1_5',
      hash: normalizedHash,
      inputEncoding: normalizedEncoding,
      signatureBase64: toBase64(signature)
    };
  } catch (error) {
    throw new ToolboxError(
      'RSA_SIGN_FAILED',
      getErrorMessage(error, 'RSA signing failed')
    );
  }
};

export const verifyRsa = async ({
  publicKeyPem,
  text,
  signatureBase64,
  hash,
  inputEncoding
}: RsaVerifyInput): Promise<RsaVerifyOutput> => {
  const normalizedHash = normalizeHash(hash);
  const normalizedEncoding = normalizeDataEncoding(inputEncoding, 'utf8');
  const normalizedText = normalizeRequiredString(text, 'text', 200_000);
  const normalizedSignature = normalizeRequiredString(
    signatureBase64,
    'signatureBase64',
    1_000_000
  );
  const key = await importRsaPublicKey(
    publicKeyPem,
    'RSASSA-PKCS1-v1_5',
    normalizedHash,
    ['verify']
  );

  const valid = await getSubtleCrypto().verify(
    {
      name: 'RSASSA-PKCS1-v1_5'
    },
    key,
    bytesToArrayBuffer(
      base64ToBytes(
        normalizedSignature.replace(/\s+/g, ''),
        'INVALID_RSA_INPUT',
        'signatureBase64 is not valid base64'
      )
    ),
    bytesToArrayBuffer(decodeData(normalizedText, normalizedEncoding, 'text'))
  );

  return {
    algorithm: 'RSASSA-PKCS1-v1_5',
    hash: normalizedHash,
    inputEncoding: normalizedEncoding,
    valid
  };
};

export const rsaTools: ToolboxTool[] = [
  {
    name: 'rsa.generate_keypair',
    title: 'Generate RSA Key Pair',
    description: 'Generate an RSA key pair and export it as PEM.',
    channels: ['web', 'api', 'mcp'],
    risks: ['secret'],
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        algorithm: {
          type: 'string',
          enum: algorithms,
          default: 'RSA-OAEP'
        },
        modulusLength: {
          type: 'integer',
          enum: modulusLengths,
          default: 2048
        },
        hash: {
          type: 'string',
          enum: hashes,
          default: 'SHA-256'
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'algorithm',
        'modulusLength',
        'hash',
        'publicKeyPem',
        'privateKeyPem'
      ],
      additionalProperties: false,
      properties: {
        algorithm: { type: 'string' },
        modulusLength: { type: 'integer' },
        hash: { type: 'string' },
        publicKeyPem: { type: 'string' },
        privateKeyPem: { type: 'string' }
      }
    },
    execute: async (input) => {
      try {
        return ok(await generateRsaKeyPair(input as RsaGenerateKeyPairInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'rsa.inspect_private_key',
    title: 'Inspect RSA Private Key',
    description:
      'Inspect an unencrypted RSA private key in PKCS#1 or PKCS#8 PEM.',
    channels: ['web', 'api', 'mcp'],
    risks: ['secret'],
    inputSchema: {
      type: 'object',
      required: ['privateKeyPem'],
      additionalProperties: false,
      properties: {
        privateKeyPem: { type: 'string' }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'keyType',
        'format',
        'pemLabel',
        'algorithmOid',
        'modulusLength',
        'publicExponent',
        'multiPrime'
      ],
      additionalProperties: false,
      properties: {
        keyType: { const: 'rsa' },
        format: { enum: ['pkcs1', 'pkcs8'] },
        pemLabel: { type: 'string' },
        algorithmOid: { type: 'string' },
        modulusLength: { type: 'integer' },
        publicExponent: { type: 'string' },
        multiPrime: { type: 'boolean' }
      }
    },
    execute: (input) => {
      try {
        return ok(inspectRsaPrivateKey(input as RsaPrivateKeyInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'rsa.extract_public_key',
    title: 'Extract RSA Public Key',
    description:
      'Extract a SubjectPublicKeyInfo public key PEM from an unencrypted RSA private key.',
    channels: ['web', 'api', 'mcp'],
    risks: ['secret'],
    inputSchema: {
      type: 'object',
      required: ['privateKeyPem'],
      additionalProperties: false,
      properties: {
        privateKeyPem: { type: 'string' }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'keyType',
        'format',
        'pemLabel',
        'algorithmOid',
        'modulusLength',
        'publicExponent',
        'multiPrime',
        'publicKeyPem'
      ],
      additionalProperties: false,
      properties: {
        keyType: { const: 'rsa' },
        format: { enum: ['pkcs1', 'pkcs8'] },
        pemLabel: { type: 'string' },
        algorithmOid: { type: 'string' },
        modulusLength: { type: 'integer' },
        publicExponent: { type: 'string' },
        multiPrime: { type: 'boolean' },
        publicKeyPem: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok(extractRsaPublicKey(input as RsaPrivateKeyInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'rsa.encrypt',
    title: 'RSA Encrypt',
    description: 'Encrypt UTF-8 or base64 data with an RSA-OAEP public key.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['publicKeyPem', 'text'],
      additionalProperties: false,
      properties: {
        publicKeyPem: { type: 'string' },
        text: { type: 'string' },
        hash: {
          type: 'string',
          enum: hashes,
          default: 'SHA-256'
        },
        inputEncoding: {
          type: 'string',
          enum: dataEncodings,
          default: 'utf8'
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['algorithm', 'hash', 'inputEncoding', 'ciphertextBase64'],
      additionalProperties: false,
      properties: {
        algorithm: { const: 'RSA-OAEP' },
        hash: { enum: hashes },
        inputEncoding: { enum: dataEncodings },
        ciphertextBase64: { type: 'string' }
      }
    },
    execute: async (input) => {
      try {
        return ok(await encryptRsa(input as RsaEncryptInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'rsa.decrypt',
    title: 'RSA Decrypt',
    description: 'Decrypt base64 RSA-OAEP ciphertext with an RSA private key.',
    channels: ['web', 'api', 'mcp'],
    risks: ['secret'],
    inputSchema: {
      type: 'object',
      required: ['privateKeyPem', 'ciphertextBase64'],
      additionalProperties: false,
      properties: {
        privateKeyPem: { type: 'string' },
        ciphertextBase64: { type: 'string' },
        hash: {
          type: 'string',
          enum: hashes,
          default: 'SHA-256'
        },
        outputEncoding: {
          type: 'string',
          enum: dataEncodings,
          default: 'utf8'
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['algorithm', 'hash', 'outputEncoding', 'plaintext'],
      additionalProperties: false,
      properties: {
        algorithm: { const: 'RSA-OAEP' },
        hash: { enum: hashes },
        outputEncoding: { enum: dataEncodings },
        plaintext: { type: 'string' }
      }
    },
    execute: async (input) => {
      try {
        return ok(await decryptRsa(input as RsaDecryptInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'rsa.sign',
    title: 'RSA Sign',
    description:
      'Create an RSASSA-PKCS1-v1_5 signature for UTF-8 or base64 data.',
    channels: ['web', 'api', 'mcp'],
    risks: ['secret'],
    inputSchema: {
      type: 'object',
      required: ['privateKeyPem', 'text'],
      additionalProperties: false,
      properties: {
        privateKeyPem: { type: 'string' },
        text: { type: 'string' },
        hash: {
          type: 'string',
          enum: hashes,
          default: 'SHA-256'
        },
        inputEncoding: {
          type: 'string',
          enum: dataEncodings,
          default: 'utf8'
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['algorithm', 'hash', 'inputEncoding', 'signatureBase64'],
      additionalProperties: false,
      properties: {
        algorithm: { const: 'RSASSA-PKCS1-v1_5' },
        hash: { enum: hashes },
        inputEncoding: { enum: dataEncodings },
        signatureBase64: { type: 'string' }
      }
    },
    execute: async (input) => {
      try {
        return ok(await signRsa(input as RsaSignInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'rsa.verify',
    title: 'RSA Verify',
    description:
      'Verify an RSASSA-PKCS1-v1_5 signature for UTF-8 or base64 data.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['publicKeyPem', 'text', 'signatureBase64'],
      additionalProperties: false,
      properties: {
        publicKeyPem: { type: 'string' },
        text: { type: 'string' },
        signatureBase64: { type: 'string' },
        hash: {
          type: 'string',
          enum: hashes,
          default: 'SHA-256'
        },
        inputEncoding: {
          type: 'string',
          enum: dataEncodings,
          default: 'utf8'
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['algorithm', 'hash', 'inputEncoding', 'valid'],
      additionalProperties: false,
      properties: {
        algorithm: { const: 'RSASSA-PKCS1-v1_5' },
        hash: { enum: hashes },
        inputEncoding: { enum: dataEncodings },
        valid: { type: 'boolean' }
      }
    },
    execute: async (input) => {
      try {
        return ok(await verifyRsa(input as RsaVerifyInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
