# Private Toolbox

Private Toolbox is a self-hosted private tools site based on OmniTools. It keeps the existing browser-side tools, adds backend-assisted tools, and exposes a curated MCP server for personal agents.

The project is optimized for private use:

- Web tools stay fast and direct.
- HTTP online request is available to Web UI / API only.
- MCP intentionally does not expose `http.request`; agents can use `curl`.
- Network, file, and secret-related MCP tools are configurable.
- Web tools carry internal processing metadata for local/backend/network flow and API/MCP availability.
- Original OmniTools attribution is kept in [NOTICE.md](NOTICE.md).

## Workspaces

- `src/`: React web app.
- `packages/core`: shared deterministic tools for Web / API / MCP.
- `packages/server`: guarded server-side tools such as RDAP, DNS, SSL, IP lookup, file hash, image icon conversion, QR decode, batch rename, and temporary file writing.
- `apps/api`: local HTTP API for Web/server-assisted tools.
- `apps/mcp`: stdio MCP server for personal agent clients.

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev:private
```

`dev:private` loads `.env.example` and `.env.local`, builds the local API, starts API and Vite together, and points the Web app at the configured API URL.

Use fixed ports when needed:

```bash
npm run dev:private -- --api-port 4327 --web-port 5177
```

For frontend-only OmniTools-style development:

```bash
npm run dev
```

## Private Deployment

Common environment variables are listed in [.env.example](.env.example). The defaults bind local services to `127.0.0.1`, write private file outputs under `./output/private-toolbox-files`, keep network rate-limit state in that output folder, and send MCP audit logs to `stderr`.

Build the deployable pieces:

```bash
npm run build
npm run build:api
npm run build:mcp
npm run smoke:private
```

Run local private services in separate shells:

```bash
npm run serve
npm run start --workspace @private-toolbox/api
node apps/mcp/dist/server.js
```

API defaults:

- Host: `127.0.0.1`
- Port: `4317`
- Health: `GET /health`
- Tool list: `GET /api/tools`
- Tool call: `POST /api/tools/call`

See [apps/api/README.md](apps/api/README.md) for endpoint details.

## Feature Map

The current feature grouping, excluded items, layout rules, API boundaries, and MCP exposure policy are tracked in [docs/feature-map.md](docs/feature-map.md).

## MCP Integration

Build first:

```bash
npm run build:mcp
```

Generate a ready-to-paste client config:

```bash
npm run --silent mcp:client-config
```

MCP uses stdio JSON-RPC. Most clients need the same command/args pair:

```json
{
  "mcpServers": {
    "private-toolbox": {
      "command": "node",
      "args": ["/absolute/path/to/private-toolbox/apps/mcp/dist/server.js"],
      "env": {
        "PRIVATE_TOOLBOX_MCP_CONFIG": "/absolute/path/to/private-toolbox/config/mcp/agent-curated.json",
        "PRIVATE_TOOLBOX_FILE_ROOT": "/absolute/path/to/private-toolbox/output/private-toolbox-files",
        "PRIVATE_TOOLBOX_FILE_OUTPUT_DIR": "/absolute/path/to/private-toolbox/output/private-toolbox-files/output",
        "PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_STATE_FILE": "/absolute/path/to/private-toolbox/output/private-toolbox-files/rate-limit-state.json",
        "PRIVATE_TOOLBOX_MCP_AUDIT_LOG": "stderr"
      }
    }
  }
}
```

For Codex, Claude, OpenClaw, or similar clients, place that server entry in the client's MCP configuration file and use absolute paths. If the client uses a different schema, keep the same executable intent: `node` plus `apps/mcp/dist/server.js`.

Reusable MCP config profiles:

- [config/mcp/default-private.json](config/mcp/default-private.json): default private-use profile.
- [config/mcp/agent-curated.json](config/mcp/agent-curated.json): smaller allow list for Codex, Claude, OpenClaw, and similar agents.

Generate a config with a different profile or file root:

```bash
npm run --silent mcp:client-config -- --profile default-private --file-root /Users/you/private-toolbox-files
```

Important MCP behavior:

- `enableHttpTools` is always normalized to `false`.
- `PRIVATE_TOOLBOX_MCP_ENABLE_HTTP_TOOLS=true` is ignored.
- Audit logs record tool name, source, risks, duration, and status, not full inputs or outputs.

See [apps/mcp/README.md](apps/mcp/README.md) for the current exposed tool list and environment overrides.

## Common Commands

| Command                              | Purpose                                             |
| ------------------------------------ | --------------------------------------------------- |
| `npm run dev:private`                | Start API and Web together with local env loading.  |
| `npm run dev`                        | Start frontend-only Vite development.               |
| `npm run build`                      | Typecheck and build the Web app.                    |
| `npm run build:api`                  | Build core, server, and API workspaces.             |
| `npm run build:mcp`                  | Build core, server, and MCP workspaces.             |
| `npm run audit:ui`                   | Audit focused tool pages for noisy UI regressions.  |
| `npm run audit:tools`                | Audit Web/API/MCP tool inventory and boundaries.    |
| `npm run smoke:web-ui`               | Run desktop/mobile browser smoke for key pages.     |
| `npm run smoke:private`              | Build API/MCP and run local API + MCP smoke checks. |
| `npm run verify:private`             | Run typecheck, audits, Web/API/MCP smoke checks.    |
| `npm run typecheck`                  | Typecheck the Web app.                              |
| `npm run typecheck:core`             | Typecheck shared deterministic tools.               |
| `npm run typecheck:api`              | Build server dependencies and typecheck API.        |
| `npm run typecheck:mcp`              | Build server dependencies and typecheck MCP.        |
| `npm run test -- --run`              | Run Vitest once.                                    |
| `npm run --silent mcp:client-config` | Print a ready-to-paste MCP client config.           |

Expected warnings during verification:

- Vite CJS API deprecation.
- Stale `baseline-browser-mapping` / Browserslist data.
- Large Vite chunks from existing media/PDF/image tooling.
- Node `punycode` deprecation in some tests.

## Direct API / MCP Runs

API:

```bash
npm run build:api
npm run start --workspace @private-toolbox/api
```

MCP:

```bash
PRIVATE_TOOLBOX_MCP_CONFIG=/absolute/path/to/private-toolbox/config/mcp/agent-curated.json node apps/mcp/dist/server.js
```

## Notes

- This fork is private-use first; UI copy should stay short and functional.
- New deterministic logic should live in `packages/core`.
- Tools that need network, filesystem, or binary handling should live in `packages/server`.
- Web UI can expose HTTP online request through API, but MCP should not expose it.

## License

MIT. See [LICENSE](LICENSE).
