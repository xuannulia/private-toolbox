import { describe, expect, it } from 'vitest';
import { calculateCidrText } from './service';

describe('calculateCidrText', () => {
  it('formats CIDR calculation output as JSON', () => {
    const result = JSON.parse(
      calculateCidrText({
        cidr: '192.168.10.5/24',
        includeBinary: false
      })
    );

    expect(result).toMatchObject({
      cidr: '192.168.10.0/24',
      subnetMask: '255.255.255.0',
      networkAddress: '192.168.10.0',
      broadcastAddress: '192.168.10.255',
      usableHostCount: 254
    });
  });

  it('includes binary fields when enabled', () => {
    const result = JSON.parse(
      calculateCidrText({
        cidr: '10.1.2.3/8',
        includeBinary: true
      })
    );

    expect(result.binary.subnetMask).toBe(
      '11111111.00000000.00000000.00000000'
    );
  });
});
