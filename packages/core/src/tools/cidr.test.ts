import { describe, expect, it } from 'vitest';
import { calculateCidr, cidrTools } from './cidr';

describe('calculateCidr', () => {
  it('calculates a private IPv4 /24 network from CIDR input', () => {
    expect(calculateCidr({ cidr: '192.168.1.10/24' })).toEqual({
      version: 'ipv4',
      cidr: '192.168.1.0/24',
      inputIp: '192.168.1.10',
      prefix: 24,
      subnetMask: '255.255.255.0',
      wildcardMask: '0.0.0.255',
      networkAddress: '192.168.1.0',
      broadcastAddress: '192.168.1.255',
      firstAddress: '192.168.1.0',
      lastAddress: '192.168.1.255',
      firstUsableHost: '192.168.1.1',
      lastUsableHost: '192.168.1.254',
      totalAddresses: 256,
      usableHostCount: 254,
      isPrivate: true,
      isLoopback: false,
      isLinkLocal: false,
      specialUse: ['private']
    });
  });

  it('supports IP and prefix fields when cidr is omitted', () => {
    expect(
      calculateCidr({
        ip: '203.0.113.44',
        prefix: 30
      })
    ).toMatchObject({
      cidr: '203.0.113.44/30',
      subnetMask: '255.255.255.252',
      wildcardMask: '0.0.0.3',
      networkAddress: '203.0.113.44',
      broadcastAddress: '203.0.113.47',
      firstUsableHost: '203.0.113.45',
      lastUsableHost: '203.0.113.46',
      totalAddresses: 4,
      usableHostCount: 2
    });
  });

  it('handles /31 point-to-point ranges', () => {
    expect(calculateCidr({ cidr: '198.51.100.8/31' })).toMatchObject({
      cidr: '198.51.100.8/31',
      firstUsableHost: '198.51.100.8',
      lastUsableHost: '198.51.100.9',
      totalAddresses: 2,
      usableHostCount: 2,
      specialUse: ['point-to-point']
    });
  });

  it('handles /32 host routes', () => {
    expect(calculateCidr({ cidr: '8.8.8.8/32' })).toMatchObject({
      cidr: '8.8.8.8/32',
      networkAddress: '8.8.8.8',
      broadcastAddress: '8.8.8.8',
      firstUsableHost: '8.8.8.8',
      lastUsableHost: '8.8.8.8',
      totalAddresses: 1,
      usableHostCount: 1,
      specialUse: ['host-route']
    });
  });

  it('can include binary output', () => {
    expect(
      calculateCidr({ cidr: '10.0.0.1/8', includeBinary: true }).binary
    ).toEqual({
      inputIp: '00001010.00000000.00000000.00000001',
      subnetMask: '11111111.00000000.00000000.00000000',
      wildcardMask: '00000000.11111111.11111111.11111111',
      networkAddress: '00001010.00000000.00000000.00000000',
      broadcastAddress: '00001010.11111111.11111111.11111111'
    });
  });

  it('rejects invalid IPv4 input', () => {
    expect(() => calculateCidr({ cidr: '300.1.1.1/24' })).toThrow(
      'Invalid IPv4 address'
    );
  });

  it('rejects invalid prefix input', () => {
    expect(() => calculateCidr({ cidr: '192.168.1.1/33' })).toThrow(
      'CIDR prefix must be an integer between 0 and 32'
    );
  });
});

describe('cidrTools', () => {
  it('registers cidr.calculate for Web, API, and MCP', () => {
    const tool = cidrTools.find((item) => item.name === 'cidr.calculate');

    expect(tool?.channels).toEqual(['web', 'api', 'mcp']);
    expect(tool?.risks).toEqual(['local']);
  });
});
