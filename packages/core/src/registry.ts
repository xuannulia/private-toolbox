import { bannerTools } from './tools/banner.js';
import { barcodeTools } from './tools/barcode.js';
import { base64Tools } from './tools/base64.js';
import { baseConvertTools } from './tools/baseConvert.js';
import { cidrTools } from './tools/cidr.js';
import { colorTools } from './tools/color.js';
import { codeTools } from './tools/code.js';
import { cronTools } from './tools/cron.js';
import { csvTools } from './tools/csv.js';
import { dateTools } from './tools/date.js';
import { dockerComposeTools } from './tools/dockerCompose.js';
import { dockerfileTools } from './tools/dockerfile.js';
import { hashTools } from './tools/hash.js';
import { hexTools } from './tools/hex.js';
import { htpasswdTools } from './tools/htpasswd.js';
import { jsonSchemaTools } from './tools/jsonSchema.js';
import { jsonTools } from './tools/json.js';
import { jwtTools } from './tools/jwt.js';
import { listTools } from './tools/list.js';
import { nginxTools } from './tools/nginx.js';
import { numberTools } from './tools/number.js';
import { passwordTools } from './tools/password.js';
import { pemTools } from './tools/pem.js';
import { qrcodeTools } from './tools/qrcode.js';
import { regexTools } from './tools/regex.js';
import { rsaTools } from './tools/rsa.js';
import { rmbTools } from './tools/rmb.js';
import { romanTools } from './tools/roman.js';
import { textTools } from './tools/text.js';
import { seoTools } from './tools/seo.js';
import { sqlTools } from './tools/sql.js';
import { timestampTools } from './tools/timestamp.js';
import { unicodeTools } from './tools/unicode.js';
import { unitTools } from './tools/unit.js';
import { urlTools } from './tools/url.js';
import { xmlTools } from './tools/xml.js';
import { xpathTools } from './tools/xpath.js';
import { uuidTools } from './tools/uuid.js';
import {
  type JsonValue,
  type ToolChannel,
  type ToolExecutionContext,
  type ToolResult,
  type ToolboxTool,
  fail
} from './types.js';

export const coreTools: ToolboxTool[] = [
  ...jsonTools,
  ...jsonSchemaTools,
  ...xmlTools,
  ...xpathTools,
  ...csvTools,
  ...base64Tools,
  ...numberTools,
  ...baseConvertTools,
  ...unitTools,
  ...rmbTools,
  ...romanTools,
  ...cidrTools,
  ...colorTools,
  ...codeTools,
  ...urlTools,
  ...unicodeTools,
  ...hexTools,
  ...hashTools,
  ...htpasswdTools,
  ...timestampTools,
  ...dateTools,
  ...cronTools,
  ...regexTools,
  ...seoTools,
  ...sqlTools,
  ...textTools,
  ...listTools,
  ...jwtTools,
  ...bannerTools,
  ...barcodeTools,
  ...dockerComposeTools,
  ...dockerfileTools,
  ...nginxTools,
  ...passwordTools,
  ...pemTools,
  ...rsaTools,
  ...uuidTools,
  ...qrcodeTools
];

export const coreToolNames = coreTools.map((tool) => tool.name);

export const getCoreTool = (name: string): ToolboxTool | undefined =>
  coreTools.find((tool) => tool.name === name);

export const getCoreToolsByChannel = (channel: ToolChannel): ToolboxTool[] =>
  coreTools.filter((tool) => tool.channels.includes(channel));

export const callCoreTool = async (
  name: string,
  input: JsonValue,
  context?: ToolExecutionContext
): Promise<ToolResult> => {
  const tool = getCoreTool(name);

  if (!tool) {
    return fail('TOOL_NOT_FOUND', `Tool not found: ${name}`);
  }

  return tool.execute(input, context);
};
