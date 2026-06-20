import { describe, expect, it } from 'vitest';
import { createJsonTypesText } from './service';

describe('createJsonTypesText', () => {
  const sample = JSON.stringify([
    {
      id: 1,
      name: 'Ada',
      profile: {
        email: 'ada@example.test'
      }
    }
  ]);

  it('generates TypeScript interfaces', () => {
    const result = createJsonTypesText({
      text: sample,
      language: 'typescript',
      rootName: 'user'
    });

    expect(result).toContain('export interface User');
    expect(result).toContain('profile: UserProfile;');
  });

  it('generates Go structs', () => {
    const result = createJsonTypesText({
      text: sample,
      language: 'go',
      rootName: 'user'
    });

    expect(result).toContain('type User struct');
    expect(result).toContain('Profile UserProfile `json:"profile"`');
  });

  it('passes invalid JSON to the core validator', () => {
    expect(() =>
      createJsonTypesText({
        text: '{missing',
        language: 'typescript',
        rootName: 'Root'
      })
    ).toThrow('Expected property name');
  });
});
