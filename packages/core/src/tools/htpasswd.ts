import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type HtpasswdScheme = 'apr1' | 'sha1';

export type HtpasswdGenerateInput = {
  username: string;
  password: string;
  scheme?: HtpasswdScheme;
  salt?: string;
};

export type HtpasswdGenerateOutput = {
  username: string;
  scheme: HtpasswdScheme;
  salt: string | null;
  hash: string;
  line: string;
};

const schemes: HtpasswdScheme[] = ['apr1', 'sha1'];
const saltCharacters =
  './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const maxUsernameLength = 255;
const maxPasswordLength = 4096;
const maxSaltLength = 8;

const md5ShiftAmounts = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
  9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
  16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15,
  21
];

const md5Constants = Array.from({ length: 64 }, (_, index) =>
  Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32)
);

const textEncoder = new TextEncoder();

const leftRotate = (value: number, amount: number): number =>
  ((value << amount) | (value >>> (32 - amount))) >>> 0;

const writeWordLittleEndian = (
  output: Uint8Array,
  offset: number,
  word: number
) => {
  output[offset] = word & 0xff;
  output[offset + 1] = (word >>> 8) & 0xff;
  output[offset + 2] = (word >>> 16) & 0xff;
  output[offset + 3] = (word >>> 24) & 0xff;
};

const md5Bytes = (bytes: Uint8Array): Uint8Array => {
  let paddedLength = bytes.length + 1;
  while (paddedLength % 64 !== 56) paddedLength += 1;

  const padded = new Uint8Array(paddedLength + 8);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  const bitLength = BigInt(bytes.length) * 8n;
  for (let index = 0; index < 8; index += 1) {
    padded[paddedLength + index] = Number(
      (bitLength >> BigInt(index * 8)) & 0xffn
    );
  }

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let offset = 0; offset < padded.length; offset += 64) {
    const words = Array.from({ length: 16 }, (_, index) => {
      const position = offset + index * 4;
      return (
        (padded[position] |
          (padded[position + 1] << 8) |
          (padded[position + 2] << 16) |
          (padded[position + 3] << 24)) >>>
        0
      );
    });

    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let index = 0; index < 64; index += 1) {
      let f: number;
      let g: number;

      if (index < 16) {
        f = (b & c) | (~b & d);
        g = index;
      } else if (index < 32) {
        f = (d & b) | (~d & c);
        g = (5 * index + 1) % 16;
      } else if (index < 48) {
        f = b ^ c ^ d;
        g = (3 * index + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * index) % 16;
      }

      const previousD = d;
      d = c;
      c = b;
      b =
        (b +
          leftRotate(
            (a + f + md5Constants[index] + words[g]) >>> 0,
            md5ShiftAmounts[index]
          )) >>>
        0;
      a = previousD;
    }

    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  const output = new Uint8Array(16);
  writeWordLittleEndian(output, 0, a0);
  writeWordLittleEndian(output, 4, b0);
  writeWordLittleEndian(output, 8, c0);
  writeWordLittleEndian(output, 12, d0);
  return output;
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

const textBytes = (value: string): Uint8Array => textEncoder.encode(value);

const cryptBase64 = (value: number, length: number): string => {
  let result = '';
  let remaining = value;

  for (let index = 0; index < length; index += 1) {
    result += saltCharacters[remaining & 0x3f];
    remaining >>= 6;
  }

  return result;
};

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const normalizeUsername = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new ToolboxError(
      'INVALID_HTPASSWD_INPUT',
      'username must be a string'
    );
  }

  const username = value.trim();
  if (!username) {
    throw new ToolboxError('INVALID_HTPASSWD_INPUT', 'username is required');
  }

  if (username.length > maxUsernameLength) {
    throw new ToolboxError(
      'INVALID_HTPASSWD_INPUT',
      `username must be at most ${maxUsernameLength} characters`
    );
  }

  if (/[:\r\n]/.test(username)) {
    throw new ToolboxError(
      'INVALID_HTPASSWD_INPUT',
      'username must not contain colon or line breaks'
    );
  }

  return username;
};

const normalizePassword = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new ToolboxError(
      'INVALID_HTPASSWD_INPUT',
      'password must be a string'
    );
  }

  if (!value) {
    throw new ToolboxError('INVALID_HTPASSWD_INPUT', 'password is required');
  }

  if (value.length > maxPasswordLength) {
    throw new ToolboxError(
      'INVALID_HTPASSWD_INPUT',
      `password must be at most ${maxPasswordLength} characters`
    );
  }

  if (/[\r\n]/.test(value)) {
    throw new ToolboxError(
      'INVALID_HTPASSWD_INPUT',
      'password must not contain line breaks'
    );
  }

  return value;
};

const normalizeScheme = (value: unknown): HtpasswdScheme => {
  const scheme = value ?? 'apr1';
  if (
    typeof scheme !== 'string' ||
    !schemes.includes(scheme as HtpasswdScheme)
  ) {
    throw new ToolboxError(
      'UNSUPPORTED_HTPASSWD_SCHEME',
      `scheme must be one of: ${schemes.join(', ')}`
    );
  }

  return scheme as HtpasswdScheme;
};

const randomIndex = (maxExclusive: number): number => {
  if (!globalThis.crypto?.getRandomValues) {
    throw new ToolboxError(
      'HTPASSWD_CRYPTO_UNAVAILABLE',
      'Secure random support is not available'
    );
  }

  const random = new Uint32Array(1);
  const range = 0x100000000;
  const maxUnbiased = Math.floor(range / maxExclusive) * maxExclusive;

  do {
    globalThis.crypto.getRandomValues(random);
  } while (random[0] >= maxUnbiased);

  return random[0] % maxExclusive;
};

const generateSalt = (): string =>
  Array.from(
    { length: maxSaltLength },
    () => saltCharacters[randomIndex(saltCharacters.length)]
  ).join('');

const normalizeApr1Salt = (value: unknown): string => {
  if (value === undefined || value === null || value === '') {
    return generateSalt();
  }

  if (typeof value !== 'string') {
    throw new ToolboxError('INVALID_HTPASSWD_INPUT', 'salt must be a string');
  }

  const salt = value
    .replace(/^\$apr1\$/i, '')
    .split('$')[0]
    .slice(0, 8);
  if (!salt || !/^[./A-Za-z0-9]{1,8}$/.test(salt)) {
    throw new ToolboxError(
      'INVALID_HTPASSWD_INPUT',
      'apr1 salt must use 1 to 8 characters from ./0-9A-Za-z'
    );
  }

  return salt;
};

const createApr1Hash = (password: string, salt: string): string => {
  const passwordBytes = textBytes(password);
  const saltBytes = textBytes(salt);
  const magicBytes = textBytes('$apr1$');
  let final = md5Bytes(concatBytes(passwordBytes, saltBytes, passwordBytes));
  const parts: Uint8Array[] = [passwordBytes, magicBytes, saltBytes];

  for (let remaining = passwordBytes.length; remaining > 0; remaining -= 16) {
    parts.push(final.slice(0, Math.min(16, remaining)));
  }

  for (let index = passwordBytes.length; index > 0; index >>= 1) {
    parts.push(index & 1 ? new Uint8Array([0]) : passwordBytes.slice(0, 1));
  }

  final = md5Bytes(concatBytes(...parts));

  for (let index = 0; index < 1000; index += 1) {
    const roundParts: Uint8Array[] = [];

    roundParts.push(index & 1 ? passwordBytes : final);
    if (index % 3 !== 0) roundParts.push(saltBytes);
    if (index % 7 !== 0) roundParts.push(passwordBytes);
    roundParts.push(index & 1 ? final : passwordBytes);

    final = md5Bytes(concatBytes(...roundParts));
  }

  const encoded =
    cryptBase64((final[0] << 16) | (final[6] << 8) | final[12], 4) +
    cryptBase64((final[1] << 16) | (final[7] << 8) | final[13], 4) +
    cryptBase64((final[2] << 16) | (final[8] << 8) | final[14], 4) +
    cryptBase64((final[3] << 16) | (final[9] << 8) | final[15], 4) +
    cryptBase64((final[4] << 16) | (final[10] << 8) | final[5], 4) +
    cryptBase64(final[11], 2);

  return `$apr1$${salt}$${encoded}`;
};

const createSha1Hash = async (password: string): Promise<string> => {
  if (!globalThis.crypto?.subtle) {
    throw new ToolboxError(
      'HTPASSWD_CRYPTO_UNAVAILABLE',
      'Web Crypto SHA-1 support is not available'
    );
  }

  const passwordBytes = textBytes(password);
  const buffer = passwordBytes.buffer.slice(
    passwordBytes.byteOffset,
    passwordBytes.byteOffset + passwordBytes.byteLength
  ) as ArrayBuffer;
  const digest = await globalThis.crypto.subtle.digest('SHA-1', buffer);

  return `{SHA}${bytesToBase64(new Uint8Array(digest))}`;
};

export const generateHtpasswd = async (
  input: HtpasswdGenerateInput
): Promise<HtpasswdGenerateOutput> => {
  const username = normalizeUsername(input.username);
  const password = normalizePassword(input.password);
  const scheme = normalizeScheme(input.scheme);
  let salt: string | null = null;
  let hash: string;

  if (scheme === 'apr1') {
    salt = normalizeApr1Salt(input.salt);
    hash = createApr1Hash(password, salt);
  } else {
    hash = await createSha1Hash(password);
  }

  return {
    username,
    scheme,
    salt,
    hash,
    line: `${username}:${hash}`
  };
};

export const htpasswdTools: ToolboxTool[] = [
  {
    name: 'htpasswd.generate',
    title: 'Generate htpasswd',
    description: 'Generate an htpasswd line for HTTP Basic Auth.',
    channels: ['web', 'api', 'mcp'],
    risks: ['secret'],
    inputSchema: {
      type: 'object',
      required: ['username', 'password'],
      additionalProperties: false,
      properties: {
        username: { type: 'string', maxLength: maxUsernameLength },
        password: { type: 'string', maxLength: maxPasswordLength },
        scheme: {
          type: 'string',
          enum: schemes,
          default: 'apr1'
        },
        salt: {
          type: 'string',
          maxLength: maxSaltLength,
          description: 'Optional apr1 salt using ./0-9A-Za-z'
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['username', 'scheme', 'salt', 'hash', 'line'],
      additionalProperties: false,
      properties: {
        username: { type: 'string' },
        scheme: { type: 'string', enum: schemes },
        salt: { type: ['string', 'null'] },
        hash: { type: 'string' },
        line: { type: 'string' }
      }
    },
    execute: async (input) => {
      try {
        return ok(await generateHtpasswd(input as HtpasswdGenerateInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
