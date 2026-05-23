# Nabu — Roadmap

## Milestone 0 — Plumbing spike (1 week)

Goal: prove the wiring end-to-end without touching Playwright.

- [ ] Scaffold Tauri 2 app with React 19 frontend (sidebar + status bar shell, no business logic). Use **pnpm** throughout (workspace already defined at repo root).
- [ ] Embed an HTTP MCP server on `127.0.0.1:7531` (Rust or Node sidecar — pick whichever is faster to iterate; Node lets us reuse legacy code).
- [ ] Implement one tool only: `list_supported_services` returning a hardcoded stub.
- [ ] Write `@arkho/nabu-bridge` (stdio↔HTTP) and verify Claude Desktop can call `list_supported_services` through it.
- [ ] Status bar shows live MCP listening state and catalog version.

Exit criteria: a Claude Desktop conversation can call the Nabu MCP tool and see the response come from the running Tauri app.

## Milestone 1 — Catalog + validation (1 week)

Goal: turn the static stub into a real catalog with validation tools.

- [ ] Define `catalog.json` schema (see `docs/ARCHITECTURE.md`).
- [ ] Embedded catalog with 3 services (EC2, S3, Lambda) — schemas only, no handlers yet.
- [ ] Implement `get_service_schema(service)` and `validate_estimate(payload)`.
- [ ] **Services** tab in UI reads from the loaded catalog.
- [ ] Persist settings (headless flag, default region, MCP port) in SQLite.

Exit criteria: Claude can build an estimate payload conversationally and Nabu validates it correctly without yet executing.

## Milestone 2 — Job execution (2 weeks)

Goal: real Playwright jobs running through the app.

- [ ] Job queue with states `queued | running | succeeded | failed | needs_intervention`.
- [ ] Playwright sidecar process spawned per job; reuse handlers from `playwright/lib/services/`.
- [ ] `enqueue_estimate_job`, `get_job_status`, `get_job_result` MCP tools.
- [ ] **Jobs** tab: live list, detail view with log + final link + xlsx path.
- [ ] Headless toggle wired through to Playwright launch options.
- [ ] Deep link handler `nabu://job/<id>` registered in Tauri.

Exit criteria: a full conversation → enqueue → run → result loop works end-to-end with EC2 + S3 + Lambda.

## Milestone 3 — Remote catalog updates (1 week)

Goal: ship new service support without app releases.

- [ ] Remote catalog endpoint (start with a GitHub Releases JSON).
- [ ] Ed25519 signing + verification of catalog and handler files.
- [ ] Update check on startup + manual refresh.
- [ ] **Updates** tab with diff view and Install action.
- [ ] Hot-reload of MCP tool list after a catalog swap.

Exit criteria: publishing a new handler to the remote catalog makes it available to a running app instance within one refresh, with signature verification.

## Milestone 4 — Iterate-on-previous + Excel export polish (1 week)

- [ ] `enqueue_estimate_job` accepts `parent_job_id` and uses `load_estimate` from the parent's calculator.aws URL as starting point.
- [ ] Diff-aware updates instead of rebuilding from scratch where possible.
- [ ] Excel export consistent with current legacy output, configurable target folder.

## Milestone 5 — Hardening

- [ ] Handler health checks (scheduled CI against live calculator.aws, flips `status: degraded`).
- [ ] Crash recovery: in-flight jobs marked `failed` with diagnostic on app restart.
- [ ] Signing pipeline for releases (macOS notarization).
- [ ] Auto-update of the app binary (Tauri updater).

## Explicitly out of scope (initial)

- Multi-user / cloud sync.
- Embedded terminal or shell.
- Non-AWS cloud providers.
- Cost forecasting beyond what calculator.aws produces.
- Public distribution (start internal-only for ARKHO presales).
