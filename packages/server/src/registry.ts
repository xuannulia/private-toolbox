import {
  type JsonValue,
  type ToolChannel,
  type ToolExecutionContext,
  type ToolResult,
  type ToolboxTool,
  fail
} from '@private-toolbox/core';
import { dnsTools } from './tools/dns.js';
import { fileHashTools } from './tools/fileHash.js';
import { httpRequestTools } from './tools/httpRequest.js';
import { imageBase64Tools } from './tools/imageBase64.js';
import { imageExifTools } from './tools/imageExif.js';
import { imageIconTools } from './tools/imageIcon.js';
import { imageInfoTools } from './tools/imageInfo.js';
import { ipTools } from './tools/ip.js';
import { qrcodeDecodeTools } from './tools/qrcodeDecode.js';
import { renameBatchTools } from './tools/renameBatch.js';
import { rdapTools } from './tools/rdap.js';
import { sslTools } from './tools/ssl.js';
import { writeTempFileTools } from './tools/writeTempFile.js';
import { checkServerToolRateLimit } from './runtime.js';

export const serverTools: ToolboxTool[] = [
  ...rdapTools,
  ...dnsTools,
  ...sslTools,
  ...ipTools,
  ...httpRequestTools,
  ...fileHashTools,
  ...imageBase64Tools,
  ...imageExifTools,
  ...imageInfoTools,
  ...imageIconTools,
  ...qrcodeDecodeTools,
  ...renameBatchTools,
  ...writeTempFileTools
];

export const serverToolNames = serverTools.map((tool) => tool.name);

export const getServerTool = (name: string): ToolboxTool | undefined =>
  serverTools.find((tool) => tool.name === name);

export const getServerToolsByChannel = (channel: ToolChannel): ToolboxTool[] =>
  serverTools.filter((tool) => tool.channels.includes(channel));

export const callServerTool = async (
  name: string,
  input: JsonValue,
  context?: ToolExecutionContext
): Promise<ToolResult> => {
  const tool = getServerTool(name);

  if (!tool) {
    return fail('TOOL_NOT_FOUND', `Tool not found: ${name}`);
  }

  const rateLimitError = checkServerToolRateLimit(tool);
  if (rateLimitError) {
    return {
      ok: false,
      error: rateLimitError
    };
  }

  return tool.execute(input, context);
};
