import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import type { Attr, Element, Node } from '@xmldom/xmldom';
import { select, useNamespaces } from 'xpath';
import {
  type JsonValue,
  ToolboxError,
  type ToolboxTool,
  normalizeError,
  ok
} from '../types.js';
import { validateXmlDocument } from './xml.js';

export type XPathInput = {
  text: string;
  expression: string;
  namespaces?: Record<string, string>;
  maxResults?: number;
  includeXml?: boolean;
};

export type XPathResultType = 'nodes' | 'string' | 'number' | 'boolean';

export type XPathNodeResult = {
  type: string;
  name: string | null;
  path: string;
  value: string;
  text: string;
  attributes: Record<string, string>;
  xml: string | null;
};

export type XPathOutput = {
  valid: boolean;
  expression: string;
  resultType: XPathResultType | null;
  matchCount: number;
  value: string | number | boolean | null;
  nodes: XPathNodeResult[];
  truncated: boolean;
  error: string | null;
};

const maxTextLength = 500_000;
const maxExpressionLength = 10_000;
const defaultMaxResults = 50;
const maxResultsLimit = 500;
const maxSerializedXmlLength = 20_000;

const nodeTypeNames: Record<number, string> = {
  1: 'element',
  2: 'attribute',
  3: 'text',
  4: 'cdata',
  7: 'processing-instruction',
  8: 'comment',
  9: 'document',
  10: 'doctype'
};

const normalizeString = (
  value: unknown,
  fieldName: string,
  maxLength: number
): string => {
  if (typeof value !== 'string') {
    throw new ToolboxError(
      'INVALID_XPATH_INPUT',
      `${fieldName} must be a string`
    );
  }

  if (!value.trim()) {
    throw new ToolboxError('INVALID_XPATH_INPUT', `${fieldName} is required`);
  }

  if (value.length > maxLength) {
    throw new ToolboxError(
      'XPATH_INPUT_TOO_LARGE',
      `${fieldName} is too large; maximum length is ${maxLength}`
    );
  }

  return value;
};

const normalizeMaxResults = (value: unknown): number => {
  if (value === undefined || value === null || value === '') {
    return defaultMaxResults;
  }

  if (!Number.isInteger(value) || Number(value) < 1) {
    throw new ToolboxError(
      'INVALID_XPATH_INPUT',
      'maxResults must be a positive integer'
    );
  }

  return Math.min(Number(value), maxResultsLimit);
};

const normalizeNamespaces = (
  value: unknown
): Record<string, string> | undefined => {
  if (value === undefined || value === null) return undefined;

  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new ToolboxError(
      'INVALID_XPATH_INPUT',
      'namespaces must be an object'
    );
  }

  const namespaces: Record<string, string> = {};

  for (const [prefix, uri] of Object.entries(value)) {
    if (!/^[A-Za-z_][\w.-]*$/.test(prefix)) {
      throw new ToolboxError(
        'INVALID_XPATH_INPUT',
        `Invalid namespace prefix: ${prefix}`
      );
    }

    if (typeof uri !== 'string' || !uri.trim()) {
      throw new ToolboxError(
        'INVALID_XPATH_INPUT',
        `Namespace URI for ${prefix} must be a non-empty string`
      );
    }

    namespaces[prefix] = uri;
  }

  return Object.keys(namespaces).length > 0 ? namespaces : undefined;
};

const getNodeTypeName = (node: Node | Attr): string =>
  nodeTypeNames[node.nodeType] ?? 'node';

const getNodeName = (node: Node | Attr): string | null => {
  if (node.nodeType === 3) return '#text';
  if (node.nodeType === 4) return '#cdata';
  if (node.nodeType === 8) return '#comment';

  return node.nodeName || null;
};

const getNodeValue = (node: Node | Attr): string => {
  if (node.nodeType === 1 || node.nodeType === 9) {
    return node.textContent ?? '';
  }

  return node.nodeValue ?? node.textContent ?? '';
};

const getAttributes = (node: Node | Attr): Record<string, string> => {
  if (node.nodeType !== 1) {
    return {};
  }

  const element = node as Element;
  const attributes: Record<string, string> = {};

  for (let index = 0; index < element.attributes.length; index += 1) {
    const attribute = element.attributes.item(index);
    if (attribute) attributes[attribute.name] = attribute.value;
  }

  return attributes;
};

const getNodeIndex = (node: Node): number => {
  const parent = node.parentNode;
  const name = node.nodeName;

  if (!parent) return 1;

  let index = 0;

  for (let child = parent.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === node.nodeType && child.nodeName === name) {
      index += 1;
    }

    if (child === node) return index;
  }

  return 1;
};

const getXPathPath = (node: Node | Attr): string => {
  if (node.nodeType === 2) {
    const attribute = node as Attr;
    return `${getXPathPath(attribute.ownerElement as Node)}/@${attribute.name}`;
  }

  if (node.nodeType === 9) return '/';

  const segments: string[] = [];
  let current: Node | null = node as Node;

  while (current && current.nodeType !== 9) {
    const name = current.nodeType === 3 ? 'text()' : current.nodeName;
    segments.unshift(`${name}[${getNodeIndex(current)}]`);
    current = current.parentNode;
  }

  return `/${segments.join('/')}`;
};

const serializeNode = (
  node: Node | Attr,
  serializer: XMLSerializer,
  includeXml: boolean
): string | null => {
  if (!includeXml || node.nodeType === 2) return null;

  const xml = serializer.serializeToString(node);
  if (xml.length <= maxSerializedXmlLength) return xml;

  return `${xml.slice(0, maxSerializedXmlLength)}...`;
};

const toNodeResult = (
  node: Node | Attr,
  serializer: XMLSerializer,
  includeXml: boolean
): XPathNodeResult => {
  const value = getNodeValue(node);

  return {
    type: getNodeTypeName(node),
    name: getNodeName(node),
    path: getXPathPath(node),
    value,
    text: node.textContent ?? value,
    attributes: getAttributes(node),
    xml: serializeNode(node, serializer, includeXml)
  };
};

const isNodeArray = (value: unknown): value is (Node | Attr)[] =>
  Array.isArray(value);

export const evaluateXPath = (input: XPathInput): XPathOutput => {
  const text = normalizeString(input.text, 'text', maxTextLength);
  const expression = normalizeString(
    input.expression,
    'expression',
    maxExpressionLength
  );
  const namespaces = normalizeNamespaces(input.namespaces);
  const maxResults = normalizeMaxResults(input.maxResults);
  const includeXml = input.includeXml !== false;
  const validation = validateXmlDocument({ text });

  if (!validation.valid) {
    return {
      valid: false,
      expression,
      resultType: null,
      matchCount: 0,
      value: null,
      nodes: [],
      truncated: false,
      error: validation.message
    };
  }

  try {
    const document = new DOMParser().parseFromString(text, 'text/xml');
    const evaluator = namespaces ? useNamespaces(namespaces) : select;
    const result = evaluator(expression, document);

    if (isNodeArray(result)) {
      const serializer = new XMLSerializer();
      const nodes = result
        .slice(0, maxResults)
        .map((node) => toNodeResult(node, serializer, includeXml));

      return {
        valid: true,
        expression,
        resultType: 'nodes',
        matchCount: result.length,
        value: null,
        nodes,
        truncated: result.length > nodes.length,
        error: null
      };
    }

    return {
      valid: true,
      expression,
      resultType: typeof result as XPathResultType,
      matchCount: typeof result === 'boolean' ? (result ? 1 : 0) : 1,
      value: result,
      nodes: [],
      truncated: false,
      error: null
    };
  } catch (error) {
    return {
      valid: false,
      expression,
      resultType: null,
      matchCount: 0,
      value: null,
      nodes: [],
      truncated: false,
      error: error instanceof Error ? error.message : 'Invalid XPath'
    };
  }
};

const xpathNodeSchema = {
  type: 'object',
  required: ['type', 'name', 'path', 'value', 'text', 'attributes', 'xml'],
  additionalProperties: false,
  properties: {
    type: { type: 'string' },
    name: { type: ['string', 'null'] },
    path: { type: 'string' },
    value: { type: 'string' },
    text: { type: 'string' },
    attributes: {
      type: 'object',
      additionalProperties: { type: 'string' }
    },
    xml: { type: ['string', 'null'] }
  }
};

const xpathOutputSchema = {
  type: 'object',
  required: [
    'valid',
    'expression',
    'resultType',
    'matchCount',
    'value',
    'nodes',
    'truncated',
    'error'
  ],
  additionalProperties: false,
  properties: {
    valid: { type: 'boolean' },
    expression: { type: 'string' },
    resultType: {
      anyOf: [
        { enum: ['nodes', 'string', 'number', 'boolean'] },
        { type: 'null' }
      ]
    },
    matchCount: { type: 'number' },
    value: { type: ['string', 'number', 'boolean', 'null'] },
    nodes: {
      type: 'array',
      items: xpathNodeSchema
    },
    truncated: { type: 'boolean' },
    error: { type: ['string', 'null'] }
  }
} as const;

export const xpathTools: ToolboxTool[] = [
  {
    name: 'xpath.evaluate',
    title: 'Evaluate XPath',
    description:
      'Evaluate an XPath expression against XML and return structured matches.',
    channels: ['web', 'api', 'mcp'],
    risks: ['local'],
    inputSchema: {
      type: 'object',
      required: ['text', 'expression'],
      additionalProperties: false,
      properties: {
        text: { type: 'string' },
        expression: { type: 'string' },
        namespaces: {
          type: 'object',
          additionalProperties: { type: 'string' }
        },
        maxResults: {
          type: 'integer',
          minimum: 1,
          maximum: maxResultsLimit,
          default: defaultMaxResults
        },
        includeXml: { type: 'boolean', default: true }
      }
    },
    outputSchema: xpathOutputSchema,
    execute: (input) => {
      try {
        return ok(evaluateXPath(input as JsonValue as XPathInput));
      } catch (error) {
        return normalizeError(error);
      }
    }
  }
];
