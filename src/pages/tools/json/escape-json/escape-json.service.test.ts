import { describe, expect, it } from 'vitest';
import { escapeJson } from './service';

describe('escapeJson page service', () => {
  it('escapes JSON text without wrapping quotes by default', () => {
    expect(escapeJson('{"name":"Ada"}', false)).toBe('{\\"name\\":\\"Ada\\"}');
  });

  it('can wrap escaped text in quotes', () => {
    expect(escapeJson('line\nbreak', true)).toBe('"line\\nbreak"');
  });
});
