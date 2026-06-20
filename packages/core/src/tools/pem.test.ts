import { describe, expect, it } from 'vitest';
import { generateRsaKeyPair } from './rsa';
import { inspectPem, pemTools } from './pem';

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

const lengthBytes = (length: number): Uint8Array => {
  if (length < 0x80) return new Uint8Array([length]);

  const bytes: number[] = [];
  let remaining = length;

  while (remaining > 0) {
    bytes.unshift(remaining & 0xff);
    remaining >>= 8;
  }

  return new Uint8Array([0x80 | bytes.length, ...bytes]);
};

const der = (tag: number, content: Uint8Array): Uint8Array =>
  concatBytes(new Uint8Array([tag]), lengthBytes(content.length), content);

const seq = (...parts: Uint8Array[]): Uint8Array =>
  der(0x30, concatBytes(...parts));
const set = (...parts: Uint8Array[]): Uint8Array =>
  der(0x31, concatBytes(...parts));
const octet = (value: Uint8Array): Uint8Array => der(0x04, value);
const bitString = (value: Uint8Array): Uint8Array =>
  der(0x03, concatBytes(new Uint8Array([0]), value));
const bool = (value: boolean): Uint8Array =>
  der(0x01, new Uint8Array([value ? 0xff : 0]));
const integer = (value: number[] | Uint8Array): Uint8Array => {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  const padded =
    bytes[0] !== undefined && bytes[0] >= 0x80
      ? concatBytes(new Uint8Array([0]), bytes)
      : bytes;

  return der(0x02, padded);
};
const utf8 = (value: string): Uint8Array =>
  der(0x0c, new TextEncoder().encode(value));
const utcTime = (value: string): Uint8Array =>
  der(0x17, new TextEncoder().encode(value));
const context = (tag: number, content: Uint8Array): Uint8Array =>
  der(0xa0 | tag, content);
const contextPrimitive = (tag: number, content: Uint8Array): Uint8Array =>
  der(0x80 | tag, content);

const oidBody = (value: string): Uint8Array => {
  const parts = value.split('.').map(Number);
  const first = parts[0] * 40 + parts[1];
  const bytes = [first];

  for (const part of parts.slice(2)) {
    const stack = [part & 0x7f];
    let remaining = part >> 7;

    while (remaining > 0) {
      stack.unshift(0x80 | (remaining & 0x7f));
      remaining >>= 7;
    }

    bytes.push(...stack);
  }

  return new Uint8Array(bytes);
};

const oid = (value: string): Uint8Array => der(0x06, oidBody(value));

const bytesToPem = (label: string, bytes: Uint8Array): string => {
  const base64 = Buffer.from(bytes).toString('base64');
  const lines = base64.match(/.{1,64}/g) ?? [];

  return [`-----BEGIN ${label}-----`, ...lines, `-----END ${label}-----`].join(
    '\n'
  );
};

const name = (commonName: string): Uint8Array =>
  seq(set(seq(oid('2.5.4.3'), utf8(commonName))));

const rsaAlgorithm = (): Uint8Array =>
  seq(oid('1.2.840.113549.1.1.1'), der(0x05, new Uint8Array()));

const sha256WithRsa = (): Uint8Array =>
  seq(oid('1.2.840.113549.1.1.11'), der(0x05, new Uint8Array()));

const rsaPublicKey = (): Uint8Array =>
  seq(
    integer([
      0xc5, 0x41, 0x13, 0x89, 0x9d, 0xa8, 0x8a, 0xf9, 0x5d, 0x7e, 0xb4, 0x8f,
      0x13, 0x93, 0xd9, 0x3f
    ]),
    integer([0x01, 0x00, 0x01])
  );

const subjectPublicKeyInfo = (): Uint8Array =>
  seq(rsaAlgorithm(), bitString(rsaPublicKey()));

const subjectAltNameExtension = (): Uint8Array =>
  seq(
    oid('2.5.29.17'),
    octet(
      seq(
        contextPrimitive(2, new TextEncoder().encode('example.test')),
        contextPrimitive(7, new Uint8Array([127, 0, 0, 1]))
      )
    )
  );

const basicConstraintsExtension = (): Uint8Array =>
  seq(oid('2.5.29.19'), bool(true), octet(seq(bool(true))));

const syntheticCertificatePem = (): string => {
  const tbs = seq(
    context(0, integer([2])),
    integer([1, 2, 3]),
    sha256WithRsa(),
    name('Example CA'),
    seq(utcTime('260101000000Z'), utcTime('270101000000Z')),
    name('example.test'),
    subjectPublicKeyInfo(),
    context(3, seq(basicConstraintsExtension(), subjectAltNameExtension()))
  );

  return bytesToPem(
    'CERTIFICATE',
    seq(tbs, sha256WithRsa(), bitString(new Uint8Array([1, 2, 3])))
  );
};

const syntheticCsrPem = (): string => {
  const extensionRequest = seq(
    oid('1.2.840.113549.1.9.14'),
    set(seq(subjectAltNameExtension()))
  );
  const requestInfo = seq(
    integer([0]),
    name('service.example'),
    subjectPublicKeyInfo(),
    context(0, extensionRequest)
  );

  return bytesToPem(
    'CERTIFICATE REQUEST',
    seq(requestInfo, sha256WithRsa(), bitString(new Uint8Array([1, 2, 3])))
  );
};

describe('inspectPem', () => {
  it('inspects generated RSA private and public key blocks', async () => {
    const keyPair = await generateRsaKeyPair();
    const result = await inspectPem({
      pem: `${keyPair.privateKeyPem}\n${keyPair.publicKeyPem}`
    });

    expect(result.blockCount).toBe(2);
    expect(result.blocks[0]).toMatchObject({
      label: 'PRIVATE KEY',
      type: 'private_key',
      details: {
        format: 'pkcs8',
        modulusLength: 2048,
        publicExponent: '65537'
      },
      warnings: []
    });
    expect(result.blocks[1]).toMatchObject({
      label: 'PUBLIC KEY',
      type: 'public_key',
      details: {
        algorithm: {
          oid: '1.2.840.113549.1.1.1',
          name: 'rsaEncryption'
        },
        rsa: {
          modulusLength: 2048,
          publicExponent: '65537'
        }
      }
    });
    expect(result.blocks[0].fingerprintSha256).toMatch(/^[0-9A-F:]{95}$/);
  });

  it('inspects X.509 certificate metadata', async () => {
    const result = await inspectPem({ pem: syntheticCertificatePem() });
    const certificate = result.blocks[0];

    expect(certificate).toMatchObject({
      label: 'CERTIFICATE',
      type: 'x509_certificate',
      details: {
        version: 3,
        serialNumberHex: '01:02:03',
        subject: {
          text: 'CN=example.test'
        },
        issuer: {
          text: 'CN=Example CA'
        },
        publicKey: {
          algorithm: {
            name: 'rsaEncryption'
          },
          rsa: {
            publicExponent: '65537'
          }
        }
      }
    });
    expect(certificate.details.subjectAltNames).toEqual([
      { type: 'dns', value: 'example.test' },
      { type: 'ip', value: '127.0.0.1' }
    ]);
  });

  it('inspects certificate signing requests', async () => {
    const result = await inspectPem({ pem: syntheticCsrPem() });
    const csr = result.blocks[0];

    expect(csr).toMatchObject({
      label: 'CERTIFICATE REQUEST',
      type: 'certificate_request',
      details: {
        version: 0,
        subject: {
          text: 'CN=service.example'
        },
        signatureAlgorithm: {
          name: 'sha256WithRSAEncryption'
        }
      }
    });
    expect(csr.details.subjectAltNames).toEqual([
      { type: 'dns', value: 'example.test' },
      { type: 'ip', value: '127.0.0.1' }
    ]);
  });

  it('rejects input without PEM blocks', async () => {
    await expect(inspectPem({ pem: 'not pem' })).rejects.toThrow(
      'No PEM blocks were found'
    );
  });
});

describe('pemTools', () => {
  it('registers pem.inspect for Web, API, and MCP', () => {
    expect(
      pemTools.find((tool) => tool.name === 'pem.inspect')?.channels
    ).toEqual(['web', 'api', 'mcp']);
  });
});
