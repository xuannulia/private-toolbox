import { describe, expect, it } from 'vitest';
import {
  createJsonSchemaFromJson,
  createMockJsonFromSchema,
  validateJsonSchema,
  jsonSchemaTools
} from './jsonSchema';

const schemaText = JSON.stringify({
  type: 'object',
  required: ['name', 'age'],
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    age: { type: 'integer', minimum: 18 }
  }
});

describe('validateJsonSchema', () => {
  it('validates matching data', () => {
    const result = validateJsonSchema({
      dataText: JSON.stringify({ name: 'Ada', age: 36 }),
      schemaText
    });

    expect(result).toEqual({
      valid: true,
      errors: []
    });
  });

  it('returns structured schema validation errors', () => {
    const result = validateJsonSchema({
      dataText: JSON.stringify({ name: 'Ada', age: 17, extra: true }),
      schemaText
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.keyword)).toEqual([
      'additionalProperties',
      'minimum'
    ]);
  });

  it('throws for invalid schema JSON', () => {
    expect(() =>
      validateJsonSchema({
        dataText: '{}',
        schemaText: '{'
      })
    ).toThrow('Schema JSON');
  });
});

describe('createJsonSchemaFromJson', () => {
  it('infers an object schema from example JSON', () => {
    const result = createJsonSchemaFromJson({
      dataText: JSON.stringify({
        name: 'Ada',
        age: 36,
        active: true,
        tags: ['math', 'logic']
      })
    });

    expect(result.schema).toEqual({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' },
        active: { type: 'boolean' },
        tags: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      additionalProperties: false,
      required: ['name', 'age', 'active', 'tags']
    });
    expect(JSON.parse(result.schemaText)).toEqual(result.schema);
  });

  it('uses the intersection of object fields for array item required fields', () => {
    const result = createJsonSchemaFromJson({
      dataText: JSON.stringify([
        { id: 1, name: 'Ada' },
        { id: 2, email: 'ada@example.com' }
      ])
    });

    expect(result.schema).toEqual({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string' }
        },
        additionalProperties: false,
        required: ['id']
      }
    });
  });

  it('keeps mixed array item types as anyOf', () => {
    const result = createJsonSchemaFromJson({
      dataText: JSON.stringify([1, 'two', null])
    });

    expect(result.schema).toEqual({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'array',
      items: {
        anyOf: [{ type: 'integer' }, { type: 'string' }, { type: 'null' }]
      }
    });
  });

  it('can omit required fields and the schema dialect', () => {
    const result = createJsonSchemaFromJson({
      dataText: JSON.stringify({ name: 'Ada' }),
      requiredMode: 'none',
      includeSchemaDialect: false,
      additionalProperties: true
    });

    expect(result.schema).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string' }
      },
      additionalProperties: true
    });
  });

  it('throws for invalid source JSON', () => {
    expect(() =>
      createJsonSchemaFromJson({
        dataText: '{'
      })
    ).toThrow('Data JSON');
  });

  it('throws for invalid generation options', () => {
    expect(() =>
      createJsonSchemaFromJson({
        dataText: '{}',
        additionalProperties: 'false' as unknown as boolean
      })
    ).toThrow('additionalProperties must be a boolean');
  });
});

describe('createMockJsonFromSchema', () => {
  it('generates deterministic object data from a schema', () => {
    const result = createMockJsonFromSchema({
      schemaText,
      arrayItemCount: 2
    });

    expect(result.data).toEqual({
      name: 'string',
      age: 18
    });
    expect(JSON.parse(result.dataText)).toEqual(result.data);
    expect(
      validateJsonSchema({
        dataText: result.dataText,
        schemaText
      }).valid
    ).toBe(true);
  });

  it('can skip optional properties', () => {
    const result = createMockJsonFromSchema({
      schemaText: JSON.stringify({
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' },
          nickname: { type: 'string' }
        }
      }),
      includeOptionalProperties: false
    });

    expect(result.data).toEqual({
      id: 1
    });
  });

  it('generates arrays using arrayItemCount and nested item schemas', () => {
    const result = createMockJsonFromSchema({
      schemaText: JSON.stringify({
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            email: { type: 'string', format: 'email' }
          }
        }
      }),
      arrayItemCount: 2
    });

    expect(result.data).toEqual([
      { id: 1, email: 'user@example.com' },
      { id: 1, email: 'user@example.com' }
    ]);
  });

  it('uses const, enum, default, examples, and local refs', () => {
    const result = createMockJsonFromSchema({
      schemaText: JSON.stringify({
        $defs: {
          role: {
            enum: ['admin', 'user']
          }
        },
        type: 'object',
        properties: {
          version: { const: 1 },
          role: { $ref: '#/$defs/role' },
          enabled: { default: false },
          tag: { examples: ['demo'] }
        }
      })
    });

    expect(result.data).toEqual({
      version: 1,
      role: 'admin',
      enabled: false,
      tag: 'demo'
    });
  });

  it('uses the first anyOf or oneOf branch', () => {
    const result = createMockJsonFromSchema({
      schemaText: JSON.stringify({
        anyOf: [{ type: 'integer' }, { type: 'string' }]
      })
    });

    expect(result.data).toBe(1);
  });

  it('rejects invalid mock options', () => {
    expect(() =>
      createMockJsonFromSchema({
        schemaText: '{}',
        arrayItemCount: 21
      })
    ).toThrow('arrayItemCount must be an integer between 0 and 20');
  });

  it('registers json_schema.mock for Web, API, and MCP', async () => {
    const tool = jsonSchemaTools.find(
      (item) => item.name === 'json_schema.mock'
    );

    expect(tool?.channels).toEqual(['web', 'api', 'mcp']);
    const result = await tool?.execute({
      schemaText: JSON.stringify({ type: 'boolean' })
    });
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(result.result).toMatchObject({
        data: true,
        dataText: 'true'
      });
    }
  });
});
