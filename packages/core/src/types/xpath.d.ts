declare module 'xpath' {
  import type { Attr, Node } from '@xmldom/xmldom';

  export type XPathScalar = string | number | boolean;
  export type XPathNode = Node | Attr;
  export type XPathValue = XPathScalar | XPathNode[];

  export function select(expression: string, node: Node): XPathValue;
  export function useNamespaces(
    namespaces: Record<string, string>
  ): (expression: string, node: Node) => XPathValue;
}
