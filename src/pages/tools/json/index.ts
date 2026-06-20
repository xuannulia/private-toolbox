import { tool as jsonPrettify } from './prettify/meta';
import { tool as jsonMinify } from './minify/meta';
import { tool as jsonStringify } from './stringify/meta';
import { tool as validateJson } from './validateJson/meta';
import { tool as jsonSchemaFromJson } from './json-schema-from-json/meta';
import { tool as jsonSchemaMock } from './json-schema-mock/meta';
import { tool as jsonSchemaValidator } from './json-schema-validator/meta';
import { tool as jsonToXml } from './json-to-xml/meta';
import { tool as jsonToYaml } from './json-to-yaml/meta';
import { tool as jsonToTypes } from './json-to-types/meta';
import { tool as yamlToJson } from './yaml-to-json/meta';
import { tool as jsonToQuery } from './json-to-query/meta';
import { tool as queryToJson } from './query-to-json/meta';
import { tool as escapeJson } from './escape-json/meta';
import { tool as jsonComparison } from './json-comparison/meta';
import { tool as sortJson } from './sort/meta';
import { tool as jsonToCsv } from './json-to-csv/meta';
import { tool as jsonToExcel } from './json-to-excel/meta';

export const jsonTools = [
  jsonPrettify,
  validateJson,
  jsonSchemaValidator,
  jsonSchemaFromJson,
  jsonSchemaMock,
  jsonToTypes,
  jsonMinify,
  jsonStringify,
  jsonToYaml,
  yamlToJson,
  jsonToQuery,
  queryToJson,
  jsonToXml,
  jsonToCsv,
  jsonToExcel,
  escapeJson,
  jsonComparison,
  sortJson
];
