# Nabu — Roadmap

## Milestone 0 — Plumbing spike ✅ Shipped (2026-05-23)

Goal: prove the wiring end-to-end without touching Playwright.

- [x] Scaffold Tauri 2 app with React 19 frontend (sidebar + status bar shell, no business logic). Uses **pnpm** workspaces.
- [x] Embed an HTTP MCP server on `127.0.0.1:7531` (Node sidecar spawned by Tauri).
- [x] Implement `list_supported_services` returning the embedded catalog.
- [x] Write `@arkho/nabu-bridge` (stdio↔HTTP) — Claude Desktop launches the bridge, the bridge proxies to the running app.
- [x] Status bar shows live MCP listening state and catalog version (polls `/health` every 2s).

**Exit met:** Claude Desktop calls Nabu MCP tools and the response comes from the running Tauri app.

## Milestone 1 — Catalog + validation ✅ Shipped (2026-05-23)

Goal: turn the static stub into a real catalog with validation tools.

- [x] `catalog.json` schema defined; embedded under `mcp/catalog/`.
- [x] Embedded catalog with 3 → 6 → 26 services (every legacy handler has a Zod schema today).
- [x] Tools: `get_service_schema(service)`, `validate_estimate(payload)`.
- [x] **Services** tab reads from the catalog, with search and a per-service schema detail view (required vs optional fields, types, defaults, raw JSON Schema toggle).
- [x] Settings persisted in SQLite (headless flag + default region) via `tauri-plugin-sql`.

**Exit met:** Claude builds estimate payloads conversationally; Nabu validates without paying the Playwright cost.

## Milestone 2 — Job execution ✅ Shipped (2026-05-23)

Goal: real Playwright jobs running through the app.

- [x] Job queue with states `queued | running | succeeded | failed | needs_intervention` persisted to SQLite (`node:sqlite`).
- [x] Playwright sidecar process spawned per job from the `runner/` package; handlers self-contained and dynamically imported.
- [x] Tools: `enqueue_estimate_job`, `get_job_status`, `get_job_result`, `list_jobs`. Multi-service estimates supported.
- [x] **Jobs** tab: live list with checkboxes + bulk delete, detail view with logs streaming, calculator link, total monthly, input JSON toggle, took-Xs duration after completion, and a Retry button that re-enqueues a failed job (`POST /jobs/:id/retry`).
- [x] Headless toggle (from Settings) flowing through to Playwright launch options.
- [ ] Deep link handler `nabu://job/<id>` — deferred to Milestone 5 hardening; not blocking.

**Exit met:** full conversational → enqueue → run → result loop verified live, including a 13-service bank-datalake combined estimate ($19,007.15/mo) and a 6-service combined estimate ($2,093.34/mo).

## Milestone 3 — Remote catalog updates ✅ Shipped (2026-05-23)

Goal: ship new service support without app releases.

- [x] Remote catalog endpoint via GitHub Releases (signed assets attached to a release tagged `catalog-v*`).
- [x] Ed25519 signing (publisher) + verification (loader) using `@noble/ed25519`. Pubkey embedded in the app; private key lives in a GitHub Actions secret.
- [x] Manual refresh from disk (`POST /reload`) plus networked install (`POST /install` downloads, verifies, swaps).
- [x] **Updates** tab: catalog version, remote/embedded/total stats, installed-services list with REMOTE/embedded badge, "Install latest release" button against a configurable release URL.
- [x] Hot-reload of MCP tools after a catalog swap — no sidecar restart needed.
- [x] Schemas bundled with esbuild (zod inlined) so installed files load regardless of `node_modules` proximity. Handlers ship as-is because they have zero external imports.
- [x] GitHub Actions workflow (`.github/workflows/release.yml`) builds and signs the bundle on push of a `catalog-v*` tag.
- [x] Per-handler `handler_version` derived from the handler's SHA-256 at publish time (`0.1.0-<sha>`), so a re-published release with no code changes keeps the same version and a real edit produces a fresh one.
- [x] **Settings → Claude Desktop integration**: one-click installer that detects the OS, backs up the existing `claude_desktop_config.json`, and merges in the `nabu` MCP entry.

**Exit met:** one click on "Install latest release" in the running app downloads the latest GitHub Release, verifies its signature, atomically swaps the overlay, reloads the MCP, and Claude immediately sees the new tools.

---

## Milestone 4 — Iterate-on-previous + Excel export polish

- [ ] `enqueue_estimate_job` accepts `parent_job_id` and uses `load_estimate` from the parent's calculator.aws URL as the starting point.
- [ ] Diff-aware updates instead of rebuilding from scratch where possible.
- [ ] Excel export consistent with current legacy output, configurable target folder.

## Milestone 5 — Hardening

- [ ] Handler health checks (scheduled CI against live calculator.aws, flips `status: degraded`).
- [ ] Crash recovery: in-flight jobs marked `failed` with diagnostic on app restart.
- [ ] Signing pipeline for releases (macOS notarization).
- [ ] Auto-update of the app binary (Tauri updater).
- [ ] Deep link handler `nabu://job/<id>` registered in Tauri.
- [ ] Cross-platform path handling for the `tar` extraction in `POST /install`.

## Explicitly out of scope (initial)

- Multi-user / cloud sync.
- Embedded terminal or shell.
- Non-AWS cloud providers.
- Cost forecasting beyond what calculator.aws produces.
- Public distribution (start internal-only for ARKHO presales).
