import type { ToolCategory } from './defineTool';

export type ToolDataFlow = 'local' | 'backend' | 'network' | 'third-party';
export type ToolRuntime = 'web' | 'api' | 'mcp';

export type ToolProcessing = {
  dataFlow: ToolDataFlow;
  runtimes: ToolRuntime[];
  usesBackend: boolean;
  usesNetwork: boolean;
  apiTools: string[];
  mcpTools: string[];
};

type ToolProcessingInput = {
  category: ToolCategory;
  path: string;
};

const coreSharedToolsByPath: Record<string, string[]> = {
  'json/prettify': ['json.format'],
  'json/minify': ['json.minify'],
  'json/validateJson': ['json.validate'],
  'json/sort': ['json.sort'],
  'json/escape-json': ['json.escape'],
  'json/stringify': ['json.stringify'],
  'json/json-comparison': ['json.compare'],
  'json/json-to-csv': ['json.to_csv'],
  'json/json-to-excel': ['json.to_excel'],
  'json/json-to-xml': ['json.to_xml'],
  'json/json-to-yaml': ['json.to_yaml'],
  'json/yaml-to-json': ['yaml.to_json'],
  'json/json-to-query': ['json.to_query'],
  'json/query-to-json': ['query.to_json'],
  'json/json-to-types': ['json.to_types'],
  'json/json-schema-validator': ['json_schema.validate'],
  'json/json-schema-from-json': ['json_schema.from_json'],
  'json/json-schema-mock': ['json_schema.mock'],

  'xml/xml-beautifier': ['xml.format'],
  'xml/xml-minifier': ['xml.minify'],
  'xml/xml-validator': ['xml.validate'],
  'xml/xpath-evaluator': ['xpath.evaluate'],

  'csv/csv-to-json': ['csv.to_json'],
  'csv/tsv-to-json': ['tsv.to_json'],
  'csv/csv-to-xml': ['csv.to_xml'],
  'csv/csv-to-yaml': ['csv.to_yaml'],
  'csv/csv-to-tsv': ['csv.to_tsv'],
  'csv/change-csv-separator': ['csv.change_separator'],
  'csv/transpose-csv': ['csv.transpose'],
  'csv/find-incomplete-csv-records': ['csv.find_incomplete_records'],

  'string/base64': ['base64.encode', 'base64.decode'],
  'string/url-encode-string': ['url.encode'],
  'string/url-decode-string': ['url.decode'],
  'string/unicode': ['unicode.encode', 'unicode.decode'],
  'string/hex': ['hex.encode', 'hex.decode'],
  'string/hash': ['hash.text'],
  'string/htpasswd-generator': ['htpasswd.generate'],
  'string/jwt-inspector': ['jwt.decode', 'jwt.inspect'],
  'string/ascii-banner': ['banner.ascii'],
  'string/password-generator': ['password.generate'],
  'string/pem-inspector': ['pem.inspect'],
  'string/rsa-keypair': ['rsa.generate_keypair'],
  'string/rsa-private-key': [
    'rsa.inspect_private_key',
    'rsa.extract_public_key'
  ],
  'string/rsa-crypto': ['rsa.encrypt', 'rsa.decrypt', 'rsa.sign', 'rsa.verify'],
  'string/uuid-generator': ['uuid.generate'],
  'string/regex-toolkit': [
    'regex.test',
    'regex.replace',
    'regex.explain',
    'regex.to_code',
    'regex.visualize'
  ],
  'string/text-compare': ['text.diff'],
  'string/replacer': ['text.replace'],
  'string/remove-duplicate-lines': ['text.remove_duplicate_lines'],
  'string/hidden-character-detector': ['text.hidden_chars'],
  'string/slug-generator': ['text.slug'],
  'string/split': ['text.split'],
  'string/join': ['text.join'],
  'string/truncate': ['text.truncate'],
  'string/reverse': ['text.reverse'],
  'string/uppercase': [
    'text.uppercase',
    'text.lowercase',
    'text.title_case',
    'text.capitalize'
  ],
  'string/statistics': ['text.stats'],

  'list/sort': ['list.sort'],
  'list/reverse': ['list.reverse'],
  'list/shuffle': ['list.shuffle'],
  'list/find-unique': ['list.unique'],
  'list/find-most-popular': ['list.most_common'],
  'list/chunk': ['list.chunk'],
  'list/rotate': ['list.rotate'],
  'list/truncate': ['list.truncate'],

  'time/convert-unix-to-date': ['timestamp.convert'],
  'time/time-between-dates': ['date.diff'],
  'time/crontab-guru': [
    'cron.validate',
    'cron.parse',
    'cron.template',
    'cron.next_runs',
    'cron.calendar',
    'cron.convert'
  ],

  'number/sum': ['number.sum'],
  'number/random-number-generator': ['number.random'],
  'number/byte-converter': ['number.byte_convert'],
  'number/base-converter': ['number.base_convert'],
  'number/color-converter': ['color.convert'],

  'network/cidr-calculator': ['cidr.calculate'],

  'ops/code-format': ['code.format', 'code.minify'],
  'ops/sql-format': ['sql.format', 'sql.minify'],
  'ops/docker-compose': ['docker_compose.validate', 'docker_compose.format'],
  'ops/dockerfile-format': ['dockerfile.format'],
  'ops/dockerfile-snippet': ['dockerfile.snippet_generate'],
  'ops/nginx-format': ['nginx.format'],
  'ops/nginx-location-match': ['nginx.location_match'],
  'ops/nginx-snippet': ['nginx.snippet_generate'],

  'image-generic/qr-code': ['qrcode.generate'],
  'image-generic/barcode': ['barcode.generate']
};

const networkServerToolsByPath: Record<string, string[]> = {
  'network/dns-lookup': ['dns.lookup'],
  'network/ssl-inspect': ['ssl.inspect'],
  'network/ip-lookup': ['ip.lookup']
};

const apiOnlyNetworkToolsByPath: Record<string, string[]> = {
  'network/http-request': ['http.request'],
  'network/http-status': ['http.status']
};

const localServerToolsByPath: Record<string, string[]> = {
  'image-generic/image-to-base64': ['image.to_base64'],
  'image-generic/image-info': ['image.info', 'image.exif'],
  'image-generic/image-to-icon': ['image.to_icon'],
  'image-generic/qr-code-decode': ['qrcode.decode']
};

const webOnlyProcessing: ToolProcessing = {
  dataFlow: 'local',
  runtimes: ['web'],
  usesBackend: false,
  usesNetwork: false,
  apiTools: [],
  mcpTools: []
};

export const getMappedToolProcessingPaths = (): string[] =>
  Array.from(
    new Set([
      ...Object.keys(coreSharedToolsByPath),
      ...Object.keys(networkServerToolsByPath),
      ...Object.keys(apiOnlyNetworkToolsByPath),
      ...Object.keys(localServerToolsByPath)
    ])
  ).sort();

const withSharedTools = (
  dataFlow: ToolDataFlow,
  apiTools: string[],
  mcpTools = apiTools,
  usesNetwork = false
): ToolProcessing => ({
  dataFlow,
  runtimes: [
    'web',
    ...(apiTools.length > 0 ? (['api'] as const) : []),
    ...(mcpTools.length > 0 ? (['mcp'] as const) : [])
  ],
  usesBackend: dataFlow === 'backend' || dataFlow === 'network',
  usesNetwork,
  apiTools,
  mcpTools
});

export const getDefaultToolProcessing = ({
  path
}: ToolProcessingInput): ToolProcessing => {
  const coreTools = coreSharedToolsByPath[path];
  if (coreTools) return withSharedTools('local', coreTools);

  const networkTools = networkServerToolsByPath[path];
  if (networkTools)
    return withSharedTools('network', networkTools, networkTools, true);

  const apiOnlyNetworkTools = apiOnlyNetworkToolsByPath[path];
  if (apiOnlyNetworkTools) {
    return withSharedTools('network', apiOnlyNetworkTools, [], true);
  }

  const localServerTools = localServerToolsByPath[path];
  if (localServerTools) {
    return withSharedTools('backend', localServerTools);
  }

  return webOnlyProcessing;
};
