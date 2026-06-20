import tls from 'node:tls';
import {
  type JsonValue,
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '@private-toolbox/core';
import { mergeNetworkToolConfig, type NetworkToolConfig } from '../config.js';
import { networkConfigFromContext } from '../context.js';
import { assertPublicTarget, assertValidHostnameOrIp } from '../security.js';

export type SslInspectInput = {
  host: string;
  port?: number;
  serverName?: string;
};

export type SslInspectOutput = {
  host: string;
  port: number;
  resolvedAddresses: string[];
  authorized: boolean;
  authorizationError: string | null;
  certificate: {
    subject: JsonValue;
    issuer: JsonValue;
    subjectAltName: string | null;
    validFrom: string;
    validTo: string;
    daysRemaining: number;
    fingerprint256: string;
    serialNumber: string;
    ca: boolean;
  };
};

const toJsonValue = (value: unknown): JsonValue => {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(toJsonValue);
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        toJsonValue(item)
      ])
    );
  }
  return String(value);
};

export const inspectSslCertificate = async (
  input: SslInspectInput,
  override?: Partial<NetworkToolConfig>
): Promise<SslInspectOutput> => {
  const config = mergeNetworkToolConfig(override);
  const port = input.port ?? 443;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ToolboxError('INVALID_PORT', `Invalid port: ${port}`);
  }

  const target = await assertPublicTarget(input.host, config);
  const serverName = input.serverName
    ? assertValidHostnameOrIp(input.serverName)
    : target.host;

  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host: target.host,
      port,
      servername: serverName,
      rejectUnauthorized: false
    });

    const timeout = setTimeout(() => {
      socket.destroy();
      reject(new ToolboxError('TLS_TIMEOUT', `TLS connection timed out after ${config.timeoutMs} ms`));
    }, config.timeoutMs);

    socket.once('secureConnect', () => {
      clearTimeout(timeout);
      const cert = socket.getPeerCertificate();
      socket.end();

      if (!cert || Object.keys(cert).length === 0) {
        reject(new ToolboxError('NO_CERTIFICATE', `No certificate received from ${target.host}:${port}`));
        return;
      }

      const validToMs = Date.parse(cert.valid_to);
      const daysRemaining = Math.ceil((validToMs - Date.now()) / 86_400_000);

      resolve({
        host: target.host,
        port,
        resolvedAddresses: target.addresses,
        authorized: socket.authorized,
        authorizationError: socket.authorizationError
          ? String(socket.authorizationError)
          : null,
        certificate: {
          subject: toJsonValue(cert.subject ?? {}),
          issuer: toJsonValue(cert.issuer ?? {}),
          subjectAltName: cert.subjectaltname ?? null,
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          daysRemaining,
          fingerprint256: cert.fingerprint256,
          serialNumber: cert.serialNumber,
          ca: cert.ca
        }
      });
    });

    socket.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
};

export const sslTools: ToolboxTool[] = [
  {
    name: 'ssl.inspect',
    title: 'Inspect SSL Certificate',
    description: 'Inspect the TLS certificate for a public host.',
    channels: ['api', 'mcp'],
    risks: ['network'],
    inputSchema: {
      type: 'object',
      required: ['host'],
      additionalProperties: false,
      properties: {
        host: { type: 'string' },
        port: { type: 'number', default: 443 },
        serverName: { type: 'string' }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['host', 'port', 'resolvedAddresses', 'authorized', 'certificate'],
      properties: {
        host: { type: 'string' },
        port: { type: 'number' },
        resolvedAddresses: { type: 'array' },
        authorized: { type: 'boolean' },
        authorizationError: { type: ['string', 'null'] },
        certificate: { type: 'object' }
      }
    },
    execute: async (input, context) => {
      try {
        return ok(await inspectSslCertificate(input as SslInspectInput, networkConfigFromContext(context)));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
