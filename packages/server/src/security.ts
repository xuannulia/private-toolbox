import dns from 'node:dns/promises';
import net from 'node:net';
import { ToolboxError } from '@private-toolbox/core';
import { mergeNetworkToolConfig, type NetworkToolConfig } from './config.js';

const hostnamePattern =
  /^(?=.{1,253}$)(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63}\.?$/;

const ipv4ToNumber = (ip: string): number => {
  const parts = ip.split('.').map((part) => Number(part));
  return (
    ((parts[0] << 24) >>> 0) +
    ((parts[1] << 16) >>> 0) +
    ((parts[2] << 8) >>> 0) +
    parts[3]
  );
};

const isIpv4InRange = (ip: string, base: string, prefixLength: number): boolean => {
  const ipNumber = ipv4ToNumber(ip);
  const baseNumber = ipv4ToNumber(base);
  const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;

  return (ipNumber & mask) === (baseNumber & mask);
};

export const isPrivateOrReservedIp = (ip: string): boolean => {
  const version = net.isIP(ip);
  if (version === 4) {
    const ranges: [string, number][] = [
      ['0.0.0.0', 8],
      ['10.0.0.0', 8],
      ['100.64.0.0', 10],
      ['127.0.0.0', 8],
      ['169.254.0.0', 16],
      ['172.16.0.0', 12],
      ['192.0.0.0', 24],
      ['192.0.2.0', 24],
      ['192.168.0.0', 16],
      ['198.18.0.0', 15],
      ['198.51.100.0', 24],
      ['203.0.113.0', 24],
      ['224.0.0.0', 4],
      ['240.0.0.0', 4]
    ];

    return ranges.some(([base, prefix]) => isIpv4InRange(ip, base, prefix));
  }

  if (version === 6) {
    const normalized = ip.toLowerCase();
    return (
      normalized === '::' ||
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    );
  }

  return false;
};

export const normalizeHostname = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new ToolboxError('INVALID_HOST', 'Host is required');
  }

  if (trimmed.includes('://')) {
    return new URL(trimmed).hostname;
  }

  return trimmed.split('/')[0].replace(/\.$/, '').toLowerCase();
};

export const assertValidHostnameOrIp = (input: string): string => {
  const host = normalizeHostname(input);

  if (net.isIP(host)) return host;
  if (!hostnamePattern.test(host)) {
    throw new ToolboxError('INVALID_HOST', `Invalid host: ${input}`);
  }

  return host;
};

export const assertPublicTarget = async (
  input: string,
  override?: Partial<NetworkToolConfig>
): Promise<{ host: string; addresses: string[] }> => {
  const config = mergeNetworkToolConfig(override);
  const host = assertValidHostnameOrIp(input);

  if (net.isIP(host)) {
    if (!config.allowPrivateNetworks && isPrivateOrReservedIp(host)) {
      throw new ToolboxError('PRIVATE_NETWORK_BLOCKED', `Private or reserved IP is blocked: ${host}`);
    }
    return { host, addresses: [host] };
  }

  const records = await dns.lookup(host, {
    all: true,
    verbatim: true
  });
  const addresses = records.map((record) => record.address);

  if (
    !config.allowPrivateNetworks &&
    addresses.some((address) => isPrivateOrReservedIp(address))
  ) {
    throw new ToolboxError('PRIVATE_NETWORK_BLOCKED', `Host resolves to a private or reserved address: ${host}`);
  }

  return { host, addresses };
};

export const assertPublicIpForLookup = (ip: string): string => {
  const normalized = ip.trim();
  if (!net.isIP(normalized)) {
    throw new ToolboxError('INVALID_IP', `Invalid IP address: ${ip}`);
  }

  if (isPrivateOrReservedIp(normalized)) {
    throw new ToolboxError('PRIVATE_NETWORK_BLOCKED', `Private or reserved IP is blocked: ${normalized}`);
  }

  return normalized;
};

export const inferRdapKind = (query: string): 'ip' | 'domain' => {
  if (net.isIP(query)) return 'ip';
  assertValidHostnameOrIp(query);
  return 'domain';
};
