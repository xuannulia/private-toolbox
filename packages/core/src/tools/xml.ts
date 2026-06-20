import { XMLBuilder, XMLParser, XMLValidator } from 'fast-xml-parser';
import {
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';

export type XmlError = {
  message: string;
  line: number | null;
  column: number | null;
};

export type XmlValidateInput = {
  text: string;
};

export type XmlValidateOutput = {
  valid: boolean;
  message: string;
  error: XmlError | null;
};

export type XmlFormatInput = XmlValidateInput & {
  indent?: string;
};

export type XmlFormatOutput = XmlValidateOutput & {
  text: string;
};

export type XmlMinifyInput = XmlValidateInput;

export type XmlMinifyOutput = XmlFormatOutput;

const normalizeXmlText = (text: unknown): string => {
  if (typeof text !== 'string') {
    throw new ToolboxError('INVALID_XML_INPUT', 'text must be a string');
  }

  if (!text.trim()) {
    throw new ToolboxError('INVALID_XML_INPUT', 'text is required');
  }

  return text;
};

const normalizeIndent = (indent: unknown): string => {
  if (indent === undefined || indent === null || indent === '') return '  ';
  if (typeof indent !== 'string') {
    throw new ToolboxError('INVALID_XML_INPUT', 'indent must be a string');
  }
  if (indent.length > 8) {
    throw new ToolboxError(
      'INVALID_XML_INPUT',
      'indent must be 8 characters or fewer'
    );
  }

  return indent;
};

const toXmlError = (value: unknown): XmlError => {
  if (
    typeof value === 'object' &&
    value !== null &&
    'err' in value &&
    typeof value.err === 'object' &&
    value.err !== null
  ) {
    const err = value.err as {
      msg?: unknown;
      line?: unknown;
      col?: unknown;
    };

    return {
      message: typeof err.msg === 'string' ? err.msg : 'Invalid XML',
      line: typeof err.line === 'number' ? err.line : null,
      column: typeof err.col === 'number' ? err.col : null
    };
  }

  return {
    message: 'Invalid XML',
    line: null,
    column: null
  };
};

export const validateXmlDocument = (
  input: XmlValidateInput
): XmlValidateOutput => {
  const text = normalizeXmlText(input.text);
  const result = XMLValidator.validate(text);

  if (result === true) {
    return {
      valid: true,
      message: 'Valid XML',
      error: null
    };
  }

  const error = toXmlError(result);

  return {
    valid: false,
    message:
      error.line !== null && error.column !== null
        ? `Invalid XML: ${error.message} (line ${error.line}, col ${error.column})`
        : `Invalid XML: ${error.message}`,
    error
  };
};

export const formatXmlDocument = (input: XmlFormatInput): XmlFormatOutput => {
  const text = normalizeXmlText(input.text);
  const validation = validateXmlDocument({ text });

  if (!validation.valid) {
    return {
      ...validation,
      text: ''
    };
  }

  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      preserveOrder: false
    });
    const parsed = parser.parse(text);
    const builder = new XMLBuilder({
      format: true,
      indentBy: normalizeIndent(input.indent),
      ignoreAttributes: false
    });

    return {
      ...validation,
      text: builder.build(parsed)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid XML';

    return {
      valid: false,
      message: `Invalid XML: ${message}`,
      error: {
        message,
        line: null,
        column: null
      },
      text: ''
    };
  }
};

export const minifyXmlDocument = (input: XmlMinifyInput): XmlMinifyOutput => {
  const text = normalizeXmlText(input.text);
  const validation = validateXmlDocument({ text });

  if (!validation.valid) {
    return {
      ...validation,
      text: ''
    };
  }

  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      preserveOrder: false,
      trimValues: true
    });
    const parsed = parser.parse(text);
    const builder = new XMLBuilder({
      format: false,
      ignoreAttributes: false,
      suppressBooleanAttributes: false
    });

    return {
      ...validation,
      text: builder.build(parsed)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid XML';

    return {
      valid: false,
      message: `Invalid XML: ${message}`,
      error: {
        message,
        line: null,
        column: null
      },
      text: ''
    };
  }
};

const xmlErrorSchema = {
  type: 'object',
  required: ['message', 'line', 'column'],
  additionalProperties: false,
  properties: {
    message: { type: 'string' },
    line: { type: ['number', 'null'] },
    column: { type: ['number', 'null'] }
  }
};

const xmlValidateOutputSchema = {
  type: 'object',
  required: ['valid', 'message', 'error'],
  additionalProperties: false,
  properties: {
    valid: { type: 'boolean' },
    message: { type: 'string' },
    error: {
      anyOf: [xmlErrorSchema, { type: 'null' }]
    }
  }
};

export const xmlTools: ToolboxTool[] = [
  {
    name: 'xml.validate',
    title: 'Validate XML',
    description: 'Validate XML and return structured error information.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' }
      }
    },
    outputSchema: xmlValidateOutputSchema,
    execute: (input) => {
      try {
        return ok(validateXmlDocument(input as XmlValidateInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'xml.format',
    title: 'Format XML',
    description: 'Format XML with configurable indentation.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        indent: { type: 'string', default: '  ' }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['valid', 'message', 'error', 'text'],
      additionalProperties: false,
      properties: {
        ...xmlValidateOutputSchema.properties,
        text: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok(formatXmlDocument(input as XmlFormatInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  },
  {
    name: 'xml.minify',
    title: 'Minify XML',
    description: 'Minify XML by removing formatting whitespace.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' }
      }
    },
    outputSchema: {
      type: 'object',
      required: ['valid', 'message', 'error', 'text'],
      additionalProperties: false,
      properties: {
        ...xmlValidateOutputSchema.properties,
        text: { type: 'string' }
      }
    },
    execute: (input) => {
      try {
        return ok(minifyXmlDocument(input as XmlMinifyInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
