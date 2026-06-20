import { describe, expect, it } from 'vitest';
import { generateUuidText } from './service';

describe('generateUuidText', () => {
  it('generates one UUID by default', () => {
    expect(
      generateUuidText({
        count: '1',
        uppercase: false,
        removeDashes: false
      })
    ).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it('supports batch output and formatting options', () => {
    const result = generateUuidText({
      count: '3',
      uppercase: true,
      removeDashes: true
    });

    const lines = result.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines.every((line) => /^[0-9A-F]{32}$/.test(line))).toBe(true);
  });

  it('rejects invalid counts through the core validator', () => {
    expect(() =>
      generateUuidText({
        count: '0',
        uppercase: false,
        removeDashes: false
      })
    ).toThrow('UUID count must be an integer between 1 and 100');
  });

  it('treats an empty count as one UUID', () => {
    expect(
      generateUuidText({
        count: '',
        uppercase: false,
        removeDashes: false
      }).split('\n')
    ).toHaveLength(1);
  });
});
