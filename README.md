# Nabu

Desktop app (Tauri) + local MCP server for generating native, editable AWS cost estimates on calculator.aws via Playwright automation.

Nabu replaces the original `aws-calculator-mcp` synchronous MCP with a hybrid model:

- **Tauri desktop app** owns the long-running Playwright jobs, persists state, surfaces live progress, and manages the catalog of supported services.
- **Local MCP server** (exposed by the app) lets Claude Desktop / Claude Code drive the app conversationally — building the estimate JSON, enqueuing jobs, reading results — without blocking the chat on minutes-long browser automations.

## Status

Milestones 0–3 of `docs/ROADMAP.md` are shipped (2026-05-23):

- 26 AWS services in the catalog (every legacy handler migrated to a self-contained `{id, adapter, handler}` module under `runner/lib/services/`).
- MCP server with 8 tools (`list_supported_services`, `get_service_schema`, `validate_estimate`, `enqueue_estimate_job`, `get_job_status`, `get_job_result`, `list_jobs`, `get_version`).
- REST companion endpoints for the desktop UI: `/health`, `/services`, `/services/:name`, `/jobs`, `/jobs/:id`, `/reload`, `/install`.
- Real-Playwright execution path validated against `calculator.aws` for multi-service estimates up to 13 services in one job.
- Remote catalog overlay with Ed25519 signature verification + per-file SHA-256, downloadable in one click from a GitHub Releases bundle and hot-reloaded into the running MCP without a restart.

See `docs/ROADMAP.md` for the milestone breakdown, `docs/ARCHITECTURE.md` for the design, and `docs/DECISIONS.md` for the why behind each choice.

## Repo layout

```
mcp/         Node MCP server (HTTP + stdio). Catalog, tools, /install, /reload.
  catalog/   Embedded catalog.json + Zod schemas per service.
  jobs/      SQLite-backed queue, executor, store.
  sign/      Ed25519 wrapper + embedded release pubkey.
  tools/     keygen + publish CLIs.
runner/      Playwright sidecar. One module per service:
  lib/services/<name>.js   exports {id, adapter, handler}.
  lib/calculator.js        orchestrator (browser launch, navigation, save, share).
bridge/      Thin stdio↔HTTP proxy that Claude Desktop launches.
app/         Tauri 2 + React 19 + Vite shell. Sidebar/Statusbar UI.
playbooks/   Per-service functional notes (selectors, wizard quirks).
docs/        Architecture, decisions, roadmap, product spec.
```

## Local development

```bash
# Install all workspaces (mcp + runner + bridge + app)
pnpm install

# Start the Tauri app (spawns the MCP sidecar)
pnpm -C app tauri dev
```

The MCP picks up two env vars from the Tauri parent process:

- `NABU_DB_PATH` — where to write the SQLite database (settings + jobs).
- `NABU_REMOTE_CATALOG_DIR` — where remote catalog overlays are unpacked.

Both default sensibly when running standalone.

## Run the MCP standalone

```bash
pnpm -C mcp start            # stdio mode
pnpm -C mcp start:http       # HTTP mode on 127.0.0.1:7531
pnpm -C mcp test             # node:test suite (17 tests)
pnpm -C mcp inspect          # launches the official MCP Inspector
```

## Publishing a catalog release

Every service in `mcp/catalog/` plus its handler in `runner/lib/services/` can be packaged into a signed bundle:

```bash
pnpm -C mcp release [services...]
# -> mcp/dist/release/{latest.json, latest.json.sig, schemas/, handlers/}
```

The local publisher reads the signing key from `.env.local` (`NABU_RELEASE_PRIVATE_KEY`). Pushing a tag `catalog-v*` to GitHub triggers `.github/workflows/release.yml`, which runs the same publisher in CI and attaches the bundle to a GitHub Release.

Users install a release with a single click on the **Updates** tab in the app, or with a `POST /install { base_url }` against the running MCP.

## Wire it into Claude Desktop

The app does it for you: open the **Settings** tab, find the *Claude Desktop integration* card, click **Install into Claude Desktop**. The Tauri side detects the OS, resolves the right config path (`~/Library/Application Support/Claude/`, `%APPDATA%/Claude/`, or `$XDG_CONFIG_HOME/Claude/`), backs up any existing config to `claude_desktop_config.json.bak.<unix_ts>`, and merges in:

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

Restart Claude Desktop afterwards. The bridge proxies stdio JSON-RPC to the HTTP MCP on `127.0.0.1:7531`. Removing the entry later is a one-click action on the same card.

## Git hooks

This repo ships a versioned `.githooks/pre-commit` that runs `pnpm -C mcp test` whenever something under `mcp/` is staged. Activate it once per clone:

```bash
git config core.hooksPath .githooks
```

## License

Apache-2.0 (see `LICENSE`).
