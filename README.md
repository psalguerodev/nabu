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

Bootstrap. Carries over from `aws-calculator-mcp`:

- `playwright/` — service handlers, calculator wrapper, example payloads.
- `playbooks/` — per-service functional definitions (UI selectors, wizard steps, edge cases).
- `reference/legacy-mcp/` — the previous MCP `index.js` for reference while reimplementing.

See `docs/ARCHITECTURE.md` for the target design and `docs/ROADMAP.md` for the MVP plan.

## License

Apache-2.0 (see `LICENSE`).
