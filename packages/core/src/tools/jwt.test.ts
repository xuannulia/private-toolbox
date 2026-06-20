import { describe, expect, it } from 'vitest';
import { decodeJwt, inspectJwt } from './jwt';

const encodeBase64Url = (value: unknown) =>
  Buffer.from(JSON.stringify(value), 'utf8')
    .toString('base64url');

const createJwt = (payload: unknown, signature = 'signature') =>
  `${encodeBase64Url({ alg: 'HS256', typ: 'JWT' })}.${encodeBase64Url(
    payload
  )}.${signature}`;

describe('decodeJwt', () => {
  it('decodes header and payload without verifying signature', () => {
    const token = createJwt({
      iss: 'private-toolbox',
      sub: 'user-1'
    });

    expect(decodeJwt({ token })).toMatchObject({
      header: {
        alg: 'HS256',
        typ: 'JWT'
      },
      payload: {
        iss: 'private-toolbox',
        sub: 'user-1'
      },
      signature: 'signature'
    });
  });

  it('accepts Bearer-prefixed tokens', () => {
    const token = createJwt({ sub: 'user-1' });

    expect(decodeJwt({ token: `Bearer ${token}` }).payload).toEqual({
      sub: 'user-1'
    });
  });

  it('throws for malformed tokens', () => {
    expect(() => decodeJwt({ token: 'bad-token' })).toThrow(
      'three dot-separated parts'
    );
  });
});

describe('inspectJwt', () => {
  it('inspects standard claims and active state', () => {
    const token = createJwt({
      iss: 'private-toolbox',
      sub: 'user-1',
      aud: ['codex', 'claude'],
      jti: 'token-1',
      iat: 1781827200,
      nbf: 1781827200,
      exp: 1781913600
    });

    expect(
      inspectJwt({
        token,
        currentDate: '2026-06-19T12:00:00.000Z'
      })
    ).toMatchObject({
      algorithm: 'HS256',
      type: 'JWT',
      issuer: 'private-toolbox',
      subject: 'user-1',
      audience: ['codex', 'claude'],
      jwtId: 'token-1',
      issuedAt: {
        value: 1781827200,
        iso: '2026-06-19T00:00:00.000Z'
      },
      expiresAt: {
        value: 1781913600,
        iso: '2026-06-20T00:00:00.000Z'
      },
      expired: false,
      notYetValid: false,
      active: true,
      expiresInSeconds: 43200,
      signaturePresent: true
    });
  });

  it('marks expired and not-yet-valid tokens', () => {
    expect(
      inspectJwt({
        token: createJwt({ exp: 1781827199 }),
        currentDate: '2026-06-19T00:00:00.000Z'
      }).expired
    ).toBe(true);

    expect(
      inspectJwt({
        token: createJwt({ nbf: 1781827201 }),
        currentDate: '2026-06-19T00:00:00.000Z'
      }).notYetValid
    ).toBe(true);
  });
});
