import { evaluateXPath, type XPathInput } from '@private-toolbox/core';

export type XPathWebInput = Omit<XPathInput, 'namespaces'> & {
  namespacesText?: string;
};

const parseNamespaces = (
  namespacesText: string | undefined
): Record<string, string> | undefined => {
  if (!namespacesText?.trim()) return undefined;

  const parsed = JSON.parse(namespacesText) as unknown;

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('namespaces must be a JSON object');
  }

  return parsed as Record<string, string>;
};

export const runXPathTool = ({
  namespacesText,
  ...input
}: XPathWebInput): string => {
  const result = evaluateXPath({
    ...input,
    namespaces: parseNamespaces(namespacesText)
  });

  return JSON.stringify(result, null, 2);
};
