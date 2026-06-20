import { describe, expect, it } from 'vitest';
import { generateUuid, generateUuids, uuidTools } from './uuid';

const uuidV4Pattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('generateUuid', () => {
  it('generates a UUID v4', () => {
    expect(generateUuid()).toMatch(uuidV4Pattern);
  });

  it('can uppercase and remove dashes', () => {
    expect(
      generateUuid({
        uppercase: true,
        removeDashes: true
      })
    ).toMatch(/^[0-9A-F]{32}$/);
  });
});

describe('generateUuids', () => {
  it('generates a batch and keeps the first value as uuid', () => {
    const result = generateUuids({
      count: 3
    });

    expect(result.uuids).toHaveLength(3);
    expect(result.uuid).toBe(result.uuids[0]);
    expect(new Set(result.uuids).size).toBe(3);
  });

  it('rejects invalid counts', () => {
    expect(() => generateUuids({ count: 0 })).toThrow(
      'UUID count must be an integer between 1 and 100'
    );
    expect(() => generateUuids({ count: 101 })).toThrow(
      'UUID count must be an integer between 1 and 100'
    );
  });

  it('registers uuid.generate for Web, API, and MCP', async () => {
    const tool = uuidTools.find((item) => item.name === 'uuid.generate');
    expect(tool?.channels).toEqual(['web', 'api', 'mcp']);

    const result = await tool?.execute({
      count: 2,
      uppercase: true,
      removeDashes: true
    });
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      const output = result.result as unknown as {
        uuid: string;
        uuids: string[];
      };

      expect(output.uuids).toHaveLength(2);
      expect(output.uuid).toMatch(/^[0-9A-F]{32}$/);
    }
  });
});
