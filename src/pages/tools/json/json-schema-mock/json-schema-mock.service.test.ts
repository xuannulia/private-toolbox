import { describe, expect, it } from 'vitest';
import { createJsonSchemaMockText } from './service';

describe('createJsonSchemaMockText', () => {
  it('creates mock JSON text from a schema', () => {
    const result = createJsonSchemaMockText({
      schemaText: JSON.stringify({
        type: 'object',
        properties: {
          name: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } }
        }
      }),
      arrayItemCount: '2',
      includeOptionalProperties: true
    });

    expect(JSON.parse(result)).toEqual({
      name: 'string',
      tags: ['string', 'string']
    });
  });

  it('passes invalid counts to the core validator', () => {
    expect(() =>
      createJsonSchemaMockText({
        schemaText: '{}',
        arrayItemCount: '21',
        includeOptionalProperties: true
      })
    ).toThrow('arrayItemCount must be an integer between 0 and 20');
  });
});
