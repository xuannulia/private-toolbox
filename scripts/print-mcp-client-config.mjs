#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');

const defaults = {
  serverName: 'private-toolbox',
  profile: 'agent-curated',
  fileRoot: resolve(repoRoot, 'output/private-toolbox-files'),
  outputDir: resolve(repoRoot, 'output/private-toolbox-files/output'),
  rateLimitStateFile: resolve(
    repoRoot,
    'output/private-toolbox-files/rate-limit-state.json'
  ),
  auditLog: 'stderr'
};

const knownProfiles = new Map([
  ['agent-curated', resolve(repoRoot, 'config/mcp/agent-curated.json')],
  ['default-private', resolve(repoRoot, 'config/mcp/default-private.json')]
]);

const usage = `Usage:
  npm run mcp:client-config -- [options]

Options:
  --name <name>          MCP server name in the client config.
  --profile <profile>   agent-curated, default-private, or an absolute/relative JSON path.
  --file-root <path>    File tools root directory.
  --output-dir <path>   File write output directory.
  --rate-limit-state <path>
                         Network rate-limit state JSON file.
  --audit-log <target>  stderr, off, or a JSONL file path.
  --help                Show this help.
`;

const readOption = (args, index, option) => {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${option} requires a value`);
  }
  return value;
};

const resolvePath = (value) =>
  isAbsolute(value) ? value : resolve(repoRoot, value);

const parseArgs = (args) => {
  const options = { ...defaults };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      return { help: true, options };
    }

    if (arg === '--name') {
      options.serverName = readOption(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--profile') {
      options.profile = readOption(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === '--file-root') {
      options.fileRoot = resolvePath(readOption(args, index, arg));
      index += 1;
      continue;
    }

    if (arg === '--output-dir') {
      options.outputDir = resolvePath(readOption(args, index, arg));
      index += 1;
      continue;
    }

    if (arg === '--rate-limit-state') {
      options.rateLimitStateFile = resolvePath(readOption(args, index, arg));
      index += 1;
      continue;
    }

    if (arg === '--audit-log') {
      const auditLog = readOption(args, index, arg);
      options.auditLog =
        auditLog === 'stderr' || auditLog === 'off'
          ? auditLog
          : resolvePath(auditLog);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return { help: false, options };
};

const resolveProfile = (profile) => {
  const knownProfile = knownProfiles.get(profile);
  if (knownProfile) return knownProfile;

  return resolvePath(profile);
};

try {
  const { help, options } = parseArgs(process.argv.slice(2));
  if (help) {
    process.stdout.write(usage);
    process.exit(0);
  }

  const serverPath = resolve(repoRoot, 'apps/mcp/dist/server.js');
  const profilePath = resolveProfile(options.profile);

  if (!existsSync(profilePath)) {
    throw new Error(`MCP profile not found: ${profilePath}`);
  }

  const config = {
    mcpServers: {
      [options.serverName]: {
        command: 'node',
        args: [serverPath],
        env: {
          PRIVATE_TOOLBOX_MCP_CONFIG: profilePath,
          PRIVATE_TOOLBOX_FILE_ROOT: options.fileRoot,
          PRIVATE_TOOLBOX_FILE_OUTPUT_DIR: options.outputDir,
          PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_STATE_FILE:
            options.rateLimitStateFile,
          PRIVATE_TOOLBOX_MCP_ENABLE_HTTP_TOOLS: 'false',
          PRIVATE_TOOLBOX_MCP_AUDIT_LOG: options.auditLog
        }
      }
    }
  };

  process.stdout.write(`${JSON.stringify(config, null, 2)}\n`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n\n${usage}`);
  process.exit(1);
}
