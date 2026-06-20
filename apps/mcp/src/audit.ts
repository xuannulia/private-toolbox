import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { stderr } from 'node:process';
import { type ToolRisk } from '@private-toolbox/core';
import { type McpConfig, type McpToolSource } from './config.js';

export type McpAuditToolSource = McpToolSource | 'unknown';

export type McpAuditClientInfo = {
  name?: string;
  title?: string;
  version?: string;
};

export type McpAuditEvent = {
  event: 'tool_call';
  traceId: string;
  requestId?: string | number | null;
  client?: McpAuditClientInfo;
  tool: string;
  source: McpAuditToolSource;
  risks: ToolRisk[];
  ok: boolean;
  durationMs: number;
  errorCode?: string;
  errorMessage?: string;
};

export type McpAuditLogger = (event: McpAuditEvent) => void;

export const createMcpAuditLogger = (config: McpConfig): McpAuditLogger => {
  if (!config.audit.enabled) {
    return () => {};
  }

  if (config.audit.target === 'file' && config.audit.filePath) {
    mkdirSync(dirname(config.audit.filePath), { recursive: true });
  }

  return (event) => {
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      ...event
    });

    if (config.audit.target === 'file' && config.audit.filePath) {
      appendFileSync(config.audit.filePath, `${line}\n`, 'utf-8');
      return;
    }

    stderr.write(`${line}\n`);
  };
};
