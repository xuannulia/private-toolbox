import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { getCoreToolsByChannel, type ToolboxTool } from '@private-toolbox/core';
import { getServerToolsByChannel } from '@private-toolbox/server';
import { isMcpToolEnabled, loadMcpConfig, normalizeMcpConfig } from './config';

const requiredAgentCuratedTools = [
  'dns.lookup',
  'ssl.inspect',
  'ip.lookup',
  'rsa.generate_keypair',
  'rsa.encrypt',
  'rsa.decrypt',
  'rsa.sign',
  'rsa.verify',
  'password.generate',
  'file.rename_batch',
  'file.write_temp',
  'hash.file',
  'image.to_base64',
  'image.exif',
  'image.info',
  'image.to_icon',
  'qrcode.decode',
  'json.format',
  'json.validate',
  'json.to_types',
  'json.to_excel',
  'json_schema.validate',
  'xpath.evaluate',
  'cron.parse',
  'cron.next_runs',
  'cron.calendar',
  'regex.explain',
  'regex.visualize',
  'docker_compose.validate',
  'dockerfile.format',
  'dockerfile.snippet_generate',
  'nginx.format',
  'nginx.location_match',
  'nginx.snippet_generate'
];

const disallowedAgentCuratedTools = ['http.request'];

const makeTool = (name: string, risks: ToolboxTool['risks']): ToolboxTool => ({
  name,
  title: name,
  description: name,
  channels: ['mcp'],
  risks,
  inputSchema: {},
  outputSchema: {},
  execute: () => ({
    ok: true,
    result: null
  })
});

describe('MCP config', () => {
  it('enables planned risk groups by default', () => {
    const config = normalizeMcpConfig({}, {});

    expect(config.enableCoreTools).toBe(true);
    expect(config.enableServerTools).toBe(true);
    expect(config.allowedRisks).toEqual([
      'local',
      'network',
      'secret',
      'file-read',
      'file-write'
    ]);
  });

  it('keeps HTTP request tools out of MCP by default', () => {
    const config = normalizeMcpConfig({}, {});
    const tool = makeTool('http.request', ['network']);

    expect(isMcpToolEnabled(tool, 'server', config)).toBe(false);
  });

  it('does not allow config or env flags to enable HTTP request tools', () => {
    const config = normalizeMcpConfig(
      {
        enableHttpTools: true
      },
      {
        PRIVATE_TOOLBOX_MCP_ENABLE_HTTP_TOOLS: 'true'
      }
    );
    const tool = makeTool('http.request', ['network']);

    expect(config.enableHttpTools).toBe(false);
    expect(isMcpToolEnabled(tool, 'server', config)).toBe(false);
  });

  it('filters tools by risk and explicit disabled names', () => {
    const config = normalizeMcpConfig(
      {
        disabledTools: ['dns.lookup']
      },
      {
        PRIVATE_TOOLBOX_MCP_ALLOWED_RISKS: 'local,secret'
      }
    );

    expect(
      isMcpToolEnabled(makeTool('dns.lookup', ['network']), 'server', config)
    ).toBe(false);
    expect(
      isMcpToolEnabled(
        makeTool('password.generate', ['secret']),
        'core',
        config
      )
    ).toBe(true);
  });

  it('supports explicit allow lists', () => {
    const config = normalizeMcpConfig(
      {
        enabledTools: ['timestamp.convert']
      },
      {}
    );

    expect(
      isMcpToolEnabled(makeTool('timestamp.convert', ['local']), 'core', config)
    ).toBe(true);
    expect(
      isMcpToolEnabled(makeTool('json.format', ['local']), 'core', config)
    ).toBe(false);
  });

  it('treats null enabledTools as no allow list', () => {
    const config = normalizeMcpConfig(
      {
        enabledTools: null
      },
      {}
    );

    expect(config.enabledTools).toBeNull();
    expect(
      isMcpToolEnabled(makeTool('json.format', ['local']), 'core', config)
    ).toBe(true);
  });

  it('loads the default private profile from the repository config directory', () => {
    const config = loadMcpConfig({
      PRIVATE_TOOLBOX_MCP_CONFIG: resolve('config/mcp/default-private.json')
    });

    expect(config).toMatchObject({
      enableCoreTools: true,
      enableServerTools: true,
      enableHttpTools: false,
      allowedRisks: ['local', 'network', 'secret', 'file-read', 'file-write'],
      enabledTools: null,
      disabledTools: [],
      maxOutputBytes: 1048576,
      audit: {
        enabled: true,
        target: 'stderr',
        filePath: null
      }
    });
  });

  it('keeps the agent-curated profile aligned with registered MCP tools', () => {
    const config = loadMcpConfig({
      PRIVATE_TOOLBOX_MCP_CONFIG: resolve('config/mcp/agent-curated.json')
    });
    const registeredMcpTools = [
      ...getCoreToolsByChannel('mcp').map((tool) => ({
        source: 'core' as const,
        tool
      })),
      ...getServerToolsByChannel('mcp').map((tool) => ({
        source: 'server' as const,
        tool
      }))
    ];
    const registeredNames = new Set(
      registeredMcpTools.map((entry) => entry.tool.name)
    );

    for (const name of requiredAgentCuratedTools) {
      expect(config.enabledTools).toContain(name);
    }

    for (const name of disallowedAgentCuratedTools) {
      expect(config.enabledTools).not.toContain(name);
    }

    for (const name of config.enabledTools ?? []) {
      expect(registeredNames.has(name), name).toBe(true);
    }

    const exposedNames = registeredMcpTools
      .filter((entry) => isMcpToolEnabled(entry.tool, entry.source, config))
      .map((entry) => entry.tool.name);

    expect(new Set(exposedNames)).toEqual(new Set(config.enabledTools ?? []));

    for (const name of requiredAgentCuratedTools) {
      expect(exposedNames).toContain(name);
    }

    for (const name of disallowedAgentCuratedTools) {
      expect(exposedNames).not.toContain(name);
    }
  });
});
