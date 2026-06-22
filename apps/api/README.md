# Private Toolbox API

Local backend API for shared core tools and tools that need network or server-side capabilities.

It binds to `127.0.0.1` by default.

## Build

```bash
npm install
npm run build:api
```

## Run

```bash
npm run build:api
npm run start --workspace @private-toolbox/api
```

Start API and Web together for local private development:

```bash
npm run dev:private
```

Run API + MCP smoke checks:

```bash
npm run smoke:private
```

Environment:

See [../../.env.example](../../.env.example) for a ready-to-copy private deployment template.

- `PRIVATE_TOOLBOX_API_HOST`, default `127.0.0.1`
- `PRIVATE_TOOLBOX_API_PORT`, default `4317`
- `VITE_PRIVATE_TOOLBOX_API_URL`, default `http://127.0.0.1:4317`, used by the Web app
- `PRIVATE_TOOLBOX_FILE_ROOT`, default current working directory
- `PRIVATE_TOOLBOX_FILE_OUTPUT_DIR`, default `$PRIVATE_TOOLBOX_FILE_ROOT/output`
- `PRIVATE_TOOLBOX_MAX_RENAME_OPERATIONS`, default `500`
- `PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_ENABLED`, default `true`
- `PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_MAX`, default `60`
- `PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_WINDOW_MS`, default `60000`
- `PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_TOOL_OVERRIDES`, JSON object keyed by tool name, for example `{"dns.lookup":{"maxCalls":120,"windowMs":60000}}`
- `PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_DATA_SOURCE_OVERRIDES`, JSON object keyed by data source, for example `{"ippure":{"maxCalls":20,"windowMs":60000}}`
- `PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_IPPURE_MAX` / `PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_IPPURE_WINDOW_MS`
- `PRIVATE_TOOLBOX_NETWORK_RATE_LIMIT_STATE_FILE`, optional JSON state file that keeps rate-limit buckets across API / MCP restarts
- `PRIVATE_TOOLBOX_IPPURE_ENABLED`, default `true`

## Endpoints

- `GET /health`
- `GET /api/tools`
- `POST /api/tools/call`
- `GET /api/dns?name=example.com&type=A`
- `GET /api/ssl?host=example.com&port=443`
- `GET /api/ip/lookup?ip=8.8.8.8`

`POST /api/tools/call` also exposes shared core tools such as `json.format`, `json.minify`, `json.validate`, `json.sort`, `json.escape`, `json.stringify`, `json.compare`, `json.to_csv`, `json.to_excel`, `json.to_xml`, `json.to_yaml`, `yaml.to_json`, `json.to_query`, `query.to_json`, `json.to_types`, `json_schema.validate`, `json_schema.from_json`, `json_schema.mock`, `xml.format`, `xml.minify`, `xml.validate`, `xpath.evaluate`, `csv.to_json`, `tsv.to_json`, `csv.to_xml`, `csv.to_yaml`, `csv.to_tsv`, `csv.change_separator`, `csv.transpose`, `csv.find_incomplete_records`, `base64.encode`, `base64.decode`, `url.encode`, `url.decode`, `number.sum`, `number.random`, `number.byte_convert`, `number.base_convert`, `unit.convert`, `rmb.uppercase`, `roman.convert`, `cidr.calculate`, `color.convert`, `code.format`, `code.minify`, `sql.format`, `sql.minify`, `unicode.encode`, `unicode.decode`, `hex.encode`, `hex.decode`, `hash.text`, `htpasswd.generate`, `timestamp.convert`, `date.diff`, `cron.validate`, `cron.parse`, `cron.template`, `cron.next_runs`, `cron.calendar`, `cron.convert`, `regex.test`, `regex.replace`, `regex.explain`, `regex.to_code`, `regex.visualize`, `robots.generate`, `meta.generate`, `text.diff`, `text.replace`, `text.remove_duplicate_lines`, `text.hidden_chars`, `text.slug`, `text.split`, `text.join`, `text.truncate`, `text.reverse`, `text.uppercase`, `text.lowercase`, `text.title_case`, `text.capitalize`, `text.camel_snake`, `text.full_half_width`, `text.stats`, `list.sort`, `list.reverse`, `list.shuffle`, `list.unique`, `list.most_common`, `list.chunk`, `list.rotate`, `list.truncate`, `jwt.decode`, `jwt.inspect`, `banner.ascii`, `barcode.generate`, `docker_compose.validate`, `docker_compose.format`, `dockerfile.format`, `dockerfile.snippet_generate`, `nginx.format`, `nginx.location_match`, `nginx.snippet_generate`, `password.generate`, `pem.inspect`, `rsa.generate_keypair`, `rsa.inspect_private_key`, `rsa.extract_public_key`, `rsa.encrypt`, `rsa.decrypt`, `rsa.sign`, `rsa.verify`, `uuid.generate`, and `qrcode.generate`, plus `http.request` and `http.status` for Web HTTP tools, `hash.file`, `image.to_base64`, `image.exif`, `image.info`, `image.to_icon`, `qrcode.decode`, `file.rename_batch`, and `file.write_temp` for local file work. Batch rename defaults to dry-run; execution requires the returned `planHash`. Temporary file writes are limited to the configured output directory and avoid overwriting by default.

HTTP online request is exposed by this local API for the Web UI only. It is not exposed to MCP.
