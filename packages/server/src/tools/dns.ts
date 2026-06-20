import dns from 'node:dns/promises';
import {
  type JsonValue,
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '@private-toolbox/core';
import { assertValidHostnameOrIp, normalizeHostname } from '../security.js';

export type DnsRecordType =
  | 'A'
  | 'AAAA'
  | 'CAA'
  | 'CNAME'
  | 'MX'
  | 'NS'
  | 'SOA'
  | 'SRV'
  | 'TXT'
  | 'ANY';

export type DnsLookupInput = {
  name: string;
  type?: DnsRecordType;
};

export type DnsLookupOutput = {
  name: string;
  type: DnsRecordType;
  records: JsonValue[];
};

const recordTypes: DnsRecordType[] = [
  'A',
  'AAAA',
  'CAA',
  'CNAME',
  'MX',
  'NS',
  'SOA',
  'SRV',
  'TXT',
  'ANY'
];

export const lookupDnsRecords = async ({
  name,
  type = 'A'
}: DnsLookupInput): Promise<DnsLookupOutput> => {
  const normalizedType = type.toUpperCase() as DnsRecordType;
  if (!recordTypes.includes(normalizedType)) {
    throw new ToolboxError('UNSUPPORTED_DNS_TYPE', `Unsupported DNS record type: ${type}`);
  }

  const normalizedName = normalizeHostname(name);
  assertValidHostnameOrIp(normalizedName);

  let records: unknown[];
  switch (normalizedType) {
    case 'A':
      records = await dns.resolve4(normalizedName, { ttl: true });
      break;
    case 'AAAA':
      records = await dns.resolve6(normalizedName, { ttl: true });
      break;
    case 'CAA':
      records = await dns.resolveCaa(normalizedName);
      break;
    case 'CNAME':
      records = await dns.resolveCname(normalizedName);
      break;
    case 'MX':
      records = await dns.resolveMx(normalizedName);
      break;
    case 'NS':
      records = await dns.resolveNs(normalizedName);
      break;
    case 'SOA':
      records = [await dns.resolveSoa(normalizedName)];
      break;
    case 'SRV':
      records = await dns.resolveSrv(normalizedName);
      break;
    case 'TXT':
      records = await dns.resolveTxt(normalizedName);
      break;
    case 'ANY':
      records = await dns.resolveAny(normalizedName);
      break;
  }

  return {
    name: normalizedName,
    type: normalizedType,
    records: records as JsonValue[]
  };
};

export const dnsTools: ToolboxTool[] = [
  {
    name: 'dns.lookup',
    title: 'DNS Lookup',
    description: 'Resolve DNS records for a hostname.',
    channels: ['api', 'mcp'],
    risks: ['network'],
    inputSchema: {
      type: 'object',
      required: ['name'],
      additionalProperties: false,
      properties: {
        name: { type: 'string' },
        type: {
          type: 'string',
          enum: recordTypes,
          default: 'A'
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['name', 'type', 'records'],
      properties: {
        name: { type: 'string' },
        type: { type: 'string' },
        records: { type: 'array' }
      }
    },
    execute: async (input) => {
      try {
        return ok(await lookupDnsRecords(input as DnsLookupInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
