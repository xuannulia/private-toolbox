import {
  type JsonValue,
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type JwtDecodeInput = {
  token: string;
};

export type JwtInspectInput = JwtDecodeInput & {
  currentDate?: string;
  leewaySeconds?: number;
};

export type JwtDecodeOutput = {
  header: JsonValue;
  payload: JsonValue;
  signature: string;
  headerText: string;
  payloadText: string;
};

export type JwtTimestampInfo = {
  value: number | null;
  iso: string | null;
};

export type JwtInspectOutput = JwtDecodeOutput & {
  algorithm: string | null;
  type: string | null;
  issuer: string | null;
  subject: string | null;
  audience: JsonValue;
  jwtId: string | null;
  issuedAt: JwtTimestampInfo;
  notBefore: JwtTimestampInfo;
  expiresAt: JwtTimestampInfo;
  expired: boolean;
  notYetValid: boolean;
  active: boolean;
  expiresInSeconds: number | null;
  signaturePresent: boolean;
};

type BufferLike = {
  from(input: string, encoding?: string): {
    toString(encoding?: string): string;
  };
};

const getBuffer = (): BufferLike | undefined =>
  (globalThis as typeof globalThis & { Buffer?: BufferLike }).Buffer;

const normalizeToken = (value: unknown): string => {
  if (typeof value !== 'string') {
    throw new ToolboxError('INVALID_JWT_INPUT', 'token must be a string');
  }

  const token = value.trim().replace(/^Bearer\s+/i, '');
  if (!token) {
    throw new ToolboxError('INVALID_JWT_INPUT', 'token is required');
  }

  return token;
};

const splitJwt = (token: string): [string, string, string] => {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new ToolboxError(
      'INVALID_JWT',
      'JWT must have three dot-separated parts'
    );
  }

  return [parts[0], parts[1], parts[2]];
};

const normalizeBase64Url = (value: string): string => {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) {
    throw new ToolboxError('INVALID_JWT', 'JWT contains invalid base64url data');
  }

  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const paddingLength = (4 - (base64.length % 4)) % 4;
  return `${base64}${'='.repeat(paddingLength)}`;
};

const binaryToBytes = (binary: string): Uint8Array => {
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const base64UrlToText = (value: string): string => {
  const normalized = normalizeBase64Url(value);

  if (typeof atob === 'function') {
    return new TextDecoder().decode(binaryToBytes(atob(normalized)));
  }

  const buffer = getBuffer();
  if (buffer) {
    return buffer.from(normalized, 'base64').toString('utf-8');
  }

  throw new ToolboxError('JWT_UNSUPPORTED', 'Base64 decoding is not available');
};

const toRecord = (value: JsonValue): Record<string, JsonValue> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};

const getStringClaim = (
  claims: Record<string, JsonValue>,
  name: string
): string | null => (typeof claims[name] === 'string' ? claims[name] : null);

const getNumericClaim = (
  claims: Record<string, JsonValue>,
  name: string
): number | null => {
  const value = claims[name];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const toTimestampInfo = (value: number | null): JwtTimestampInfo => ({
  value,
  iso: value === null ? null : new Date(value * 1000).toISOString()
});

const parseCurrentDate = (value: unknown): number => {
  if (value === undefined || value === null || value === '') {
    return Math.floor(Date.now() / 1000);
  }

  if (typeof value !== 'string') {
    throw new ToolboxError(
      'INVALID_JWT_INPUT',
      'currentDate must be an ISO date string'
    );
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    throw new ToolboxError('INVALID_DATE', `Invalid currentDate: ${value}`);
  }

  return Math.floor(timestamp / 1000);
};

const parseLeewaySeconds = (value: unknown): number => {
  if (value === undefined) return 0;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 3600
  ) {
    throw new ToolboxError(
      'INVALID_JWT_INPUT',
      'leewaySeconds must be a number from 0 to 3600'
    );
  }

  return value;
};

export const decodeJwt = (input: JwtDecodeInput): JwtDecodeOutput => {
  const token = normalizeToken(input.token);
  const [headerPart, payloadPart, signature] = splitJwt(token);
  const headerText = base64UrlToText(headerPart);
  const payloadText = base64UrlToText(payloadPart);

  try {
    return {
      header: JSON.parse(headerText) as JsonValue,
      payload: JSON.parse(payloadText) as JsonValue,
      signature,
      headerText,
      payloadText
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON';
    throw new ToolboxError('INVALID_JWT_JSON', message);
  }
};

export const inspectJwt = (input: JwtInspectInput): JwtInspectOutput => {
  const decoded = decodeJwt(input);
  const header = toRecord(decoded.header);
  const payload = toRecord(decoded.payload);
  const now = parseCurrentDate(input.currentDate);
  const leewaySeconds = parseLeewaySeconds(input.leewaySeconds);
  const issuedAtValue = getNumericClaim(payload, 'iat');
  const notBeforeValue = getNumericClaim(payload, 'nbf');
  const expiresAtValue = getNumericClaim(payload, 'exp');
  const expired =
    expiresAtValue === null ? false : now - leewaySeconds >= expiresAtValue;
  const notYetValid =
    notBeforeValue === null ? false : now + leewaySeconds < notBeforeValue;

  return {
    ...decoded,
    algorithm: getStringClaim(header, 'alg'),
    type: getStringClaim(header, 'typ'),
    issuer: getStringClaim(payload, 'iss'),
    subject: getStringClaim(payload, 'sub'),
    audience: payload.aud ?? null,
    jwtId: getStringClaim(payload, 'jti'),
    issuedAt: toTimestampInfo(issuedAtValue),
    notBefore: toTimestampInfo(notBeforeValue),
    expiresAt: toTimestampInfo(expiresAtValue),
    expired,
    notYetValid,
    active: !expired && !notYetValid,
    expiresInSeconds: expiresAtValue === null ? null : expiresAtValue - now,
    signaturePresent: decoded.signature.length > 0
  };
};

const jwtDecodeInputSchema = {
  type: 'object',
  required: ['token'],
  additionalProperties: false,
  properties: {
    token: { type: 'string' }
  }
} as const;

const timestampInfoSchema = {
  type: 'object',
  required: ['value', 'iso'],
  additionalProperties: false,
  properties: {
    value: { type: ['number', 'null'] },
    iso: { type: ['string', 'null'] }
  }
} as const;

const jwtDecodeOutputSchema = {
  type: 'object',
  required: ['header', 'payload', 'signature', 'headerText', 'payloadText'],
  additionalProperties: false,
  properties: {
    header: { type: ['object', 'array', 'string', 'number', 'boolean', 'null'] },
    payload: { type: ['object', 'array', 'string', 'number', 'boolean', 'null'] },
    signature: { type: 'string' },
    headerText: { type: 'string' },
    payloadText: { type: 'string' }
  }
} as const;

export const jwtTools: ToolboxTool[] = [
  {
    name: 'jwt.decode',
    title: 'Decode JWT',
    description: 'Decode JWT header and payload without verifying the signature.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: jwtDecodeInputSchema,
    outputSchema: jwtDecodeOutputSchema,
    execute: (input) => {
      try {
        return ok(decodeJwt(input as JwtDecodeInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'jwt.inspect',
    title: 'Inspect JWT',
    description: 'Decode JWT and inspect standard claims.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['token'],
      additionalProperties: false,
      properties: {
        token: { type: 'string' },
        currentDate: { type: 'string' },
        leewaySeconds: {
          type: 'number',
          minimum: 0,
          maximum: 3600
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'header',
        'payload',
        'signature',
        'headerText',
        'payloadText',
        'algorithm',
        'type',
        'issuer',
        'subject',
        'audience',
        'jwtId',
        'issuedAt',
        'notBefore',
        'expiresAt',
        'expired',
        'notYetValid',
        'active',
        'expiresInSeconds',
        'signaturePresent'
      ],
      additionalProperties: false,
      properties: {
        ...jwtDecodeOutputSchema.properties,
        algorithm: { type: ['string', 'null'] },
        type: { type: ['string', 'null'] },
        issuer: { type: ['string', 'null'] },
        subject: { type: ['string', 'null'] },
        audience: {
          type: ['object', 'array', 'string', 'number', 'boolean', 'null']
        },
        jwtId: { type: ['string', 'null'] },
        issuedAt: timestampInfoSchema,
        notBefore: timestampInfoSchema,
        expiresAt: timestampInfoSchema,
        expired: { type: 'boolean' },
        notYetValid: { type: 'boolean' },
        active: { type: 'boolean' },
        expiresInSeconds: { type: ['number', 'null'] },
        signaturePresent: { type: 'boolean' }
      }
    },
    execute: (input) => {
      try {
        return ok(inspectJwt(input as JwtInspectInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
