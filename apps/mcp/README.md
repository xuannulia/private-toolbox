# Private Toolbox MCP

Private Toolbox MCP exposes selected deterministic tools from `@private-toolbox/core` and guarded server-side tools from `@private-toolbox/server`.

HTTP online request tools are intentionally not registered. Agents can use `curl` directly.
`enableHttpTools` is kept as a compatibility marker and is always normalized to `false`.

## Build

```bash
npm install
npm run build:mcp
```

## Run

```bash
node apps/mcp/dist/server.js
```

The server uses stdio JSON-RPC. Current implemented methods:

- `initialize`
- `tools/list`
- `tools/call`

Run API + MCP smoke checks:

```bash
npm run smoke:private
```

The smoke check starts the built API and MCP server locally, calls
`json.validate`, verifies the `agent-curated` MCP tool count, and confirms
`http.request` remains API-only.

## Client Config

Generate a ready-to-paste config for Codex, Claude, OpenClaw, or similar MCP clients:

```bash
npm run --silent mcp:client-config
```

The generator defaults to the `agent-curated` profile and includes file-root-limited environment variables. Customize it when needed:

```bash
npm run --silent mcp:client-config -- --profile default-private --file-root /Users/you/private-toolbox-files --output-dir /Users/you/private-toolbox-files/output
```

Most MCP clients that support local stdio servers need the same command and arguments:

```json
{
  "mcpServers": {
    "private-toolbox": {
      "command": "node",
      "args": ["/absolute/path/to/private-toolbox/apps/mcp/dist/server.js"]
    }
  }
}
```

Use this for Codex, Claude, OpenClaw, or similar MCP clients by placing the server entry in that client's MCP configuration file. If the client has a different schema, keep the same executable intent: run `node` with the built `apps/mcp/dist/server.js` file.

If a client supports environment variables in the server entry, a file-root-limited setup looks like this:

```json
{
  "mcpServers": {
    "private-toolbox": {
      "command": "node",
      "args": ["/absolute/path/to/private-toolbox/apps/mcp/dist/server.js"],
      "env": {
        "PRIVATE_TOOLBOX_FILE_ROOT": "/Users/you/private-toolbox-files",
        "PRIVATE_TOOLBOX_FILE_OUTPUT_DIR": "/Users/you/private-toolbox-files/output",
        "PRIVATE_TOOLBOX_MCP_AUDIT_LOG": "stderr"
      }
    }
  }
}
```

## Configuration

The MCP server loads an optional JSON config from `PRIVATE_TOOLBOX_MCP_CONFIG`.
See [../../.env.example](../../.env.example) for a ready-to-copy private deployment template that pairs with these profiles.

Default config is available as [../../config/mcp/default-private.json](../../config/mcp/default-private.json).

Environment overrides:

- `PRIVATE_TOOLBOX_MCP_CONFIG`
- `PRIVATE_TOOLBOX_MCP_ENABLE_CORE_TOOLS`
- `PRIVATE_TOOLBOX_MCP_ENABLE_SERVER_TOOLS`
- `PRIVATE_TOOLBOX_MCP_ENABLE_HTTP_TOOLS`, ignored; HTTP request tools stay disabled for MCP
- `PRIVATE_TOOLBOX_MCP_ALLOWED_RISKS`, comma-separated
- `PRIVATE_TOOLBOX_MCP_ENABLED_TOOLS`, comma-separated allow list
- `PRIVATE_TOOLBOX_MCP_DISABLED_TOOLS`, comma-separated deny list
- `PRIVATE_TOOLBOX_MCP_MAX_OUTPUT_BYTES`
- `PRIVATE_TOOLBOX_MCP_AUDIT_LOG`, `stderr`, `off`, or a JSONL file path

Audit logs record trace id, JSON-RPC request id, client name/version from `initialize`, tool name, source, risk tags, success/failure, duration, error code, and error message. They do not record full inputs or outputs.

## Config Profiles

Available profiles:

- [../../config/mcp/default-private.json](../../config/mcp/default-private.json): all allowed private-use risk groups, no explicit allow list.
- [../../config/mcp/agent-curated.json](../../config/mcp/agent-curated.json): smaller allow list for agent clients; keeps `http.request` out of MCP.

Load a profile:

```bash
PRIVATE_TOOLBOX_MCP_CONFIG=/absolute/path/to/private-toolbox/config/mcp/agent-curated.json node apps/mcp/dist/server.js
```

Agent-curated default tools:

- `rdap.lookup`
- `dns.lookup`
- `ssl.inspect`
- `ip.current`
- `ip.lookup`
- `rsa.generate_keypair`
- `rsa.encrypt`
- `rsa.decrypt`
- `rsa.sign`
- `rsa.verify`
- `password.generate`
- `file.rename_batch`
- `file.write_temp`
- `hash.file`
- `image.to_base64`
- `image.exif`
- `image.info`
- `image.to_icon`
- `qrcode.decode`
- `json.format`
- `json.validate`
- `json.to_types`
- `json.to_excel`
- `json_schema.validate`
- `xpath.evaluate`
- `cron.parse`
- `cron.next_runs`
- `cron.calendar`
- `regex.explain`
- `regex.visualize`
- `docker_compose.validate`
- `dockerfile.format`
- `dockerfile.snippet_generate`
- `nginx.format`
- `nginx.location_match`
- `nginx.snippet_generate`

Default-private exposed tools:

- `json.format`
- `json.minify`
- `json.validate`
- `json.sort`
- `json.escape`
- `json.stringify`
- `json.compare`
- `json.to_csv`
- `json.to_excel`
- `json.to_xml`
- `json.to_yaml`
- `yaml.to_json`
- `json.to_query`
- `query.to_json`
- `json.to_types`
- `json_schema.validate`
- `json_schema.from_json`
- `json_schema.mock`
- `xml.format`
- `xml.minify`
- `xml.validate`
- `xpath.evaluate`
- `csv.to_json`
- `tsv.to_json`
- `csv.to_xml`
- `csv.to_yaml`
- `csv.to_tsv`
- `csv.change_separator`
- `csv.transpose`
- `csv.find_incomplete_records`
- `base64.encode`
- `base64.decode`
- `number.sum`
- `number.random`
- `number.byte_convert`
- `number.base_convert`
- `unit.convert`
- `rmb.uppercase`
- `roman.convert`
- `cidr.calculate`
- `color.convert`
- `code.format`
- `code.minify`
- `sql.format`
- `sql.minify`
- `url.encode`
- `url.decode`
- `unicode.encode`
- `unicode.decode`
- `hex.encode`
- `hex.decode`
- `hash.text`
- `htpasswd.generate`
- `timestamp.convert`
- `date.diff`
- `cron.validate`
- `cron.parse`
- `cron.template`
- `cron.next_runs`
- `cron.calendar`
- `cron.convert`
- `regex.test`
- `regex.replace`
- `regex.explain`
- `regex.to_code`
- `regex.visualize`
- `robots.generate`
- `meta.generate`
- `text.diff`
- `text.replace`
- `text.remove_duplicate_lines`
- `text.hidden_chars`
- `text.slug`
- `text.split`
- `text.join`
- `text.truncate`
- `text.reverse`
- `text.uppercase`
- `text.lowercase`
- `text.title_case`
- `text.capitalize`
- `text.camel_snake`
- `text.full_half_width`
- `text.stats`
- `list.sort`
- `list.reverse`
- `list.shuffle`
- `list.unique`
- `list.most_common`
- `list.chunk`
- `list.rotate`
- `list.truncate`
- `jwt.decode`
- `jwt.inspect`
- `banner.ascii`
- `barcode.generate`
- `docker_compose.validate`
- `docker_compose.format`
- `dockerfile.format`
- `dockerfile.snippet_generate`
- `nginx.format`
- `nginx.location_match`
- `nginx.snippet_generate`
- `password.generate`
- `pem.inspect`
- `rsa.generate_keypair`
- `rsa.inspect_private_key`
- `rsa.extract_public_key`
- `rsa.encrypt`
- `rsa.decrypt`
- `rsa.sign`
- `rsa.verify`
- `uuid.generate`
- `qrcode.generate`
- `qrcode.decode`
- `rdap.lookup`
- `dns.lookup`
- `ssl.inspect`
- `ip.current`
- `ip.lookup`
- `hash.file`
- `image.to_base64`
- `image.exif`
- `image.info`
- `image.to_icon`
- `file.rename_batch`
- `file.write_temp`
