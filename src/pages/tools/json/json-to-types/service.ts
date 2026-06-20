import { jsonToTypes, type JsonToTypesLanguage } from '@private-toolbox/core';

export type JsonToTypesOptions = {
  text: string;
  language: JsonToTypesLanguage;
  rootName: string;
};

export const jsonToTypesLanguages: JsonToTypesLanguage[] = [
  'typescript',
  'java',
  'go',
  'csharp'
];

export const jsonToTypesExtensions: Record<JsonToTypesLanguage, string> = {
  typescript: 'ts',
  java: 'java',
  go: 'go',
  csharp: 'cs'
};

export const createJsonTypesText = ({
  text,
  language,
  rootName
}: JsonToTypesOptions): string =>
  jsonToTypes({
    text,
    language,
    rootName
  }).text;
