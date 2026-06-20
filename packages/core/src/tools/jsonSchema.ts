import { Ajv, type AnySchema, type ErrorObject } from 'ajv';
import {
  type JsonValue,
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type JsonSchemaValidateInput = {
  dataText: string;
  schemaText: string;
};

export type JsonSchemaFromJsonInput = {
  dataText: string;
  additionalProperties?: boolean;
  requiredMode?: 'all' | 'none';
  includeSchemaDialect?: boolean;
};

export type JsonSchemaMockInput = {
  schemaText: string;
  arrayItemCount?: number;
  includeOptionalProperties?: boolean;
};

export type JsonSchemaValidationError = {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  message: string;
  params: JsonValue;
};

export type JsonSchemaValidateOutput = {
  valid: boolean;
  errors: JsonSchemaValidationError[];
};

export type JsonSchemaFromJsonOutput = {
  schema: { [key: string]: JsonValue };
  schemaText: string;
};

export type JsonSchemaMockOutput = {
  data: JsonValue;
  dataText: string;
};

type InferredSchema = { [key: string]: JsonValue };

type JsonSchemaInferOptions = {
  additionalProperties: boolean;
  requiredMode: 'all' | 'none';
  includeSchemaDialect: boolean;
};

type JsonSchemaMockOptions = {
  arrayItemCount: number;
  includeOptionalProperties: boolean;
};

type JsonSchemaMockContext = {
  rootSchema: InferredSchema;
  options: JsonSchemaMockOptions;
};

const schemaDialect = 'https://json-schema.org/draft/2020-12/schema';

const parseJsonValue = (text: string, label: string): JsonValue => {
  if (typeof text !== 'string') {
    throw new ToolboxError('INVALID_JSON', `${label}: expected a string`);
  }

  try {
    return JSON.parse(text) as JsonValue;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON';
    throw new ToolboxError('INVALID_JSON', `${label}: ${message}`);
  }
};

const toJsonValue = (value: unknown): JsonValue => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(toJsonValue);
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        toJsonValue(item)
      ])
    );
  }

  return String(value);
};

const normalizeErrorObject = (
  error: ErrorObject
): JsonSchemaValidationError => ({
  instancePath: error.instancePath,
  schemaPath: error.schemaPath,
  keyword: error.keyword,
  message: error.message ?? 'Validation error',
  params: toJsonValue(error.params)
});

const normalizeInferOptions = (
  input: JsonSchemaFromJsonInput
): JsonSchemaInferOptions => {
  if (
    input.requiredMode !== undefined &&
    input.requiredMode !== 'all' &&
    input.requiredMode !== 'none'
  ) {
    throw new ToolboxError(
      'INVALID_JSON_SCHEMA_OPTION',
      `Unsupported requiredMode: ${input.requiredMode}`
    );
  }
  if (
    input.additionalProperties !== undefined &&
    typeof input.additionalProperties !== 'boolean'
  ) {
    throw new ToolboxError(
      'INVALID_JSON_SCHEMA_OPTION',
      'additionalProperties must be a boolean'
    );
  }
  if (
    input.includeSchemaDialect !== undefined &&
    typeof input.includeSchemaDialect !== 'boolean'
  ) {
    throw new ToolboxError(
      'INVALID_JSON_SCHEMA_OPTION',
      'includeSchemaDialect must be a boolean'
    );
  }

  return {
    additionalProperties: input.additionalProperties ?? false,
    requiredMode: input.requiredMode ?? 'all',
    includeSchemaDialect: input.includeSchemaDialect ?? true
  };
};

const getSchemaType = (schema: InferredSchema): string | undefined =>
  typeof schema.type === 'string' ? schema.type : undefined;

const isEmptySchema = (schema: InferredSchema): boolean =>
  Object.keys(schema).length === 0;

const uniqueSchemas = (schemas: InferredSchema[]): InferredSchema[] => {
  const seen = new Set<string>();
  const result: InferredSchema[] = [];

  for (const schema of schemas) {
    const key = JSON.stringify(schema);
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(schema);
  }

  return result;
};

const toSchemaRecord = (value: JsonValue | undefined): InferredSchema =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as InferredSchema)
    : {};

const getStringArray = (value: JsonValue | undefined): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];

const cloneJsonValue = (value: JsonValue): JsonValue =>
  JSON.parse(JSON.stringify(value)) as JsonValue;

const normalizeMockOptions = (
  input: JsonSchemaMockInput
): JsonSchemaMockOptions => {
  if (
    input.arrayItemCount !== undefined &&
    (!Number.isInteger(input.arrayItemCount) ||
      input.arrayItemCount < 0 ||
      input.arrayItemCount > 20)
  ) {
    throw new ToolboxError(
      'INVALID_JSON_SCHEMA_OPTION',
      'arrayItemCount must be an integer between 0 and 20'
    );
  }
  if (
    input.includeOptionalProperties !== undefined &&
    typeof input.includeOptionalProperties !== 'boolean'
  ) {
    throw new ToolboxError(
      'INVALID_JSON_SCHEMA_OPTION',
      'includeOptionalProperties must be a boolean'
    );
  }

  return {
    arrayItemCount: input.arrayItemCount ?? 1,
    includeOptionalProperties: input.includeOptionalProperties ?? true
  };
};

const mergeObjectSchemas = (
  schemas: InferredSchema[],
  options: JsonSchemaInferOptions
): InferredSchema => {
  const propertyNames: string[] = [];
  const propertyNameSet = new Set<string>();
  const requiredSets = schemas.map(
    (schema) => new Set(getStringArray(schema.required))
  );

  for (const schema of schemas) {
    const properties = toSchemaRecord(schema.properties);
    for (const propertyName of Object.keys(properties)) {
      if (propertyNameSet.has(propertyName)) continue;

      propertyNameSet.add(propertyName);
      propertyNames.push(propertyName);
    }
  }

  const properties = Object.fromEntries(
    propertyNames.map((propertyName) => {
      const propertySchemas = schemas
        .map((schema) => toSchemaRecord(schema.properties)[propertyName])
        .filter((schema): schema is InferredSchema => {
          return (
            schema !== undefined &&
            schema !== null &&
            typeof schema === 'object' &&
            !Array.isArray(schema)
          );
        });

      return [propertyName, mergeSchemas(propertySchemas, options)];
    })
  );

  const schema: InferredSchema = {
    type: 'object',
    properties: properties as JsonValue,
    additionalProperties: options.additionalProperties
  };

  if (options.requiredMode === 'all') {
    const required = propertyNames.filter((propertyName) =>
      requiredSets.every((requiredSet) => requiredSet.has(propertyName))
    );

    if (required.length > 0) {
      schema.required = required;
    }
  }

  return schema;
};

const mergeArraySchemas = (
  schemas: InferredSchema[],
  options: JsonSchemaInferOptions
): InferredSchema => {
  const itemSchemas = schemas
    .map((schema) => toSchemaRecord(schema.items))
    .filter((schema) => !isEmptySchema(schema));

  return {
    type: 'array',
    items:
      itemSchemas.length > 0
        ? (mergeSchemas(itemSchemas, options) as JsonValue)
        : {}
  };
};

const mergeSchemas = (
  schemas: InferredSchema[],
  options: JsonSchemaInferOptions
): InferredSchema => {
  const expandedSchemas = uniqueSchemas(
    schemas.flatMap((schema) => {
      const anyOf = schema.anyOf;
      return Array.isArray(anyOf)
        ? anyOf.map(toSchemaRecord).filter((item) => !isEmptySchema(item))
        : [schema];
    })
  );

  if (expandedSchemas.length === 0) return {};
  if (expandedSchemas.length === 1) return expandedSchemas[0];

  const schemaTypes = expandedSchemas.map(getSchemaType);

  if (
    schemaTypes.every(
      (schemaType) => schemaType === 'integer' || schemaType === 'number'
    )
  ) {
    return {
      type: schemaTypes.includes('number') ? 'number' : 'integer'
    };
  }

  const firstType = schemaTypes[0];
  if (
    firstType &&
    schemaTypes.every((schemaType) => schemaType === firstType)
  ) {
    if (firstType === 'object') {
      return mergeObjectSchemas(expandedSchemas, options);
    }

    if (firstType === 'array') {
      return mergeArraySchemas(expandedSchemas, options);
    }

    return expandedSchemas[0];
  }

  return {
    anyOf: expandedSchemas as JsonValue
  };
};

const inferSchemaFromValue = (
  value: JsonValue,
  options: JsonSchemaInferOptions
): InferredSchema => {
  if (value === null) return { type: 'null' };

  if (Array.isArray(value)) {
    const itemSchemas = value.map((item) =>
      inferSchemaFromValue(item, options)
    );

    return {
      type: 'array',
      items:
        itemSchemas.length > 0
          ? (mergeSchemas(itemSchemas, options) as JsonValue)
          : {}
    };
  }

  switch (typeof value) {
    case 'string':
      return { type: 'string' };
    case 'number':
      return { type: Number.isInteger(value) ? 'integer' : 'number' };
    case 'boolean':
      return { type: 'boolean' };
    case 'object': {
      const properties = Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          inferSchemaFromValue(item, options)
        ])
      );
      const keys = Object.keys(properties);
      const schema: InferredSchema = {
        type: 'object',
        properties: properties as JsonValue,
        additionalProperties: options.additionalProperties
      };

      if (options.requiredMode === 'all' && keys.length > 0) {
        schema.required = keys;
      }

      return schema;
    }
    default:
      return {};
  }
};

const decodePointerSegment = (segment: string): string =>
  segment.replace(/~1/g, '/').replace(/~0/g, '~');

const resolveLocalRef = (
  rootSchema: InferredSchema,
  ref: string
): InferredSchema => {
  if (!ref.startsWith('#')) {
    throw new ToolboxError(
      'JSON_SCHEMA_REF_UNSUPPORTED',
      `Only local JSON Schema refs are supported: ${ref}`
    );
  }

  if (ref === '#') return rootSchema;
  if (!ref.startsWith('#/')) {
    throw new ToolboxError(
      'JSON_SCHEMA_REF_INVALID',
      `Invalid JSON Schema ref: ${ref}`
    );
  }

  let cursor: JsonValue = rootSchema;
  for (const rawSegment of ref.slice(2).split('/')) {
    const segment = decodePointerSegment(rawSegment);
    if (
      cursor === null ||
      typeof cursor !== 'object' ||
      Array.isArray(cursor) ||
      !(segment in cursor)
    ) {
      throw new ToolboxError(
        'JSON_SCHEMA_REF_NOT_FOUND',
        `JSON Schema ref not found: ${ref}`
      );
    }

    cursor = cursor[segment];
  }

  if (cursor === null || typeof cursor !== 'object' || Array.isArray(cursor)) {
    throw new ToolboxError(
      'JSON_SCHEMA_REF_INVALID',
      `JSON Schema ref does not point to an object schema: ${ref}`
    );
  }

  return cursor as InferredSchema;
};

const firstJsonArrayValue = (
  value: JsonValue | undefined
): JsonValue | undefined =>
  Array.isArray(value) && value.length > 0 ? value[0] : undefined;

const getPreferredSchemaType = (schema: InferredSchema): string => {
  const rawType = schema.type;
  if (typeof rawType === 'string') return rawType;
  if (Array.isArray(rawType)) {
    const firstNonNull = rawType.find(
      (item): item is string => typeof item === 'string' && item !== 'null'
    );
    if (firstNonNull) return firstNonNull;

    const firstType = rawType.find(
      (item): item is string => typeof item === 'string'
    );
    if (firstType) return firstType;
  }

  if (schema.properties !== undefined) return 'object';
  if (schema.items !== undefined) return 'array';
  if (schema.minimum !== undefined || schema.maximum !== undefined)
    return 'number';

  return 'string';
};

const numberFromSchema = (schema: InferredSchema, integer: boolean): number => {
  const minimum =
    typeof schema.minimum === 'number' ? schema.minimum : undefined;
  const maximum =
    typeof schema.maximum === 'number' ? schema.maximum : undefined;
  const exclusiveMinimum =
    typeof schema.exclusiveMinimum === 'number'
      ? schema.exclusiveMinimum
      : undefined;
  const exclusiveMaximum =
    typeof schema.exclusiveMaximum === 'number'
      ? schema.exclusiveMaximum
      : undefined;
  let value = minimum ?? exclusiveMinimum ?? 1;

  if (exclusiveMinimum !== undefined && value <= exclusiveMinimum) {
    value = exclusiveMinimum + 1;
  }
  if (maximum !== undefined && value > maximum) value = maximum;
  if (exclusiveMaximum !== undefined && value >= exclusiveMaximum) {
    value = exclusiveMaximum - 1;
  }
  if (integer) value = Math.trunc(value);

  return value;
};

const stringFromSchema = (schema: InferredSchema): string => {
  if (typeof schema.pattern === 'string') return 'string';
  if (typeof schema.minLength === 'number' && schema.minLength > 6) {
    return 'x'.repeat(Math.min(schema.minLength, 100));
  }
  if (schema.format === 'email') return 'user@example.com';
  if (schema.format === 'uri' || schema.format === 'url') {
    return 'https://example.com';
  }
  if (schema.format === 'date-time') return '2025-01-01T00:00:00.000Z';
  if (schema.format === 'date') return '2025-01-01';
  if (schema.format === 'time') return '00:00:00';
  if (schema.format === 'uuid') return '00000000-0000-4000-8000-000000000000';

  return 'string';
};

const mergeMockValues = (values: JsonValue[]): JsonValue => {
  const objectValues = values.filter(
    (value): value is { [key: string]: JsonValue } =>
      value !== null && typeof value === 'object' && !Array.isArray(value)
  );

  if (objectValues.length === values.length) {
    return Object.assign({}, ...objectValues) as JsonValue;
  }

  return values.find((value) => value !== null) ?? null;
};

const generateMockFromSchema = (
  schemaInput: InferredSchema,
  context: JsonSchemaMockContext,
  depth = 0,
  refStack: string[] = []
): JsonValue => {
  if (depth > 24) {
    throw new ToolboxError(
      'JSON_SCHEMA_TOO_DEEP',
      'JSON Schema is too deeply nested to mock safely'
    );
  }

  const ref = schemaInput.$ref;
  if (typeof ref === 'string') {
    if (refStack.includes(ref)) {
      throw new ToolboxError(
        'JSON_SCHEMA_REF_CYCLE',
        `Circular JSON Schema ref is not supported: ${ref}`
      );
    }

    return generateMockFromSchema(
      resolveLocalRef(context.rootSchema, ref),
      context,
      depth + 1,
      [...refStack, ref]
    );
  }

  if ('const' in schemaInput)
    return cloneJsonValue(schemaInput.const as JsonValue);
  if (Array.isArray(schemaInput.enum) && schemaInput.enum.length > 0) {
    return cloneJsonValue(schemaInput.enum[0] as JsonValue);
  }
  if ('default' in schemaInput)
    return cloneJsonValue(schemaInput.default as JsonValue);

  const example = firstJsonArrayValue(schemaInput.examples);
  if (example !== undefined) return cloneJsonValue(example);

  if (Array.isArray(schemaInput.allOf) && schemaInput.allOf.length > 0) {
    return mergeMockValues(
      schemaInput.allOf.map((item) =>
        generateMockFromSchema(
          toSchemaRecord(item),
          context,
          depth + 1,
          refStack
        )
      )
    );
  }

  if (Array.isArray(schemaInput.oneOf) && schemaInput.oneOf.length > 0) {
    return generateMockFromSchema(
      toSchemaRecord(schemaInput.oneOf[0]),
      context,
      depth + 1,
      refStack
    );
  }

  if (Array.isArray(schemaInput.anyOf) && schemaInput.anyOf.length > 0) {
    return generateMockFromSchema(
      toSchemaRecord(schemaInput.anyOf[0]),
      context,
      depth + 1,
      refStack
    );
  }

  const type = getPreferredSchemaType(schemaInput);

  switch (type) {
    case 'null':
      return null;
    case 'boolean':
      return true;
    case 'integer':
      return numberFromSchema(schemaInput, true);
    case 'number':
      return numberFromSchema(schemaInput, false);
    case 'array': {
      const minItems =
        typeof schemaInput.minItems === 'number' ? schemaInput.minItems : 0;
      const maxItems =
        typeof schemaInput.maxItems === 'number'
          ? schemaInput.maxItems
          : undefined;
      const count = Math.max(minItems, context.options.arrayItemCount);
      const safeCount = Math.max(0, Math.min(maxItems ?? count, count, 20));
      const itemSchema = toSchemaRecord(schemaInput.items);

      return Array.from({ length: safeCount }, () =>
        generateMockFromSchema(itemSchema, context, depth + 1, refStack)
      );
    }
    case 'object': {
      const properties = toSchemaRecord(schemaInput.properties);
      const required = new Set(getStringArray(schemaInput.required));
      const keys = Object.keys(properties).filter(
        (key) => context.options.includeOptionalProperties || required.has(key)
      );

      return Object.fromEntries(
        keys.map((key) => [
          key,
          generateMockFromSchema(
            toSchemaRecord(properties[key]),
            context,
            depth + 1,
            refStack
          )
        ])
      ) as JsonValue;
    }
    case 'string':
    default:
      return stringFromSchema(schemaInput);
  }
};

export const validateJsonSchema = ({
  dataText,
  schemaText
}: JsonSchemaValidateInput): JsonSchemaValidateOutput => {
  const data = parseJsonValue(dataText, 'Data JSON');
  const schema = parseJsonValue(schemaText, 'Schema JSON');
  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    verbose: true,
    validateFormats: false
  });

  try {
    const validate = ajv.compile(schema as AnySchema);
    const validationResult = validate(data);

    if (typeof validationResult !== 'boolean') {
      throw new ToolboxError(
        'ASYNC_JSON_SCHEMA_UNSUPPORTED',
        'Async JSON Schema validation is not supported'
      );
    }

    return {
      valid: validationResult,
      errors: (validate.errors ?? []).map(normalizeErrorObject)
    };
  } catch (error) {
    if (error instanceof ToolboxError) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : 'Invalid JSON Schema';
    throw new ToolboxError('INVALID_JSON_SCHEMA', message);
  }
};

export const createJsonSchemaFromJson = (
  input: JsonSchemaFromJsonInput
): JsonSchemaFromJsonOutput => {
  const data = parseJsonValue(input.dataText, 'Data JSON');
  const options = normalizeInferOptions(input);
  const inferredSchema = inferSchemaFromValue(data, options);
  const schema = options.includeSchemaDialect
    ? {
        $schema: schemaDialect,
        ...inferredSchema
      }
    : inferredSchema;

  return {
    schema,
    schemaText: JSON.stringify(schema, null, 2)
  };
};

export const createMockJsonFromSchema = (
  input: JsonSchemaMockInput
): JsonSchemaMockOutput => {
  const schema = parseJsonValue(input.schemaText, 'Schema JSON');
  if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) {
    throw new ToolboxError(
      'INVALID_JSON_SCHEMA',
      'Schema JSON must be an object'
    );
  }

  const ajv = new Ajv({
    strict: false,
    validateFormats: false
  });
  try {
    ajv.compile(schema as AnySchema);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Invalid JSON Schema';
    throw new ToolboxError('INVALID_JSON_SCHEMA', message);
  }

  const data = generateMockFromSchema(schema as InferredSchema, {
    rootSchema: schema as InferredSchema,
    options: normalizeMockOptions(input)
  });

  return {
    data,
    dataText: JSON.stringify(data, null, 2)
  };
};

export const jsonSchemaTools: ToolboxTool[] = [
  {
    name: 'json_schema.validate',
    title: 'Validate JSON Schema',
    description: 'Validate JSON data against a JSON Schema.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['dataText', 'schemaText'],
      additionalProperties: false,
      properties: {
        dataText: { type: 'string' },
        schemaText: { type: 'string' }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['valid', 'errors'],
      additionalProperties: false,
      properties: {
        valid: { type: 'boolean' },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'instancePath',
              'schemaPath',
              'keyword',
              'message',
              'params'
            ],
            additionalProperties: false,
            properties: {
              instancePath: { type: 'string' },
              schemaPath: { type: 'string' },
              keyword: { type: 'string' },
              message: { type: 'string' },
              params: { type: 'object' }
            }
          }
        }
      }
    },
    execute: (input) => {
      try {
        return ok(validateJsonSchema(input as JsonSchemaValidateInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'json_schema.from_json',
    title: 'JSON to JSON Schema',
    description: 'Infer a JSON Schema from example JSON data.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['dataText'],
      additionalProperties: false,
      properties: {
        dataText: { type: 'string' },
        additionalProperties: { type: 'boolean' },
        requiredMode: {
          type: 'string',
          enum: ['all', 'none']
        },
        includeSchemaDialect: { type: 'boolean' }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['schema', 'schemaText'],
      additionalProperties: false,
      properties: {
        schema: { type: 'object' },
        schemaText: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok(createJsonSchemaFromJson(input as JsonSchemaFromJsonInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'json_schema.mock',
    title: 'JSON Schema Mock',
    description: 'Generate deterministic mock JSON data from a JSON Schema.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['schemaText'],
      additionalProperties: false,
      properties: {
        schemaText: { type: 'string' },
        arrayItemCount: {
          type: 'integer',
          minimum: 0,
          maximum: 20,
          default: 1
        },
        includeOptionalProperties: {
          type: 'boolean',
          default: true
        }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['data', 'dataText'],
      additionalProperties: false,
      properties: {
        data: {},
        dataText: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok(createMockJsonFromSchema(input as JsonSchemaMockInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
