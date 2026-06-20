import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { createMcpAuditLogger } from './audit';
import { normalizeMcpConfig } from './config';

describe('MCP audit logger', () => {
  it('writes trace, request, client, and error fields without inputs or outputs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'private-toolbox-mcp-audit-'));
    const filePath = join(dir, 'audit.jsonl');
    const config = normalizeMcpConfig(
      {
        auditLog: filePath
      },
      {}
    );
    const audit = createMcpAuditLogger(config);

    audit({
      event: 'tool_call',
      traceId: 'trace-1',
      requestId: 'request-1',
      client: {
        name: 'Codex',
        version: '1.0.0'
      },
      tool: 'json.validate',
      source: 'core',
      risks: ['local'],
      ok: false,
      durationMs: 12,
      errorCode: 'INVALID_JSON',
      errorMessage: 'Unexpected token'
    });

    const [line] = readFileSync(filePath, 'utf-8').trim().split('\n');
    const event = JSON.parse(line);

    expect(event).toMatchObject({
      event: 'tool_call',
      traceId: 'trace-1',
      requestId: 'request-1',
      client: {
        name: 'Codex',
        version: '1.0.0'
      },
      tool: 'json.validate',
      source: 'core',
      risks: ['local'],
      ok: false,
      durationMs: 12,
      errorCode: 'INVALID_JSON',
      errorMessage: 'Unexpected token'
    });
    expect(typeof event.timestamp).toBe('string');
    expect(event.arguments).toBeUndefined();
    expect(event.result).toBeUndefined();
    expect(event.structuredContent).toBeUndefined();
  });
});
