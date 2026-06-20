#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');

const usage = `Usage:
  npm run dev:private -- [options]

Options:
  --skip-build       Start API and Web without rebuilding core/server/API first.
  --api-only         Start only the local API.
  --web-only         Start only the Vite web app.
  --api-host <host>  Override PRIVATE_TOOLBOX_API_HOST.
  --api-port <port>  Override PRIVATE_TOOLBOX_API_PORT.
  --web-port <port>  Start Vite on a fixed port.
  --help            Show this help.
`;

const readOption = (args, index, option) => {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${option} requires a value`);
  }
  return value;
};

const parseArgs = (args) => {
  const options = {
    skipBuild: false,
    apiOnly: false,
    webOnly: false,
    apiHost: undefined,
    apiPort: undefined,
    webPort: undefined,
    help: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--skip-build') {
      options.skipBuild = true;
      continue;
    }
    if (arg === '--api-only') {
      options.apiOnly = true;
      continue;
    }
    if (arg === '--web-only') {
      options.webOnly = true;
      continue;
    }
    if (arg === '--api-host') {
      options.apiHost = readOption(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--api-port') {
      options.apiPort = readOption(args, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--web-port') {
      options.webPort = readOption(args, index, arg);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  if (options.apiOnly && options.webOnly) {
    throw new Error('--api-only and --web-only cannot be used together');
  }

  return options;
};

const parseEnvFile = (filePath) => {
  if (!existsSync(filePath)) return {};

  const env = {};
  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) continue;

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (!key) continue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
};

const getWebApiHost = (host) =>
  !host || host === '0.0.0.0' || host === '::' ? '127.0.0.1' : host;

const loadPrivateEnv = (options) => {
  const exampleEnv = parseEnvFile(resolve(repoRoot, '.env.example'));
  const localEnv = parseEnvFile(resolve(repoRoot, '.env.local'));
  const env = {
    ...exampleEnv,
    ...localEnv,
    ...process.env
  };

  if (options.apiHost) env.PRIVATE_TOOLBOX_API_HOST = options.apiHost;
  if (options.apiPort) env.PRIVATE_TOOLBOX_API_PORT = options.apiPort;

  const explicitWebApiUrl =
    Boolean(localEnv.VITE_PRIVATE_TOOLBOX_API_URL) ||
    Boolean(process.env.VITE_PRIVATE_TOOLBOX_API_URL);

  if (!explicitWebApiUrl) {
    const host = getWebApiHost(env.PRIVATE_TOOLBOX_API_HOST);
    const port = env.PRIVATE_TOOLBOX_API_PORT || '4317';
    env.VITE_PRIVATE_TOOLBOX_API_URL = `http://${host}:${port}`;
  }

  return env;
};

const runCommand = (label, command, args, env) =>
  new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env,
      stdio: 'inherit'
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      reject(
        new Error(
          `${label} exited with ${signal ? `signal ${signal}` : `code ${code}`}`
        )
      );
    });
  });

const spawnLongRunning = (label, command, args, env) => {
  const child = spawn(command, args, {
    cwd: repoRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[${label}] ${chunk}`);
  });
  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[${label}] ${chunk}`);
  });

  return { label, child };
};

const stopChildren = (children) => {
  for (const { child } of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
};

try {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(usage);
    process.exit(0);
  }

  const env = loadPrivateEnv(options);

  if (!options.skipBuild && !options.webOnly) {
    await runCommand('build:api', 'npm', ['run', 'build:api'], env);
  }

  const children = [];

  if (!options.webOnly) {
    children.push(
      spawnLongRunning(
        'api',
        'npm',
        ['run', 'start', '--workspace', '@private-toolbox/api'],
        env
      )
    );
  }

  if (!options.apiOnly) {
    const webArgs = ['run', 'dev'];
    if (options.webPort) {
      webArgs.push('--', '--host', '127.0.0.1', '--port', options.webPort);
    }
    children.push(spawnLongRunning('web', 'npm', webArgs, env));
  }

  if (children.length === 0) {
    process.stderr.write('No process selected.\n');
    process.exit(1);
  }

  const shutdown = () => {
    stopChildren(children);
  };

  process.on('SIGINT', () => {
    shutdown();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    shutdown();
    process.exit(143);
  });

  await new Promise((resolvePromise, reject) => {
    let settled = false;

    for (const { label, child } of children) {
      child.on('error', (error) => {
        if (settled) return;
        settled = true;
        stopChildren(children);
        reject(error);
      });

      child.on('exit', (code, signal) => {
        if (settled) return;
        settled = true;
        stopChildren(children);

        if (code === 0) {
          resolvePromise();
          return;
        }

        reject(
          new Error(
            `${label} exited with ${
              signal ? `signal ${signal}` : `code ${code}`
            }`
          )
        );
      });
    }
  });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n\n${usage}`);
  process.exit(1);
}
