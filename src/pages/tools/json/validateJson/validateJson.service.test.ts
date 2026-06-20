import { describe, expect, it } from 'vitest';
import { validateJson } from './service';

describe('validateJson', () => {
  it('marks valid JSON as valid', () => {
    expect(validateJson('{"name":"Alice","items":[1,2]}')).toEqual({
      valid: true
    });
  });

  it('returns an error message for invalid JSON', () => {
    const result = validateJson('{bad');

    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
