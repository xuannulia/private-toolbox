# Private Toolbox Feature Map

This document is the working feature and layout checklist for the private toolbox fork.

## Product Shape

- Keep OmniTools' existing browser tools unless a feature is explicitly removed.
- Add programmer-focused tools where they are useful for private daily work.
- Prefer local deterministic processing in the browser or `packages/core`.
- Put network, file system, and binary/server-assisted work in `packages/server`.
- Expose a curated MCP surface for agents, but keep the Web UI broader than MCP.
- Keep UI copy short and functional. The first screen should be the toolbox itself, not a marketing landing page.

## Layout Rules

- Home: compact brand line, one search box, common shortcuts, user-type filter, category grid.
- Category pages: searchable list of tools with short one-line descriptions.
- Tool pages: breadcrumb, title, compact inputs, result panel, minimal supporting text.
- Avoid long feature explanations, tutorial cards, privacy nags, or marketing prose in the app UI.
- Do not add visible text that describes how the UI works unless the tool cannot be understood without it.
- Keep card copy brief: title plus short description.
- Use shared layouts such as `ToolInputAndResult` and compact `*ToolControls` wrappers for migrated tools.

## Web Feature Groups

### JSON

- JSON format, minify, validate, sort, escape, stringify, compare.
- JSON to CSV, Excel, XML, YAML, query string, and types.
- YAML to JSON and query string to JSON.
- JSON Schema validator, JSON to JSON Schema, and JSON Schema mock data.

### Network

- HTTP online request: Web/API only, intentionally not exposed to MCP.
- HTTP status checker.
- CIDR calculator.
- DNS lookup.
- SSL/TLS certificate inspection.
- Current public IP through IPPure card data.
- Public IP lookup through the IPPure web search flow. The captured endpoint is `https://ipinfo.io/widget/demo/{ip}`.

### Ops

- Code preview and code format/minify.
- SQL format/minify.
- Docker command cheat sheet.
- Docker Compose format/validate.
- Dockerfile format and Dockerfile snippet generation.
- Nginx format, location match testing, and snippet generation.

### String / Crypto

- Split, join, replace, compare, reverse, truncate, slug, case conversion, hidden-character detection, and duplicate-line removal.
- Regex toolkit: test, replace, explain, code snippets, and visual graph.
- ASCII banner with Chinese-capable fonts.
- Base64, URL, Unicode, hex, text hash.
- Password generator and htpasswd generator.
- JWT inspector and PEM inspector.
- RSA keypair generation, private key inspection, public key extraction, encrypt/decrypt, sign/verify.
- UUID generator.

### Time

- Timestamp/date conversion and date diff.
- Cron parser/validator through Crontab Guru.
- Cron next-runs and calendar preview.
- Existing retained date/time conversion tools.

### Image / QR

- QR code generation with style controls and QR decode.
- Barcode generation.
- Image info, EXIF, image to Base64, image to icon.
- Existing retained image editing/conversion tools: resize, compress, crop, rotate, opacity/color changes, transparency, background removal, image text/OCR, editor, split, PNG tools.

### Data / Documents / Media

- CSV and TSV conversion, validation, separator changes, transpose, row/column utilities.
- XML format, minify, validate, and XPath evaluator.
- Number/list utilities retained from OmniTools plus base/color/byte conversions.
- PDF, video, audio, and general converter tools retained from OmniTools.

## Explicitly Not Included

- ICP/filing lookup.
- Phone-number attribution lookup.
- Local IP attribution database.
- Natural-language-to-Cron generation.
- Online code runner.
- cURL conversion/tool group.
- `http.request` in MCP. Agents should use `curl` directly.

## API / Backend Boundaries

- API binds to `127.0.0.1` by default.
- Network tools validate public targets and block private/reserved targets unless configured otherwise.
- IPPure is controlled by `PRIVATE_TOOLBOX_IPPURE_ENABLED` and IPPure rate-limit settings.
- File tools are constrained by `PRIVATE_TOOLBOX_FILE_ROOT` and output under `PRIVATE_TOOLBOX_FILE_OUTPUT_DIR`.
- Batch rename defaults to dry-run and requires the returned `planHash` for execution.

## MCP Policy

Agent-curated MCP keeps deterministic and high-value private tools enabled:

- Network: `dns.lookup`, `ssl.inspect`, `ip.lookup`.
- Crypto/secrets: `rsa.generate_keypair`, `rsa.encrypt`, `rsa.decrypt`, `rsa.sign`, `rsa.verify`, `password.generate`.
- Files/images: `file.rename_batch`, `file.write_temp`, `hash.file`, `image.to_base64`, `image.exif`, `image.info`, `image.to_icon`, `qrcode.decode`.
- Data/dev: `json.format`, `json.validate`, `json.to_types`, `json.to_excel`, `json_schema.validate`, `xpath.evaluate`.
- Scheduling/regex/ops: `cron.parse`, `cron.next_runs`, `cron.calendar`, `regex.explain`, `regex.visualize`, `docker_compose.validate`, `dockerfile.format`, `dockerfile.snippet_generate`, `nginx.format`, `nginx.location_match`, `nginx.snippet_generate`.

MCP must keep `http.request` disabled even if config or environment variables try to enable it.

## Verification Checklist

- `npm run verify:private`
- `npm test -- --run apps/mcp/src/config.test.ts src/tools/index.test.ts`
- `npm test -- --run packages/server/src/tools/ip.test.ts packages/server/src/config.test.ts packages/server/src/runtime.test.ts`
- `npm run typecheck`
- `npm run audit:ui`
- `npm run audit:tools`
- `npm run smoke:web-ui`
  Covers home, Network/Ops category pages, selected desktop/mobile tool pages, and a real PNG upload on image-to-icon.
- `npm run build:api`
- `npm run build:mcp`
- `npm run smoke:private`
- `npm run build`
