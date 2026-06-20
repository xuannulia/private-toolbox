import {
  ToolboxError,
  type JsonValue,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type PemInspectInput = {
  pem: string;
};

export type PemBlockType =
  | 'x509_certificate'
  | 'certificate_request'
  | 'public_key'
  | 'private_key'
  | 'encrypted_private_key'
  | 'unknown';

export type PemBlockInfo = {
  index: number;
  label: string;
  type: PemBlockType;
  byteLength: number;
  base64Length: number;
  fingerprintSha256: string | null;
  details: Record<string, JsonValue>;
  warnings: string[];
};

export type PemInspectOutput = {
  blockCount: number;
  blocks: PemBlockInfo[];
};

type PemBlock = {
  label: string;
  body: string;
  der: Uint8Array;
};

type DerElement = {
  tag: number;
  tagClass: number;
  tagNumber: number;
  constructed: boolean;
  start: number;
  contentStart: number;
  contentEnd: number;
  end: number;
};

type ParsedName = {
  text: string;
  attributes: Array<{
    oid: string;
    name: string;
    value: string;
  }>;
};

type AlgorithmInfo = {
  oid: string;
  name: string;
};

type PublicKeyInfo = {
  algorithm: AlgorithmInfo;
  keyBits: number;
  rsa: {
    modulusLength: number;
    publicExponent: string;
  } | null;
};

const pemInputLimit = 500_000;

const oidNames: Record<string, string> = {
  '1.2.840.113549.1.1.1': 'rsaEncryption',
  '1.2.840.113549.1.1.5': 'sha1WithRSAEncryption',
  '1.2.840.113549.1.1.11': 'sha256WithRSAEncryption',
  '1.2.840.113549.1.1.12': 'sha384WithRSAEncryption',
  '1.2.840.113549.1.1.13': 'sha512WithRSAEncryption',
  '1.2.840.10045.2.1': 'ecPublicKey',
  '1.2.840.10045.4.3.2': 'ecdsaWithSHA256',
  '1.2.840.10045.4.3.3': 'ecdsaWithSHA384',
  '1.2.840.10045.4.3.4': 'ecdsaWithSHA512',
  '1.3.101.112': 'Ed25519',
  '2.5.4.3': 'CN',
  '2.5.4.4': 'SN',
  '2.5.4.5': 'serialNumber',
  '2.5.4.6': 'C',
  '2.5.4.7': 'L',
  '2.5.4.8': 'ST',
  '2.5.4.10': 'O',
  '2.5.4.11': 'OU',
  '2.5.4.12': 'T',
  '1.2.840.113549.1.9.1': 'emailAddress',
  '1.2.840.113549.1.9.14': 'extensionRequest',
  '2.5.29.14': 'subjectKeyIdentifier',
  '2.5.29.15': 'keyUsage',
  '2.5.29.17': 'subjectAltName',
  '2.5.29.19': 'basicConstraints',
  '2.5.29.35': 'authorityKeyIdentifier',
  '2.5.29.37': 'extendedKeyUsage',
  '1.3.6.1.5.5.7.3.1': 'serverAuth',
  '1.3.6.1.5.5.7.3.2': 'clientAuth',
  '1.3.6.1.5.5.7.3.3': 'codeSigning',
  '1.3.6.1.5.5.7.3.4': 'emailProtection',
  '1.3.6.1.5.5.7.3.8': 'timeStamping',
  '1.3.6.1.5.5.7.3.9': 'OCSPSigning'
};

const keyUsageNames = [
  'digitalSignature',
  'contentCommitment',
  'keyEncipherment',
  'dataEncipherment',
  'keyAgreement',
  'keyCertSign',
  'cRLSign',
  'encipherOnly',
  'decipherOnly'
];

const textDecoder = new TextDecoder();

const toOidName = (oid: string): string => oidNames[oid] ?? oid;

const isRecord = (value: unknown): value is Record<string, JsonValue> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const base64ToBytes = (value: string): Uint8Array => {
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  } catch {
    throw new ToolboxError('INVALID_PEM', 'PEM body is not valid base64');
  }
};

const normalizePem = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new ToolboxError('INVALID_PEM_INPUT', 'pem must be a string');
  }

  const pem = value.trim();
  if (!pem) {
    throw new ToolboxError('INVALID_PEM_INPUT', 'pem is required');
  }

  if (pem.length > pemInputLimit) {
    throw new ToolboxError(
      'PEM_TOO_LARGE',
      `pem must be at most ${pemInputLimit} characters`
    );
  }

  return pem;
};

const readPemBlocks = (pem: string): PemBlock[] => {
  const regex = /-----BEGIN ([^-]+)-----([\s\S]*?)-----END \1-----/g;
  const blocks: PemBlock[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(pem))) {
    const label = match[1].trim();
    const body = match[2].replace(/\s+/g, '');

    if (!body) {
      throw new ToolboxError('INVALID_PEM', `PEM block ${label} is empty`);
    }

    blocks.push({
      label,
      body,
      der: base64ToBytes(body)
    });
  }

  if (blocks.length === 0) {
    throw new ToolboxError('INVALID_PEM', 'No PEM blocks were found');
  }

  return blocks;
};

const readDerElement = (bytes: Uint8Array, offset: number): DerElement => {
  if (offset >= bytes.length) {
    throw new ToolboxError('INVALID_DER', 'Unexpected end of DER data');
  }

  const start = offset;
  const tag = bytes[offset];
  let cursor = offset + 1;
  const tagClass = tag >> 6;
  const constructed = (tag & 0x20) !== 0;
  let tagNumber = tag & 0x1f;

  if (tagNumber === 0x1f) {
    tagNumber = 0;
    while (cursor < bytes.length) {
      const byte = bytes[cursor];
      cursor += 1;
      tagNumber = tagNumber * 128 + (byte & 0x7f);
      if ((byte & 0x80) === 0) break;
    }
  }

  const firstLengthByte = bytes[cursor];
  if (firstLengthByte === undefined) {
    throw new ToolboxError('INVALID_DER', 'DER element is missing a length');
  }

  cursor += 1;
  let length = firstLengthByte;

  if (firstLengthByte & 0x80) {
    const lengthByteCount = firstLengthByte & 0x7f;

    if (lengthByteCount === 0 || lengthByteCount > 4) {
      throw new ToolboxError('INVALID_DER', 'Unsupported DER length encoding');
    }

    if (cursor + lengthByteCount > bytes.length) {
      throw new ToolboxError(
        'INVALID_DER',
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
    throw new ToolboxError('INVALID_DER', 'DER element exceeds available data');
  }

  return {
    tag,
    tagClass,
    tagNumber,
    constructed,
    start,
    contentStart,
    contentEnd,
    end: contentEnd
  };
};

const expectElement = (
  bytes: Uint8Array,
  offset: number,
  tag: number,
  label: string
): DerElement => {
  const element = readDerElement(bytes, offset);

  if (element.tag !== tag) {
    throw new ToolboxError('INVALID_DER', `Expected ${label}`);
  }

  return element;
};

const readChildren = (bytes: Uint8Array, element: DerElement): DerElement[] => {
  const children: DerElement[] = [];
  let cursor = element.contentStart;

  while (cursor < element.contentEnd) {
    const child = readDerElement(bytes, cursor);
    children.push(child);
    cursor = child.end;
  }

  if (cursor !== element.contentEnd) {
    throw new ToolboxError('INVALID_DER', 'DER child elements overflow parent');
  }

  return children;
};

const elementBytes = (bytes: Uint8Array, element: DerElement): Uint8Array =>
  bytes.slice(element.start, element.end);

const contentBytes = (bytes: Uint8Array, element: DerElement): Uint8Array =>
  bytes.slice(element.contentStart, element.contentEnd);

const stripIntegerPadding = (bytes: Uint8Array): Uint8Array => {
  let offset = 0;

  while (offset < bytes.length - 1 && bytes[offset] === 0) {
    offset += 1;
  }

  return bytes.slice(offset);
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
    throw new ToolboxError('INVALID_DER', 'DER integer is too large');
  }

  return value;
};

const readIntegerBytes = (
  bytes: Uint8Array,
  element: DerElement
): Uint8Array => {
  if (element.tag !== 0x02) {
    throw new ToolboxError('INVALID_DER', 'Expected INTEGER');
  }

  return stripIntegerPadding(contentBytes(bytes, element));
};

const getBitLength = (bytes: Uint8Array): number => {
  const normalized = stripIntegerPadding(bytes);
  const first = normalized[0];
  if (first === undefined || first === 0) return 0;

  return (normalized.length - 1) * 8 + first.toString(2).length;
};

const bytesToHex = (bytes: Uint8Array, separator = ''): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
    .join(separator)
    .toUpperCase();

const decodeOid = (bytes: Uint8Array): string => {
  if (bytes.length === 0) {
    throw new ToolboxError('INVALID_DER', 'OID is empty');
  }

  const values: number[] = [];
  let value = 0;

  for (const byte of bytes) {
    value = value * 128 + (byte & 0x7f);
    if ((byte & 0x80) === 0) {
      values.push(value);
      value = 0;
    }
  }

  if (value !== 0) {
    throw new ToolboxError('INVALID_DER', 'OID is truncated');
  }

  const firstValue = values.shift();
  if (firstValue === undefined) {
    throw new ToolboxError('INVALID_DER', 'OID is empty');
  }

  const firstArc = firstValue < 40 ? 0 : firstValue < 80 ? 1 : 2;
  const secondArc =
    firstArc === 2 ? firstValue - 80 : firstValue - firstArc * 40;

  return [firstArc, secondArc, ...values].join('.');
};

const readOid = (bytes: Uint8Array, element: DerElement): string => {
  if (element.tag !== 0x06) {
    throw new ToolboxError('INVALID_DER', 'Expected OID');
  }

  return decodeOid(contentBytes(bytes, element));
};

const decodeTextValue = (bytes: Uint8Array, element: DerElement): string => {
  const value = contentBytes(bytes, element);

  switch (element.tag) {
    case 0x0c:
    case 0x16:
    case 0x13:
    case 0x12:
    case 0x1a:
      return textDecoder.decode(value);
    case 0x1e: {
      const chars: string[] = [];
      for (let index = 0; index + 1 < value.length; index += 2) {
        chars.push(String.fromCharCode(value[index] * 256 + value[index + 1]));
      }
      return chars.join('');
    }
    case 0x14:
      return Array.from(value, (byte) => String.fromCharCode(byte)).join('');
    default:
      return bytesToHex(value, ':');
  }
};

const parseName = (bytes: Uint8Array, element: DerElement): ParsedName => {
  if (element.tag !== 0x30) {
    throw new ToolboxError('INVALID_DER', 'Expected Name SEQUENCE');
  }

  const attributes: ParsedName['attributes'] = [];

  for (const rdn of readChildren(bytes, element)) {
    if (rdn.tag !== 0x31) continue;

    for (const attribute of readChildren(bytes, rdn)) {
      if (attribute.tag !== 0x30) continue;

      const children = readChildren(bytes, attribute);
      const oidElement = children[0];
      const valueElement = children[1];
      if (!oidElement || !valueElement) continue;

      const oid = readOid(bytes, oidElement);
      attributes.push({
        oid,
        name: toOidName(oid),
        value: decodeTextValue(bytes, valueElement)
      });
    }
  }

  return {
    text: attributes.map((item) => `${item.name}=${item.value}`).join(', '),
    attributes
  };
};

const parseAlgorithmIdentifier = (
  bytes: Uint8Array,
  element: DerElement
): AlgorithmInfo => {
  if (element.tag !== 0x30) {
    throw new ToolboxError('INVALID_DER', 'Expected AlgorithmIdentifier');
  }

  const oidElement = readChildren(bytes, element)[0];
  if (!oidElement) {
    throw new ToolboxError('INVALID_DER', 'AlgorithmIdentifier is empty');
  }

  const oid = readOid(bytes, oidElement);
  return {
    oid,
    name: toOidName(oid)
  };
};

const readBitString = (
  bytes: Uint8Array,
  element: DerElement
): { unusedBits: number; bytes: Uint8Array } => {
  if (element.tag !== 0x03) {
    throw new ToolboxError('INVALID_DER', 'Expected BIT STRING');
  }

  const value = contentBytes(bytes, element);
  const unusedBits = value[0] ?? 0;

  return {
    unusedBits,
    bytes: value.slice(1)
  };
};

const parseRsaPublicKey = (
  bytes: Uint8Array
): { modulusLength: number; publicExponent: string } => {
  const sequence = expectElement(bytes, 0, 0x30, 'RSAPublicKey SEQUENCE');
  const children = readChildren(bytes, sequence);
  const modulus = children[0];
  const publicExponent = children[1];

  if (!modulus || !publicExponent) {
    throw new ToolboxError('INVALID_DER', 'RSA public key is incomplete');
  }

  return {
    modulusLength: getBitLength(readIntegerBytes(bytes, modulus)),
    publicExponent: bytesToBigIntString(readIntegerBytes(bytes, publicExponent))
  };
};

const parseSubjectPublicKeyInfo = (
  bytes: Uint8Array,
  element: DerElement
): PublicKeyInfo => {
  if (element.tag !== 0x30) {
    throw new ToolboxError('INVALID_DER', 'Expected SubjectPublicKeyInfo');
  }

  const children = readChildren(bytes, element);
  const algorithm = children[0];
  const publicKey = children[1];

  if (!algorithm || !publicKey) {
    throw new ToolboxError('INVALID_DER', 'SubjectPublicKeyInfo is incomplete');
  }

  const algorithmInfo = parseAlgorithmIdentifier(bytes, algorithm);
  const bitString = readBitString(bytes, publicKey);
  let rsa: PublicKeyInfo['rsa'] = null;

  if (algorithmInfo.oid === '1.2.840.113549.1.1.1') {
    rsa = parseRsaPublicKey(bitString.bytes);
  }

  return {
    algorithm: algorithmInfo,
    keyBits: bitString.bytes.length * 8 - bitString.unusedBits,
    rsa
  };
};

const parseDerTime = (bytes: Uint8Array, element: DerElement) => {
  const raw = textDecoder.decode(contentBytes(bytes, element));
  const utcMatch = raw.match(/^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/);
  const generalizedMatch = raw.match(
    /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/
  );

  if (element.tag === 0x17 && utcMatch) {
    const year = Number(utcMatch[1]);
    const fullYear = year >= 50 ? 1900 + year : 2000 + year;
    return {
      raw,
      iso: new Date(
        Date.UTC(
          fullYear,
          Number(utcMatch[2]) - 1,
          Number(utcMatch[3]),
          Number(utcMatch[4]),
          Number(utcMatch[5]),
          Number(utcMatch[6])
        )
      ).toISOString()
    };
  }

  if (element.tag === 0x18 && generalizedMatch) {
    return {
      raw,
      iso: new Date(
        Date.UTC(
          Number(generalizedMatch[1]),
          Number(generalizedMatch[2]) - 1,
          Number(generalizedMatch[3]),
          Number(generalizedMatch[4]),
          Number(generalizedMatch[5]),
          Number(generalizedMatch[6])
        )
      ).toISOString()
    };
  }

  return {
    raw,
    iso: null
  };
};

const parseValidity = (bytes: Uint8Array, element: DerElement) => {
  if (element.tag !== 0x30) {
    throw new ToolboxError('INVALID_DER', 'Expected Validity SEQUENCE');
  }

  const [notBefore, notAfter] = readChildren(bytes, element);

  if (!notBefore || !notAfter) {
    throw new ToolboxError('INVALID_DER', 'Validity is incomplete');
  }

  return {
    notBefore: parseDerTime(bytes, notBefore),
    notAfter: parseDerTime(bytes, notAfter)
  };
};

const parseBoolean = (bytes: Uint8Array, element: DerElement): boolean => {
  if (element.tag !== 0x01) {
    throw new ToolboxError('INVALID_DER', 'Expected BOOLEAN');
  }

  return (bytes[element.contentStart] ?? 0) !== 0;
};

const parseOctetString = (
  bytes: Uint8Array,
  element: DerElement
): Uint8Array => {
  if (element.tag !== 0x04) {
    throw new ToolboxError('INVALID_DER', 'Expected OCTET STRING');
  }

  return contentBytes(bytes, element);
};

const parseGeneralNames = (bytes: Uint8Array): JsonValue => {
  const sequence = expectElement(bytes, 0, 0x30, 'GeneralNames SEQUENCE');
  const names = readChildren(bytes, sequence).map((name) => {
    const value = contentBytes(bytes, name);

    switch (name.tag) {
      case 0x81:
        return { type: 'email', value: textDecoder.decode(value) };
      case 0x82:
        return { type: 'dns', value: textDecoder.decode(value) };
      case 0x86:
        return { type: 'uri', value: textDecoder.decode(value) };
      case 0x87:
        return {
          type: 'ip',
          value:
            value.length === 4
              ? Array.from(value).join('.')
              : Array.from(
                  { length: Math.ceil(value.length / 2) },
                  (_, index) =>
                    (
                      (value[index * 2] ?? 0) * 256 +
                      (value[index * 2 + 1] ?? 0)
                    )
                      .toString(16)
                      .padStart(4, '0')
                ).join(':')
        };
      case 0xa4: {
        const directoryName = readDerElement(bytes, name.contentStart);
        return {
          type: 'directoryName',
          value: parseName(bytes, directoryName).text
        };
      }
      default:
        return {
          type: `context-${name.tagNumber}`,
          value: bytesToHex(value, ':')
        };
    }
  });

  return names;
};

const parseKeyUsage = (bytes: Uint8Array): JsonValue => {
  const bitString = readBitString(
    bytes,
    expectElement(bytes, 0, 0x03, 'keyUsage')
  );
  const usages: string[] = [];

  keyUsageNames.forEach((name, bitIndex) => {
    const byte = bitString.bytes[Math.floor(bitIndex / 8)];
    const mask = 0x80 >> bitIndex % 8;
    if (byte !== undefined && (byte & mask) !== 0) usages.push(name);
  });

  return usages;
};

const parseBasicConstraints = (bytes: Uint8Array): JsonValue => {
  const sequence = expectElement(bytes, 0, 0x30, 'basicConstraints SEQUENCE');
  const children = readChildren(bytes, sequence);
  const caElement = children.find((child) => child.tag === 0x01);
  const pathLenElement = children.find((child) => child.tag === 0x02);

  return {
    ca: caElement ? parseBoolean(bytes, caElement) : false,
    pathLenConstraint: pathLenElement
      ? bytesToSmallInteger(readIntegerBytes(bytes, pathLenElement))
      : null
  };
};

const parseExtendedKeyUsage = (bytes: Uint8Array): JsonValue => {
  const sequence = expectElement(bytes, 0, 0x30, 'extendedKeyUsage SEQUENCE');

  return readChildren(bytes, sequence).map((child) => {
    const oid = readOid(bytes, child);
    return {
      oid,
      name: toOidName(oid)
    };
  });
};

const parseSubjectKeyIdentifier = (bytes: Uint8Array): JsonValue => {
  const octet = expectElement(
    bytes,
    0,
    0x04,
    'subjectKeyIdentifier OCTET STRING'
  );
  return bytesToHex(contentBytes(bytes, octet), ':');
};

const parseAuthorityKeyIdentifier = (bytes: Uint8Array): JsonValue => {
  const sequence = expectElement(
    bytes,
    0,
    0x30,
    'authorityKeyIdentifier SEQUENCE'
  );
  const keyIdentifier = readChildren(bytes, sequence).find(
    (child) => child.tag === 0x80
  );

  return {
    keyIdentifier: keyIdentifier
      ? bytesToHex(contentBytes(bytes, keyIdentifier), ':')
      : null
  };
};

const parseExtensionValue = (oid: string, bytes: Uint8Array): JsonValue => {
  switch (oid) {
    case '2.5.29.14':
      return parseSubjectKeyIdentifier(bytes);
    case '2.5.29.15':
      return parseKeyUsage(bytes);
    case '2.5.29.17':
      return parseGeneralNames(bytes);
    case '2.5.29.19':
      return parseBasicConstraints(bytes);
    case '2.5.29.35':
      return parseAuthorityKeyIdentifier(bytes);
    case '2.5.29.37':
      return parseExtendedKeyUsage(bytes);
    default:
      return bytesToHex(bytes, ':');
  }
};

const parseExtensions = (
  bytes: Uint8Array,
  element: DerElement
): JsonValue[] => {
  if (element.tag !== 0x30) {
    throw new ToolboxError('INVALID_DER', 'Expected Extensions SEQUENCE');
  }

  return readChildren(bytes, element).map((extension) => {
    const children = readChildren(bytes, extension);
    const oidElement = children[0];
    if (!oidElement) {
      throw new ToolboxError('INVALID_DER', 'Extension is missing an OID');
    }

    const oid = readOid(bytes, oidElement);
    let critical = false;
    let valueElement = children[1];

    if (valueElement?.tag === 0x01) {
      critical = parseBoolean(bytes, valueElement);
      valueElement = children[2];
    }

    if (!valueElement) {
      throw new ToolboxError('INVALID_DER', 'Extension is missing a value');
    }

    const valueBytes = parseOctetString(bytes, valueElement);
    let value: JsonValue;

    try {
      value = parseExtensionValue(oid, valueBytes);
    } catch (error) {
      value = {
        parseError: error instanceof Error ? error.message : 'Parse failed',
        hex: bytesToHex(valueBytes, ':')
      };
    }

    return {
      oid,
      name: toOidName(oid),
      critical,
      value
    };
  });
};

const collectSubjectAltNames = (extensions: JsonValue[]): JsonValue => {
  const extension = extensions.find(
    (item) =>
      isRecord(item) && item.oid === '2.5.29.17' && Array.isArray(item.value)
  );

  return isRecord(extension) ? extension.value : [];
};

const parseVersion = (
  bytes: Uint8Array,
  element: DerElement | undefined
): number => {
  if (!element || element.tag !== 0xa0) return 1;

  const versionElement = expectElement(
    bytes,
    element.contentStart,
    0x02,
    'certificate version'
  );

  return bytesToSmallInteger(readIntegerBytes(bytes, versionElement)) + 1;
};

const parseX509Certificate = (bytes: Uint8Array): Record<string, JsonValue> => {
  const certificate = expectElement(bytes, 0, 0x30, 'Certificate SEQUENCE');
  const [tbsCertificate, signatureAlgorithm, signatureValue] = readChildren(
    bytes,
    certificate
  );

  if (!tbsCertificate || !signatureAlgorithm || !signatureValue) {
    throw new ToolboxError('INVALID_DER', 'Certificate is incomplete');
  }

  const tbsChildren = readChildren(bytes, tbsCertificate);
  let cursor = 0;
  const version = parseVersion(bytes, tbsChildren[0]);
  if (tbsChildren[0]?.tag === 0xa0) cursor += 1;

  const serialNumber = tbsChildren[cursor++];
  const tbsSignature = tbsChildren[cursor++];
  const issuer = tbsChildren[cursor++];
  const validity = tbsChildren[cursor++];
  const subject = tbsChildren[cursor++];
  const publicKey = tbsChildren[cursor++];

  if (
    !serialNumber ||
    !tbsSignature ||
    !issuer ||
    !validity ||
    !subject ||
    !publicKey
  ) {
    throw new ToolboxError('INVALID_DER', 'TBSCertificate is incomplete');
  }

  const extensionsContainer = tbsChildren.find((child) => child.tag === 0xa3);
  let extensions: JsonValue[] = [];

  if (extensionsContainer) {
    const extensionsSequence = readDerElement(
      bytes,
      extensionsContainer.contentStart
    );
    extensions = parseExtensions(bytes, extensionsSequence);
  }

  return {
    version,
    serialNumberHex: bytesToHex(readIntegerBytes(bytes, serialNumber), ':'),
    signatureAlgorithm: parseAlgorithmIdentifier(bytes, signatureAlgorithm),
    tbsSignatureAlgorithm: parseAlgorithmIdentifier(bytes, tbsSignature),
    issuer: parseName(bytes, issuer),
    subject: parseName(bytes, subject),
    validity: parseValidity(bytes, validity),
    publicKey: parseSubjectPublicKeyInfo(bytes, publicKey),
    subjectAltNames: collectSubjectAltNames(extensions),
    extensions
  };
};

const parseCsrAttributes = (
  bytes: Uint8Array,
  element: DerElement | undefined
): { attributes: JsonValue[]; requestedExtensions: JsonValue[] } => {
  if (!element || element.tag !== 0xa0) {
    return {
      attributes: [],
      requestedExtensions: []
    };
  }

  const attributes: JsonValue[] = [];
  let requestedExtensions: JsonValue[] = [];

  for (const attribute of readChildren(bytes, element)) {
    const children = readChildren(bytes, attribute);
    const oidElement = children[0];
    const valuesElement = children[1];
    if (!oidElement || !valuesElement) continue;

    const oid = readOid(bytes, oidElement);
    const values = readChildren(bytes, valuesElement).map((value) =>
      bytesToHex(elementBytes(bytes, value), ':')
    );

    if (oid === '1.2.840.113549.1.9.14') {
      const extensionSequence = readChildren(bytes, valuesElement)[0];
      if (extensionSequence) {
        requestedExtensions = parseExtensions(bytes, extensionSequence);
      }
    }

    attributes.push({
      oid,
      name: toOidName(oid),
      values
    });
  }

  return {
    attributes,
    requestedExtensions
  };
};

const parseCertificateRequest = (
  bytes: Uint8Array
): Record<string, JsonValue> => {
  const csr = expectElement(bytes, 0, 0x30, 'CertificationRequest SEQUENCE');
  const [requestInfo, signatureAlgorithm, signatureValue] = readChildren(
    bytes,
    csr
  );

  if (!requestInfo || !signatureAlgorithm || !signatureValue) {
    throw new ToolboxError('INVALID_DER', 'Certificate request is incomplete');
  }

  const requestChildren = readChildren(bytes, requestInfo);
  const version = requestChildren[0];
  const subject = requestChildren[1];
  const publicKey = requestChildren[2];

  if (!version || !subject || !publicKey) {
    throw new ToolboxError(
      'INVALID_DER',
      'CertificationRequestInfo is incomplete'
    );
  }

  const { attributes, requestedExtensions } = parseCsrAttributes(
    bytes,
    requestChildren[3]
  );

  return {
    version: bytesToSmallInteger(readIntegerBytes(bytes, version)),
    subject: parseName(bytes, subject),
    publicKey: parseSubjectPublicKeyInfo(bytes, publicKey),
    signatureAlgorithm: parseAlgorithmIdentifier(bytes, signatureAlgorithm),
    attributes,
    requestedExtensions,
    subjectAltNames: collectSubjectAltNames(requestedExtensions)
  };
};

const parsePkcs1PrivateKey = (
  bytes: Uint8Array,
  format: string
): Record<string, JsonValue> => {
  const sequence = expectElement(bytes, 0, 0x30, 'RSAPrivateKey SEQUENCE');
  const children = readChildren(bytes, sequence);
  const version = children[0];
  const modulus = children[1];
  const publicExponent = children[2];

  if (!version || !modulus || !publicExponent) {
    throw new ToolboxError('INVALID_DER', 'RSA private key is incomplete');
  }

  return {
    format,
    algorithm: {
      oid: '1.2.840.113549.1.1.1',
      name: 'rsaEncryption'
    },
    modulusLength: getBitLength(readIntegerBytes(bytes, modulus)),
    publicExponent: bytesToBigIntString(
      readIntegerBytes(bytes, publicExponent)
    ),
    multiPrime: bytesToSmallInteger(readIntegerBytes(bytes, version)) > 0
  };
};

const parsePkcs8PrivateKey = (bytes: Uint8Array): Record<string, JsonValue> => {
  const sequence = expectElement(bytes, 0, 0x30, 'PrivateKeyInfo SEQUENCE');
  const children = readChildren(bytes, sequence);
  const version = children[0];
  const algorithm = children[1];
  const privateKey = children[2];

  if (!version || !algorithm || !privateKey) {
    throw new ToolboxError('INVALID_DER', 'PrivateKeyInfo is incomplete');
  }

  const algorithmInfo = parseAlgorithmIdentifier(bytes, algorithm);
  const details: Record<string, JsonValue> = {
    format: 'pkcs8',
    version: bytesToSmallInteger(readIntegerBytes(bytes, version)),
    algorithm: algorithmInfo
  };

  if (algorithmInfo.oid === '1.2.840.113549.1.1.1') {
    const rsa = parsePkcs1PrivateKey(
      parseOctetString(bytes, privateKey),
      'pkcs8-rsa'
    );
    return {
      ...details,
      ...rsa,
      format: 'pkcs8'
    };
  }

  return details;
};

const parseEncryptedPrivateKey = (
  bytes: Uint8Array
): Record<string, JsonValue> => {
  const sequence = expectElement(
    bytes,
    0,
    0x30,
    'EncryptedPrivateKeyInfo SEQUENCE'
  );
  const algorithm = readChildren(bytes, sequence)[0];

  return {
    format: 'pkcs8-encrypted',
    encrypted: true,
    encryptionAlgorithm: algorithm
      ? parseAlgorithmIdentifier(bytes, algorithm)
      : {
          oid: '',
          name: ''
        }
  };
};

const getBlockType = (label: string): PemBlockType => {
  switch (label) {
    case 'CERTIFICATE':
      return 'x509_certificate';
    case 'CERTIFICATE REQUEST':
    case 'NEW CERTIFICATE REQUEST':
      return 'certificate_request';
    case 'PUBLIC KEY':
    case 'RSA PUBLIC KEY':
      return 'public_key';
    case 'PRIVATE KEY':
    case 'RSA PRIVATE KEY':
      return 'private_key';
    case 'ENCRYPTED PRIVATE KEY':
      return 'encrypted_private_key';
    default:
      return 'unknown';
  }
};

const parseBlockDetails = (
  block: PemBlock
): { details: Record<string, JsonValue>; warnings: string[] } => {
  try {
    switch (block.label) {
      case 'CERTIFICATE':
        return {
          details: parseX509Certificate(block.der),
          warnings: []
        };
      case 'CERTIFICATE REQUEST':
      case 'NEW CERTIFICATE REQUEST':
        return {
          details: parseCertificateRequest(block.der),
          warnings: []
        };
      case 'PUBLIC KEY': {
        const subjectPublicKeyInfo = expectElement(
          block.der,
          0,
          0x30,
          'SubjectPublicKeyInfo'
        );
        return {
          details: parseSubjectPublicKeyInfo(block.der, subjectPublicKeyInfo),
          warnings: []
        };
      }
      case 'RSA PUBLIC KEY':
        return {
          details: {
            algorithm: {
              oid: '1.2.840.113549.1.1.1',
              name: 'rsaEncryption'
            },
            rsa: parseRsaPublicKey(block.der)
          },
          warnings: []
        };
      case 'PRIVATE KEY':
        return {
          details: parsePkcs8PrivateKey(block.der),
          warnings: []
        };
      case 'RSA PRIVATE KEY':
        return {
          details: parsePkcs1PrivateKey(block.der, 'pkcs1'),
          warnings: []
        };
      case 'ENCRYPTED PRIVATE KEY':
        return {
          details: parseEncryptedPrivateKey(block.der),
          warnings: ['Encrypted private key content is not decrypted.']
        };
      default:
        return {
          details: {
            rawDerHexPrefix: bytesToHex(block.der.slice(0, 32), ':')
          },
          warnings: [`Unsupported PEM label: ${block.label}`]
        };
    }
  } catch (error) {
    return {
      details: {
        parseError: error instanceof Error ? error.message : 'Parse failed'
      },
      warnings: ['PEM block was decoded but structured parsing failed.']
    };
  }
};

const sha256Fingerprint = async (bytes: Uint8Array): Promise<string | null> => {
  if (!globalThis.crypto?.subtle) return null;

  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer);

  return bytesToHex(new Uint8Array(digest), ':');
};

export const inspectPem = async (
  input: PemInspectInput
): Promise<PemInspectOutput> => {
  const blocks = readPemBlocks(normalizePem(input.pem));
  const inspectedBlocks = await Promise.all(
    blocks.map(async (block, index): Promise<PemBlockInfo> => {
      const parsed = parseBlockDetails(block);

      return {
        index,
        label: block.label,
        type: getBlockType(block.label),
        byteLength: block.der.byteLength,
        base64Length: block.body.length,
        fingerprintSha256: await sha256Fingerprint(block.der),
        details: parsed.details,
        warnings: parsed.warnings
      };
    })
  );

  return {
    blockCount: inspectedBlocks.length,
    blocks: inspectedBlocks
  };
};

export const pemTools: ToolboxTool[] = [
  {
    name: 'pem.inspect',
    title: 'Inspect PEM',
    description:
      'Inspect PEM blocks such as X.509 certificates, CSRs, public keys, and private keys.',
    channels: ['web', 'api', 'mcp'],
    risks: ['secret'],
    inputSchema: {
      type: 'object',
      required: ['pem'],
      additionalProperties: false,
      properties: {
        pem: { type: 'string' }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['blockCount', 'blocks'],
      additionalProperties: false,
      properties: {
        blockCount: { type: 'integer' },
        blocks: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'index',
              'label',
              'type',
              'byteLength',
              'base64Length',
              'fingerprintSha256',
              'details',
              'warnings'
            ],
            additionalProperties: false,
            properties: {
              index: { type: 'integer' },
              label: { type: 'string' },
              type: { type: 'string' },
              byteLength: { type: 'integer' },
              base64Length: { type: 'integer' },
              fingerprintSha256: { type: ['string', 'null'] },
              details: { type: 'object' },
              warnings: {
                type: 'array',
                items: { type: 'string' }
              }
            }
          }
        }
      }
    },
    execute: async (input) => {
      try {
        return ok(await inspectPem(input as PemInspectInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
