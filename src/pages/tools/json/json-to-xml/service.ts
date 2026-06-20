import { convertJsonToXml as convertJsonToXmlCore } from '@private-toolbox/core';

type JsonToXmlOptions = {
  indentationType: 'space' | 'tab' | 'none';
  addMetaTag: boolean;
};

export const convertJsonToXml = (
  json: string,
  options: JsonToXmlOptions
): string => convertJsonToXmlCore(json, options);
