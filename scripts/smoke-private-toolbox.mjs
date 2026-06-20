import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const nodeBin = process.execPath;

const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const getFreePort = async () => {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  server.close();
  await once(server, 'close');
  return port;
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {})
    }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  return {
    status: response.status,
    ok: response.ok,
    body
  };
};

const waitForApi = async (baseUrl) => {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < 10_000) {
    try {
      const response = await fetchJson(`${baseUrl}/health`);
      if (response.ok && response.body?.ok === true) return;
      lastError = new Error(`Unexpected health response: ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await wait(150);
  }

  throw lastError ?? new Error('API did not become ready');
};

const terminateProcess = async (child) => {
  if (child.exitCode !== null || child.signalCode !== null) return;

  child.kill('SIGTERM');

  const timeout = setTimeout(() => {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
    }
  }, 2_000);

  try {
    await once(child, 'exit');
  } finally {
    clearTimeout(timeout);
  }
};

const createMcpClient = (child) => {
  const lineReader = createInterface({
    input: child.stdout,
    crlfDelay: Infinity
  });
  const pending = new Map();
  let nextId = 1;

  lineReader.on('line', (line) => {
    if (!line.trim()) return;

    let message;
    try {
      message = JSON.parse(line);
    } catch (error) {
      throw new Error(`Invalid MCP JSON line: ${line}`);
    }

    const request = pending.get(message.id);
    if (!request) return;

    pending.delete(message.id);
    request.resolve(message);
  });

  const request = (method, params = {}) =>
    new Promise((resolveRequest, rejectRequest) => {
      const id = nextId++;
      const timeout = setTimeout(() => {
        pending.delete(id);
        rejectRequest(new Error(`MCP request timed out: ${method}`));
      }, 10_000);

      pending.set(id, {
        resolve: (message) => {
          clearTimeout(timeout);
          resolveRequest(message);
        }
      });

      child.stdin.write(
        `${JSON.stringify({
          jsonrpc: '2.0',
          id,
          method,
          params
        })}\n`,
        (error) => {
          if (!error) return;
          clearTimeout(timeout);
          pending.delete(id);
          rejectRequest(error);
        }
      );
    });

  return {
    request,
    close: () => lineReader.close()
  };
};

const runApiSmoke = async () => {
  const port = await getFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(nodeBin, ['apps/api/dist/server.js'], {
    cwd: rootDir,
    env: {
      ...process.env,
      PRIVATE_TOOLBOX_API_HOST: '127.0.0.1',
      PRIVATE_TOOLBOX_API_PORT: String(port)
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await waitForApi(baseUrl);

    const toolsResponse = await fetchJson(`${baseUrl}/api/tools`);
    assert(toolsResponse.ok, 'API /api/tools should return HTTP 200');
    const apiToolNames = new Set(
      toolsResponse.body.tools.map((tool) => tool.name)
    );
    assert(apiToolNames.has('json.validate'), 'API should expose json.validate');
    assert(apiToolNames.has('http.request'), 'API should expose http.request');
    assert(apiToolNames.has('http.status'), 'API should expose http.status');

    const callResponse = await fetchJson(`${baseUrl}/api/tools/call`, {
      method: 'POST',
      body: JSON.stringify({
        name: 'json.validate',
        arguments: {
          text: '{"ok":true}'
        }
      })
    });
    assert(callResponse.ok, 'API tool call should return HTTP 200');
    assert(callResponse.body.ok === true, 'API json.validate should succeed');
    assert(
      callResponse.body.result.valid === true,
      'API json.validate should return a valid result'
    );

    return {
      toolCount: apiToolNames.size
    };
  } catch (error) {
    if (stderr.trim()) {
      console.error(stderr.trim());
    }
    throw error;
  } finally {
    await terminateProcess(child);
  }
};

const runMcpSmoke = async () => {
  const configPath = resolve(rootDir, 'config/mcp/agent-curated.json');
  const child = spawn(nodeBin, ['apps/mcp/dist/server.js'], {
    cwd: rootDir,
    env: {
      ...process.env,
      PRIVATE_TOOLBOX_MCP_CONFIG: configPath,
      PRIVATE_TOOLBOX_MCP_AUDIT_LOG: 'off'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  const client = createMcpClient(child);
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  try {
    const initialize = await client.request('initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: {
        name: 'private-toolbox-smoke',
        version: '0.1.0'
      }
    });
    assert(!initialize.error, `MCP initialize failed: ${initialize.error}`);
    assert(
      initialize.result?.serverInfo?.name === 'private-toolbox-mcp',
      'MCP initialize should return server info'
    );

    const toolsList = await client.request('tools/list');
    assert(!toolsList.error, `MCP tools/list failed: ${toolsList.error}`);
    const mcpToolNames = new Set(
      toolsList.result.tools.map((tool) => tool.name)
    );
    assert(mcpToolNames.size === 36, 'Agent-curated MCP should expose 36 tools');
    assert(mcpToolNames.has('json.validate'), 'MCP should expose json.validate');
    assert(mcpToolNames.has('dns.lookup'), 'MCP should expose dns.lookup');
    assert(!mcpToolNames.has('http.request'), 'MCP must not expose http.request');
    assert(!mcpToolNames.has('http.status'), 'MCP must not expose http.status');

    const validJson = await client.request('tools/call', {
      name: 'json.validate',
      arguments: {
        text: '{"ok":true}'
      }
    });
    assert(!validJson.error, 'MCP json.validate call should not return JSON-RPC error');
    assert(
      validJson.result?.structuredContent?.valid === true,
      'MCP json.validate should return structured valid=true'
    );

    const blockedHttp = await client.request('tools/call', {
      name: 'http.request',
      arguments: {
        url: 'https://example.com'
      }
    });
    assert(blockedHttp.error, 'MCP http.request should be rejected');
    assert(
      blockedHttp.error.message.includes('Unknown tool: http.request'),
      'MCP http.request should be rejected as unknown'
    );

    return {
      toolCount: mcpToolNames.size
    };
  } catch (error) {
    if (stderr.trim()) {
      console.error(stderr.trim());
    }
    throw error;
  } finally {
    client.close();
    await terminateProcess(child);
  }
};

const main = async () => {
  const api = await runApiSmoke();
  const mcp = await runMcpSmoke();

  console.log(
    JSON.stringify(
      {
        ok: true,
        api,
        mcp
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
