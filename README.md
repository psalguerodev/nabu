# Nabu

Desktop app (Tauri) + local MCP server for generating native, editable AWS cost estimates on calculator.aws via Playwright automation.

Nabu replaces the original `aws-calculator-mcp` synchronous MCP with a hybrid model:

- **Tauri desktop app** owns the long-running Playwright jobs, persists state, surfaces live progress, and manages the catalog of supported services.
- **Local MCP server** (exposed by the app) lets Claude Desktop / Claude Code drive the app conversationally — building the estimate JSON, enqueuing jobs, reading results — without blocking the chat on minutes-long browser automations.

## Why a new repo

The legacy `aws-calculator-mcp` mixes fast synchronous tools (`search_services`, `get_service_schema`, `configure_service`) with slow Playwright execution inside a single stdio MCP. That causes timeouts, token waste while waiting, and no UX for progress or manual intervention.

Nabu separates concerns:

1. Fast validation/schema tools stay synchronous in the MCP.
2. Playwright execution moves into the Tauri app, exposed via `enqueue_estimate_job` → `get_job_status` → `get_job_result`.

## Status

Bootstrap. Minimum scaffold:

- `mcp/` — minimal MCP server exposing only `list_services` (stdio, Node).
- `playwright/lib/` — service handlers carried over from `aws-calculator-mcp` (source of truth for what `list_services` returns).
- `playbooks/` — per-service functional definitions (UI selectors, wizard steps, edge cases).
- `.claude/skills/aws-calc-train/` — Claude Code skill for training new service handlers end-to-end (discover UI → write handler → register → test).
- `docs/` — architecture, product, roadmap, and decision log.

See `docs/ARCHITECTURE.md` for the target design and `docs/ROADMAP.md` for the MVP plan.

## Run the MCP (smoke test)

```bash
cd mcp
pnpm install
pnpm start
```

Wire it into Claude Desktop:

```json
{
  "mcpServers": {
    "nabu": { "command": "node", "args": ["/absolute/path/to/nabu/mcp/server.js"] }
  }
}
```

## License

Apache-2.0 (see `LICENSE`).
