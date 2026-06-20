import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const readJson = (path) => JSON.parse(readFileSync(path, 'utf-8'));

const listFiles = (dir, predicate) => {
  const entries = readdirSync(dir);
  const files = [];

  for (const entry of entries) {
    const path = join(dir, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      files.push(...listFiles(path, predicate));
    } else if (!predicate || predicate(path)) {
      files.push(path);
    }
  }

  return files;
};

const loadRegistries = async () => {
  const core = await import(
    pathToFileURL(resolve(rootDir, 'packages/core/dist/registry.js')).href
  );
  const server = await import(
    pathToFileURL(resolve(rootDir, 'packages/server/dist/registry.js')).href
  );

  return {
    coreTools: core.coreTools,
    serverTools: server.serverTools
  };
};

const parseWebTools = () => {
  const toolsDir = resolve(rootDir, 'src/pages/tools');
  const metaFiles = listFiles(toolsDir, (path) => path.endsWith('/meta.ts'));

  return metaFiles
    .map((file) => {
      const text = readFileSync(file, 'utf-8');
      const categoryMatch = text.match(/defineTool\('([^']+)'/);
      const pathMatch = text.match(/path:\s*'([^']+)'/);
      const nameMatch = text.match(/name:\s*'([^']+)'/);

      assert(
        categoryMatch && pathMatch,
        `Unable to parse tool metadata: ${relative(rootDir, file)}`
      );

      const category = categoryMatch[1];
      const path = `${category}/${pathMatch[1]}`;

      return {
        path,
        category,
        nameKey: nameMatch?.[1] ?? null,
        metaFile: relative(rootDir, file)
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
};

const parseProcessingMappings = () => {
  const text = readFileSync(resolve(rootDir, 'src/tools/processing.ts'), 'utf-8');
  const matches = [...text.matchAll(/'([^']+)':\s*\[/g)];

  return new Set(matches.map((match) => match[1]));
};

const summarizeByCategory = (tools) =>
  Object.fromEntries(
    [...tools.reduce((map, tool) => {
      map.set(tool.category, (map.get(tool.category) ?? 0) + 1);
      return map;
    }, new Map())].sort(([left], [right]) => left.localeCompare(right))
  );

const collectToolNames = (tools, channel) =>
  tools
    .filter((tool) => tool.channels.includes(channel))
    .map((tool) => tool.name)
    .sort();

const findDuplicates = (items) => {
  const seen = new Set();
  const duplicates = new Set();

  for (const item of items) {
    if (seen.has(item)) {
      duplicates.add(item);
    } else {
      seen.add(item);
    }
  }

  return [...duplicates].sort();
};

const main = async () => {
  const { coreTools, serverTools } = await loadRegistries();
  const webTools = parseWebTools();
  const processingMappings = parseProcessingMappings();
  const webPaths = new Set(webTools.map((tool) => tool.path));

  const duplicateWebPaths = findDuplicates(webTools.map((tool) => tool.path));
  const staleProcessingMappings = [...processingMappings].filter(
    (path) => !webPaths.has(path)
  );
  const mappedWebTools = webTools.filter((tool) =>
    processingMappings.has(tool.path)
  );

  const apiTools = collectToolNames([...coreTools, ...serverTools], 'api');
  const registeredMcpTools = collectToolNames(
    [...coreTools, ...serverTools],
    'mcp'
  );
  const agentCurated = readJson(resolve(rootDir, 'config/mcp/agent-curated.json'));
  const defaultPrivate = readJson(
    resolve(rootDir, 'config/mcp/default-private.json')
  );
  const registeredMcpNames = new Set(registeredMcpTools);
  const agentCuratedEnabled = agentCurated.enabledTools ?? [];
  const missingAgentTools = agentCuratedEnabled.filter(
    (name) => !registeredMcpNames.has(name)
  );
  const forbiddenAgentTools = agentCuratedEnabled.filter((name) =>
    name.startsWith('http.')
  );

  assert(duplicateWebPaths.length === 0, 'Duplicate Web tool paths found');
  assert(
    staleProcessingMappings.length === 0,
    `Processing mappings reference missing Web tools: ${staleProcessingMappings.join(
      ', '
    )}`
  );
  assert(
    missingAgentTools.length === 0,
    `Agent MCP profile references unknown tools: ${missingAgentTools.join(', ')}`
  );
  assert(
    forbiddenAgentTools.length === 0,
    `Agent MCP profile must not expose HTTP tools: ${forbiddenAgentTools.join(
      ', '
    )}`
  );
  assert(
    agentCurated.enableHttpTools === false &&
      defaultPrivate.enableHttpTools === false,
    'MCP profiles must keep enableHttpTools=false'
  );
  assert(apiTools.includes('http.request'), 'API should expose http.request');
  assert(
    !registeredMcpTools.includes('http.request'),
    'Registered MCP tools must not include http.request'
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        web: {
          total: webTools.length,
          mapped: mappedWebTools.length,
          webOnly: webTools.length - mappedWebTools.length,
          categories: summarizeByCategory(webTools)
        },
        api: {
          total: apiTools.length,
          includesHttpRequest: apiTools.includes('http.request'),
          includesHttpStatus: apiTools.includes('http.status')
        },
        mcp: {
          registeredTotal: registeredMcpTools.length,
          agentCuratedTotal: agentCuratedEnabled.length,
          agentCuratedHttpTools: forbiddenAgentTools
        }
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
