# Nabu — Architecture

## High-level shape

```
┌─ Claude Desktop / Claude Code ───────────────────────────────┐
│  Conversational interface. Builds estimate JSON, dispatches  │
│  jobs, reads results. Never blocks on Playwright.            │
└───────────────────────────┬──────────────────────────────────┘
                            │ stdio MCP (via @arkho/nabu-bridge)
                            ▼
┌─ bridge/bridge.js ───────────────────────────────────────────┐
│  Tiny Node process launched by Claude Desktop. Implements    │
│  the MCP server contract over stdio and proxies tools/list   │
│  and tools/call to the running Nabu MCP over HTTP.           │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTP (127.0.0.1:7531, multi-session)
                            ▼
┌─ Nabu Tauri app (app/) ──────────────────────────────────────┐
│                                                              │
│  ┌─ MCP server (mcp/server.js) ────────────────────────────┐ │
│  │ HTTP /mcp using StreamableHTTPServerTransport plus a    │ │
│  │ REST companion: /health, /services, /services/:name,    │ │
│  │ /jobs, /jobs/:id, /reload, /install.                    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ Catalog (mcp/catalog/) ────────────────────────────────┐ │
│  │ Stateful loader. Embedded catalog.json + Zod schemas    │ │
│  │ overlaid by a remote bundle pulled from                 │ │
│  │ <app_config_dir>/remote-catalog/. Verifies Ed25519      │ │
│  │ signature + per-file SHA-256 on load. Reloadable.       │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ Job queue / executor (mcp/jobs/) ──────────────────────┐ │
│  │ SQLite-backed queue via Node's built-in node:sqlite.    │ │
│  │ Per job: spawns runner/run.js as a child process,       │ │
│  │ pipes the catalog-resolved spec in on stdin, parses     │ │
│  │ NDJSON events back out (log/result/error).              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ Settings (mcp/jobs/db.js + tauri-plugin-sql) ──────────┐ │
│  │ Shared SQLite DB at <app_config_dir>/nabu.db.           │ │
│  │ tauri-plugin-sql owns the settings table; the MCP       │ │
│  │ owns jobs/job_logs/job_results.                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ UI (app/src/) ─────────────────────────────────────────┐ │
│  │ Dashboard · Jobs · Services · Updates · Settings.       │ │
│  │ Pure desktop console — no embedded terminal.            │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                            │ spawn `node runner/run.js` per job
                            ▼
┌─ Playwright sidecar (runner/) ───────────────────────────────┐
│  runner/run.js reads {jobId, services[], options} on stdin,  │
│  dynamically imports handler_path for each service, and      │
│  hands the resolved list to createEstimate() in              │
│  runner/lib/calculator.js. Each service module exports       │
│  {id, adapter, handler} and is self-contained.               │
└──────────────────────────────────────────────────────────────┘
```

## Why HTTP MCP + bridge instead of stdio MCP

Claude Desktop's stdio MCP servers are spawned and killed by the client. If the MCP *is* the app, closing Claude kills the app. Splitting them:

- The Tauri app runs continuously and owns long-running jobs.
- A small stdio↔HTTP bridge is what Claude Desktop launches.
- Multiple clients (Claude Desktop, Claude Code, future CLI) can connect to the same app instance through their own MCP sessions.

Claude Desktop config:

```json
{
  "mcpServers": {
    "nabu": {
      "command": "node",
      "args": ["/absolute/path/to/nabu/bridge/bridge.js"]
    }
  }
}
```

## Why a separate `runner/` package

Earlier drafts had the MCP load Playwright in-process. That coupled the protocol layer to a >150 MB browser dependency, blocked the MCP event loop during a job, and made parallel jobs impossible. The current split keeps `mcp/` lean (no `playwright` dep) and treats the runner as a per-job sidecar. The MCP resolves each service to its `handlerPath` via the catalog and passes that path to the runner; the runner does the dynamic import.

## MCP tool surface (shipped)

Fast / synchronous:

- `list_supported_services` — derived from the active catalog (embedded + overlay).
- `get_service_schema(service)` — JSON Schema for parameters.
- `validate_estimate({service, params})` — returns normalized params or per-field errors.
- `get_version()` — server name and version.

Job-based:

- `enqueue_estimate_job({service|services[], params|services, options})` — single or combined estimates. Validates params against the catalog Zod schema; returns a `job_id`.
- `get_job_status(job_id)` — current state, started_at, finished_at, error.
- `get_job_result(job_id)` — calculator_url, total_monthly, line_items, xlsx_path (xlsx pending Milestone 4).
- `list_jobs({limit?})` — recent jobs, newest first.

State machine for a job: `queued → running → (succeeded | failed | needs_intervention)`.

## REST companion (consumed by the webview)

- `GET /health` — `{ ok, name, version, catalog_version }`. Polled every 2s by the status bar.
- `GET /services` — listing with `source: embedded | remote` per entry.
- `GET /services/:name` — `{ name, meta, schema }` for the schema detail panel.
- `GET /jobs`, `GET /jobs/:id` — for the Jobs tab.
- `POST /jobs/:id/retry` — clones a job with the same params/options and a new UUID; the new job's name gets a "(retry)" suffix. Surfaced by the Retry button that appears on failed jobs.
- `DELETE /jobs/:id`, `DELETE /jobs { ids[] | all }` — used by the delete UI.
- `POST /reload` — re-imports the catalog from disk; returns `{ ok, version, count }`.
- `POST /install { base_url | tarball_url }` — downloads `latest.json` + `.sig` + `nabu-catalog.tar.gz`, verifies Ed25519 + SHA-256, atomic-renames into `NABU_REMOTE_CATALOG_DIR`, then reloads.

## Service catalog

The catalog is the single source of truth for what Nabu can estimate. It is versioned, signed, and hot-reloadable.

```json
{
  "catalog_version": "0.1.0+2026-05-23T09:04:00.604Z",
  "released_at": "2026-05-23T09:04:00.604Z",
  "min_app_version": "0.1.0",
  "services": {
    "ec2": {
      "handler_version": "0.1.0-0185d35b",
      "schema_ref": "schemas/ec2.js",
      "handler_ref": "handlers/ec2.js",
      "schema_sha256": "a92c47…",
      "handler_sha256": "0185d3…",
      "status": "schema-only",
      "tags": ["compute", "core"]
    }
  }
}
```

### Two distribution channels

1. **Embedded catalog** — `mcp/catalog/catalog.json` + the Zod schemas, shipped in the binary. Guarantees the app boots with a working set even offline.
2. **Remote catalog** — pulled from a controlled endpoint (GitHub Releases today, S3/CloudFront tomorrow if needed). Overlays the embedded catalog: same-name entries override, new entries add.

### Update flow

1. User clicks **Install latest release** in the Updates tab (or `POST /install { base_url }` directly).
2. MCP fetches `latest.json`, `latest.json.sig`, `nabu-catalog.tar.gz` into a staging tmpdir.
3. Ed25519 signature on `latest.json` verified against the embedded pubkey (`mcp/sign/pubkey.js`).
4. Tarball extracted; per-file SHA-256 recomputed and compared with the signed index.
5. Atomic `rename()` from staging to `NABU_REMOTE_CATALOG_DIR`. Previous overlay backed up to `.previous` and deleted on success.
6. `reload()` re-imports each schema with cache-busting query params; the MCP catalog reflects the new entries.
7. Tools advertised through MCP refresh automatically the next time the client lists them; the bridge picks up the new tool surface without reconnecting.

### Why version handlers individually

Decoupling handler releases from app releases means we can ship "now we support Bedrock AgentCore" on a Tuesday without forcing users to install a new binary. The app stays stable; the catalog is alive.

The publisher derives `handler_version` from the file's SHA-256 prefix (`0.1.0-<first 8 hex chars>`). Re-publishing without changes keeps the version stable; a real edit to the handler produces a fresh version. The embedded catalog ships a `"0.0.0"` placeholder per service — it's only visible until a remote release is installed.

## Security considerations

- Handlers are JavaScript loaded at runtime. The catalog is treated as a code-distribution channel.
- The release manifest (`latest.json`) is signed with an Ed25519 keypair. The public half ships in `mcp/sign/pubkey.js`; the private half is held in a GitHub Actions secret named `NABU_RELEASE_PRIVATE_KEY` (and locally in `.env.local`).
- Per-file SHA-256 in the signed manifest is verified after extraction so a partial download or a swapped asset is rejected even though the index signature would have been valid.
- Handlers run inside the Playwright sidecar (a child Node process per job) with no Tauri IPC access — just Playwright + stdin/stdout.
- The MCP HTTP server binds to `127.0.0.1` only. No external exposure.
- Bundling deps (zod) into schemas at publish time so an installed bundle never needs to escape its directory for module resolution — that side-steps a class of supply-chain games around symlinked node_modules.

## Risks tracked elsewhere

- `calculator.aws` UI drift → handlers carry defensive selectors with comments explaining why. A future health check (Milestone 5) will run scheduled jobs against the live calculator and flip a service's `status` to `degraded` automatically.
- Handler version compatibility → `min_app_version` field per release; older apps refuse to load incompatible bundles and surface an "update Nabu" prompt.
- Cross-platform `tar` for `POST /install` → currently shells out to the system `tar`. macOS and Windows 10+ ship one. A pure-JS untar is a follow-up if Linux distros without `tar` show up as users.
