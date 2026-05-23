# Nabu — Architecture

## High-level shape

```
┌─ Claude Desktop / Claude Code ───────────────────────────────┐
│  Conversational interface. Builds estimate JSON, dispatches  │
│  jobs, reads results. Never blocks on Playwright.            │
└───────────────────────────┬──────────────────────────────────┘
                            │ stdio MCP (via bridge)
                            ▼
┌─ Bridge (stdio ↔ HTTP) ──────────────────────────────────────┐
│  Tiny Node/Rust process launched by Claude Desktop.          │
│  Proxies JSON-RPC to the local Nabu MCP HTTP endpoint.       │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTP (localhost:7531)
                            ▼
┌─ Nabu Tauri app ─────────────────────────────────────────────┐
│                                                              │
│  ┌─ MCP server (HTTP) ─────────────────────────────────────┐ │
│  │ Tools generated dynamically from the service catalog.   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ Job queue / executor ──────────────────────────────────┐ │
│  │ Spawns Playwright (sidecar Node) per job. Streams       │ │
│  │ progress events to the UI and to MCP callers.           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ Catalog manager ───────────────────────────────────────┐ │
│  │ Loads & verifies signed service handlers. Polls remote  │ │
│  │ catalog for updates. Hot-reloads MCP tools on change.   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ Storage (SQLite) ──────────────────────────────────────┐ │
│  │ jobs, estimates, settings, catalog_state.               │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ UI (React) ────────────────────────────────────────────┐ │
│  │ Dashboard · Jobs · Services · Settings · Updates.       │ │
│  │ No embedded terminal. Pure desktop console.             │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                            │ spawns
                            ▼
┌─ Playwright sidecar (Node) ──────────────────────────────────┐
│  Reuses handlers from playwright/lib/services/.              │
│  Runs headed or headless per job settings.                   │
└──────────────────────────────────────────────────────────────┘
```

## Why HTTP MCP + bridge instead of stdio MCP

Claude Desktop's stdio MCP servers are spawned and killed by the client. If the MCP *is* the app, closing Claude kills the app. Splitting them:

- The Tauri app runs continuously and owns long-running jobs.
- A 10-line stdio↔HTTP bridge is what Claude Desktop launches.
- Multiple clients (Claude Desktop, Claude Code, future CLI) can connect to the same app instance.

Claude Desktop config:

```json
{
  "mcpServers": {
    "nabu": {
      "command": "npx",
      "args": ["-y", "@arkho/nabu-bridge", "http://localhost:7531/mcp"]
    }
  }
}
```

## MCP tool surface (initial)

Fast / synchronous (return immediately):

- `list_supported_services` — derived from current catalog.
- `get_service_schema(service)` — JSON Schema for parameters.
- `validate_estimate(payload)` — validates without enqueuing.

Asynchronous (job-based):

- `enqueue_estimate_job(payload, options)` → `{ job_id, deep_link, estimated_duration_sec }`.
- `get_job_status(job_id)` → `{ state, progress, current_step, started_at, eta }`.
- `get_job_result(job_id)` → `{ calculator_url, line_items, total_monthly, xlsx_path }`.
- `list_jobs(filter)` — recent jobs, for context across conversations.

State machine for a job: `queued → running → (succeeded | failed | needs_intervention)`.

## Service catalog

The catalog is the single source of truth for what Nabu can estimate. It is versioned, signed, and hot-reloadable.

```json
{
  "version": "2026.05.12",
  "signed_at": "2026-05-12T10:00:00Z",
  "signature": "ed25519:...",
  "services": {
    "ec2": {
      "handler_version": "1.4.0",
      "min_app_version": "0.3.0",
      "schema_ref": "schemas/ec2.json",
      "handler_ref": "handlers/ec2.js",
      "checksum": "sha256:...",
      "status": "stable",
      "last_validated_at": "2026-05-20",
      "tags": ["compute", "core"]
    }
  }
}
```

### Two distribution channels

1. **Embedded catalog** — shipped in the app bundle. Guarantees the app boots with a working set even offline.
2. **Remote catalog** — fetched from a controlled endpoint (e.g. GitHub Releases or S3). Allows shipping new/updated handlers without rebuilding the app.

### Update flow

1. App checks remote `latest.json` on startup and on demand.
2. Diff against local catalog.
3. UI shows pending updates in the **Updates** tab.
4. User approves → app downloads handler files + schemas.
5. Verify Ed25519 signature + per-file SHA-256.
6. Atomic swap of `catalog.json`.
7. MCP server refreshes its tool list. No app restart needed.

### Why version handlers individually

Decoupling handler releases from app releases means we can ship "now we support Bedrock" on a Tuesday without forcing users to install a new binary. The app stays stable; the catalog is alive.

## Security considerations

- Handlers are JavaScript loaded at runtime. Treat the catalog as a code-distribution channel.
- All handlers must be signed with the Nabu publisher key (Ed25519). Unsigned or invalid handlers are rejected and surfaced in the UI.
- Handlers execute inside the Playwright sidecar (separate Node process) with no Tauri IPC access, only Playwright + stdout/stderr.
- The MCP HTTP server binds to `127.0.0.1` only. No external exposure.

## Risks tracked elsewhere

- `calculator.aws` UI drift → see `docs/HANDLER_HEALTH.md` (TBD): scheduled CI runs against the live calculator, flips `status: degraded` in the catalog when a handler breaks.
- Handler version compatibility → `min_app_version` field per handler, app refuses to load incompatible entries and surfaces a "update Nabu" prompt.
