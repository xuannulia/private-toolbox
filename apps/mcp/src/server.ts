import { randomUUID } from 'node:crypto';
import { createInterface } from 'node:readline';
import { stdin, stdout } from 'node:process';
import {
  callCoreTool,
  getCoreToolsByChannel,
  type JsonValue,
  type ToolResult,
  type ToolboxTool
} from '@private-toolbox/core';
import {
  callServerTool,
  getServerToolsByChannel
} from '@private-toolbox/server';
import { createMcpAuditLogger, type McpAuditClientInfo } from './audit.js';
import {
  isMcpToolEnabled,
  loadMcpConfig,
  type McpToolSource
} from './config.js';

const protocolVersion = '2025-11-25';

const mcpConfig = loadMcpConfig();
const audit = createMcpAuditLogger(mcpConfig);

type JsonRpcId = string | number | null;

type JsonRpcRequest = {
  jsonrpc: '2.0';
  id?: JsonRpcId;
  method?: string;
  params?: JsonValue;
};

type JsonRpcError = {
  code: number;
  message: string;
  data?: JsonValue;
};

type McpToolEntry = {
  source: McpToolSource;
  tool: ToolboxTool;
};

let clientInfo: McpAuditClientInfo | undefined;

const isObject = (value: unknown): value is Record<string, JsonValue> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getStringField = (
  object: Record<string, JsonValue>,
  key: string
): string | undefined => {
  const value = object[key];
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 128) : undefined;
};

const extractClientInfo = (
  params: JsonValue
): McpAuditClientInfo | undefined => {
  if (!isObject(params) || !isObject(params.clientInfo)) return undefined;

  const info: McpAuditClientInfo = {
    name: getStringField(params.clientInfo, 'name'),
    title: getStringField(params.clientInfo, 'title'),
    version: getStringField(params.clientInfo, 'version')
  };

  return info.name || info.title || info.version ? info : undefined;
};

const writeMessage = (message: Record<string, unknown>) => {
  stdout.write(`${JSON.stringify(message)}\n`);
};

const sendResult = (id: JsonRpcId, result: JsonValue) => {
  writeMessage({
    jsonrpc: '2.0',
    id,
    result
  });
};

const sendError = (id: JsonRpcId, error: JsonRpcError) => {
  writeMessage({
    jsonrpc: '2.0',
    id,
    error
  });
};

const toMcpTool = (tool: ToolboxTool): Record<string, JsonValue> => ({
  name: tool.name,
  title: tool.title,
  description: tool.description,
  inputSchema: tool.inputSchema as JsonValue,
  outputSchema: tool.outputSchema as JsonValue
});

const getMcpToolEntries = (): McpToolEntry[] =>
  [
    ...getCoreToolsByChannel('mcp').map((tool) => ({
      source: 'core' as const,
      tool
    })),
    ...getServerToolsByChannel('mcp').map((tool) => ({
      source: 'server' as const,
      tool
    }))
  ].filter((entry) => isMcpToolEnabled(entry.tool, entry.source, mcpConfig));

const getMcpToolEntry = (name: string): McpToolEntry | undefined =>
  getMcpToolEntries().find((entry) => entry.tool.name === name);

const toStructuredContent = (result: JsonValue): Record<string, JsonValue> =>
  isObject(result) ? result : { value: result };

const toMcpToolResult = (
  result: ToolResult,
  traceId: string
): Record<string, JsonValue> => {
  if (result.ok) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.result, null, 2)
        }
      ],
      structuredContent: toStructuredContent(result.result),
      isError: false,
      _meta: {
        traceId
      }
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: `${result.error.code}: ${result.error.message}`
      }
    ],
    structuredContent: {
      error: {
        code: result.error.code,
        message: result.error.message,
        details: result.error.details ?? null
      }
    },
    isError: true,
    _meta: {
      traceId
    }
  };
};

const handleInitialize = (id: JsonRpcId, params: JsonValue) => {
  clientInfo = extractClientInfo(params);

  sendResult(id, {
    protocolVersion,
    capabilities: {
      tools: {
        listChanged: false
      }
    },
    serverInfo: {
      name: 'private-toolbox-mcp',
      title: 'Private Toolbox MCP',
      version: '0.1.0',
      description:
        'Local-first tools from Private Toolbox. HTTP request tools are intentionally not exposed.'
    },
    instructions:
      'Use these deterministic tools for local transformations and guarded private-toolbox server tools. HTTP online request is not registered because agents can use curl directly.'
  });
};

const handleToolsList = (id: JsonRpcId) => {
  sendResult(id, {
    tools: getMcpToolEntries().map((entry) => toMcpTool(entry.tool))
  });
};

const handleToolsCall = async (id: JsonRpcId, params: JsonValue) => {
  const traceId = randomUUID();
  const startedAt = Date.now();

  if (!isObject(params) || typeof params.name !== 'string') {
    audit({
      event: 'tool_call',
      traceId,
      requestId: id,
      client: clientInfo,
      tool: '<invalid>',
      source: 'unknown',
      risks: [],
      ok: false,
      durationMs: Date.now() - startedAt,
      errorCode: 'INVALID_PARAMS',
      errorMessage: 'Invalid tools/call params'
    });
    sendError(id, {
      code: -32602,
      message: 'Invalid tools/call params',
      data: {
        traceId
      }
    });
    return;
  }

  const entry = getMcpToolEntry(params.name);
  if (!entry) {
    audit({
      event: 'tool_call',
      traceId,
      requestId: id,
      client: clientInfo,
      tool: params.name,
      source: 'unknown',
      risks: [],
      ok: false,
      durationMs: Date.now() - startedAt,
      errorCode: 'UNKNOWN_TOOL',
      errorMessage: `Unknown tool: ${params.name}`
    });
    sendError(id, {
      code: -32602,
      message: `Unknown tool: ${params.name}`,
      data: {
        traceId
      }
    });
    return;
  }

  const input = params.arguments ?? {};
  const context = {
    maxOutputBytes: mcpConfig.maxOutputBytes
  };
  const result =
    entry.source === 'core'
      ? await callCoreTool(params.name, input, context)
      : await callServerTool(params.name, input, context);
  audit({
    event: 'tool_call',
    traceId,
    requestId: id,
    client: clientInfo,
    tool: entry.tool.name,
    source: entry.source,
    risks: entry.tool.risks,
    ok: result.ok,
    durationMs: Date.now() - startedAt,
    errorCode: result.ok ? undefined : result.error.code,
    errorMessage: result.ok ? undefined : result.error.message
  });
  sendResult(id, toMcpToolResult(result, traceId));
};

const handleRequest = async (request: JsonRpcRequest) => {
  const id = request.id ?? null;

  if (!request.method) {
    if (request.id !== undefined) {
      sendError(id, {
        code: -32600,
        message: 'Invalid request'
      });
    }
    return;
  }

  if (request.id === undefined) {
    return;
  }

  switch (request.method) {
    case 'initialize':
      handleInitialize(id, request.params ?? {});
      break;
    case 'ping':
      sendResult(id, {});
      break;
    case 'tools/list':
      handleToolsList(id);
      break;
    case 'tools/call':
      await handleToolsCall(id, request.params ?? {});
      break;
    default:
      sendError(id, {
        code: -32601,
        message: `Method not found: ${request.method}`
      });
  }
};

const lineReader = createInterface({
  input: stdin,
  crlfDelay: Infinity
});

lineReader.on('line', (line) => {
  if (!line.trim()) return;

  try {
    const message = JSON.parse(line) as JsonRpcRequest;
    void handleRequest(message);
  } catch (error) {
    sendError(null, {
      code: -32700,
      message: error instanceof Error ? error.message : 'Parse error'
    });
  }
});
