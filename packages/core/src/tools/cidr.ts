import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type CidrCalculateInput = {
  cidr?: string;
  ip?: string;
  prefix?: number;
  includeBinary?: boolean;
};

export type CidrCalculateOutput = {
  version: 'ipv4';
  cidr: string;
  inputIp: string;
  prefix: number;
  subnetMask: string;
  wildcardMask: string;
  networkAddress: string;
  broadcastAddress: string;
  firstAddress: string;
  lastAddress: string;
  firstUsableHost: string;
  lastUsableHost: string;
  totalAddresses: number;
  usableHostCount: number;
  isPrivate: boolean;
  isLoopback: boolean;
  isLinkLocal: boolean;
  specialUse: string[];
  binary?: {
    inputIp: string;
    subnetMask: string;
    wildcardMask: string;
    networkAddress: string;
    broadcastAddress: string;
  };
};

const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

const parseIpv4 = (value: string): number => {
  const trimmed = value.trim();
  const match = trimmed.match(ipv4Pattern);
  if (!match) {
    throw new ToolboxError('CIDR_INVALID_IP', `Invalid IPv4 address: ${value}`);
  }

  const octets = match.slice(1).map((item) => Number(item));
  if (
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    throw new ToolboxError('CIDR_INVALID_IP', `Invalid IPv4 address: ${value}`);
  }

  return ((octets[0] * 256 + octets[1]) * 256 + octets[2]) * 256 + octets[3];
};

const ipv4ToString = (value: number): string =>
  [
    Math.floor(value / 0x1000000) % 256,
    Math.floor(value / 0x10000) % 256,
    Math.floor(value / 0x100) % 256,
    value % 256
  ].join('.');

const ipv4ToBinary = (value: number): string =>
  [
    Math.floor(value / 0x1000000) % 256,
    Math.floor(value / 0x10000) % 256,
    Math.floor(value / 0x100) % 256,
    value % 256
  ]
    .map((octet) => octet.toString(2).padStart(8, '0'))
    .join('.');

const parsePrefix = (value: unknown): number => {
  const prefix =
    typeof value === 'string' && value.trim() ? Number(value) : value;
  if (
    !Number.isInteger(prefix) ||
    (prefix as number) < 0 ||
    (prefix as number) > 32
  ) {
    throw new ToolboxError(
      'CIDR_INVALID_PREFIX',
      'CIDR prefix must be an integer between 0 and 32'
    );
  }

  return prefix as number;
};

const parseInput = ({
  cidr,
  ip,
  prefix
}: CidrCalculateInput): { ipText: string; prefix: number } => {
  const cidrText = cidr?.trim();
  if (cidrText) {
    const parts = cidrText.split('/');
    if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
      throw new ToolboxError(
        'CIDR_INVALID_INPUT',
        'CIDR input must look like 192.168.1.10/24'
      );
    }

    return {
      ipText: parts[0].trim(),
      prefix: parsePrefix(parts[1].trim())
    };
  }

  if (!ip?.trim()) {
    throw new ToolboxError('CIDR_IP_REQUIRED', 'IPv4 address is required');
  }

  return {
    ipText: ip.trim(),
    prefix: parsePrefix(prefix)
  };
};

const prefixToMask = (prefix: number): number =>
  prefix === 0 ? 0 : 0xffffffff - 2 ** (32 - prefix) + 1;

const isPrivateIpv4 = (value: number): boolean =>
  value >= parseIpv4('10.0.0.0') && value <= parseIpv4('10.255.255.255')
    ? true
    : value >= parseIpv4('172.16.0.0') && value <= parseIpv4('172.31.255.255')
      ? true
      : value >= parseIpv4('192.168.0.0') &&
        value <= parseIpv4('192.168.255.255');

const isLoopbackIpv4 = (value: number): boolean =>
  value >= parseIpv4('127.0.0.0') && value <= parseIpv4('127.255.255.255');

const isLinkLocalIpv4 = (value: number): boolean =>
  value >= parseIpv4('169.254.0.0') && value <= parseIpv4('169.254.255.255');

const specialUsesFor = (ipNumber: number, prefix: number): string[] => {
  const values: string[] = [];

  if (isPrivateIpv4(ipNumber)) values.push('private');
  if (isLoopbackIpv4(ipNumber)) values.push('loopback');
  if (isLinkLocalIpv4(ipNumber)) values.push('link-local');
  if (prefix === 31) values.push('point-to-point');
  if (prefix === 32) values.push('host-route');

  return values;
};

export const calculateCidr = (
  input: CidrCalculateInput
): CidrCalculateOutput => {
  const { ipText, prefix } = parseInput(input);
  const ipNumber = parseIpv4(ipText);
  const mask = prefixToMask(prefix);
  const wildcard = 0xffffffff - mask;
  const blockSize = 2 ** (32 - prefix);
  const network = Math.floor(ipNumber / blockSize) * blockSize;
  const broadcast = network + wildcard;
  const firstUsable = prefix < 31 ? network + 1 : network;
  const lastUsable = prefix < 31 ? broadcast - 1 : broadcast;
  const usableHostCount = prefix < 31 ? Math.max(blockSize - 2, 0) : blockSize;
  const result: CidrCalculateOutput = {
    version: 'ipv4',
    cidr: `${ipv4ToString(network)}/${prefix}`,
    inputIp: ipv4ToString(ipNumber),
    prefix,
    subnetMask: ipv4ToString(mask),
    wildcardMask: ipv4ToString(wildcard),
    networkAddress: ipv4ToString(network),
    broadcastAddress: ipv4ToString(broadcast),
    firstAddress: ipv4ToString(network),
    lastAddress: ipv4ToString(broadcast),
    firstUsableHost: ipv4ToString(firstUsable),
    lastUsableHost: ipv4ToString(lastUsable),
    totalAddresses: blockSize,
    usableHostCount,
    isPrivate: isPrivateIpv4(ipNumber),
    isLoopback: isLoopbackIpv4(ipNumber),
    isLinkLocal: isLinkLocalIpv4(ipNumber),
    specialUse: specialUsesFor(ipNumber, prefix)
  };

  if (input.includeBinary) {
    result.binary = {
      inputIp: ipv4ToBinary(ipNumber),
      subnetMask: ipv4ToBinary(mask),
      wildcardMask: ipv4ToBinary(wildcard),
      networkAddress: ipv4ToBinary(network),
      broadcastAddress: ipv4ToBinary(broadcast)
    };
  }

  return result;
};

export const cidrTools: ToolboxTool[] = [
  {
    name: 'cidr.calculate',
    title: 'CIDR Calculator',
    description: 'Calculate IPv4 CIDR network ranges, masks, and host counts.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        cidr: {
          type: 'string',
          description: 'IPv4 CIDR input such as 192.168.1.10/24'
        },
        ip: {
          type: 'string',
          description: 'IPv4 address when cidr is not provided'
        },
        prefix: {
          type: 'integer',
          minimum: 0,
          maximum: 32,
          description: 'CIDR prefix when cidr is not provided'
        },
        includeBinary: {
          type: 'boolean',
          default: false
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: [
        'version',
        'cidr',
        'inputIp',
        'prefix',
        'subnetMask',
        'wildcardMask',
        'networkAddress',
        'broadcastAddress',
        'firstAddress',
        'lastAddress',
        'firstUsableHost',
        'lastUsableHost',
        'totalAddresses',
        'usableHostCount',
        'isPrivate',
        'isLoopback',
        'isLinkLocal',
        'specialUse'
      ],
      additionalProperties: false,
      properties: {
        version: { type: 'string' },
        cidr: { type: 'string' },
        inputIp: { type: 'string' },
        prefix: { type: 'integer' },
        subnetMask: { type: 'string' },
        wildcardMask: { type: 'string' },
        networkAddress: { type: 'string' },
        broadcastAddress: { type: 'string' },
        firstAddress: { type: 'string' },
        lastAddress: { type: 'string' },
        firstUsableHost: { type: 'string' },
        lastUsableHost: { type: 'string' },
        totalAddresses: { type: 'number' },
        usableHostCount: { type: 'number' },
        isPrivate: { type: 'boolean' },
        isLoopback: { type: 'boolean' },
        isLinkLocal: { type: 'boolean' },
        specialUse: {
          type: 'array',
          items: { type: 'string' }
        },
        binary: { type: 'object' }
      }
    },
    execute: (input) => {
      try {
        return ok(calculateCidr((input ?? {}) as CidrCalculateInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
