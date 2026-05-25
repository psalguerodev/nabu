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

- [x] **`enqueue_estimate_job` returns `estimated_duration_sec`** — heuristic ETA computed from per-service p50 of recent successes, 12s baseline overhead. Shipped 2026-05-24.
- [x] **Per-line `description` fill** — every service item in `enqueue_estimate_job` accepts an optional `description` that gets typed into the wizard's Description textbox so the read-only share view shows meaningful line items. Shipped 2026-05-24.
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

## Catalog expansion — running plan

The catalog grew from 26 → 33 → 38 services through three waves of refactor + two service-additions. Tracked here so future contributors see what's planned vs done.

### Done

- **YAML migration complete (33/33)** — every legacy `index.js` handler has a YAML datasheet equivalent. The imperative path remains supported for future opt-out cases.
- **Ola 1** (2026-05-24, `catalog-v2026.05.29`): bedrock v0.3.0 (rewrite for new wizard with `inference_route` + `inference_type`), bedrock-agentcore v0.2.2 (nth-indexing for the 4-sub-feature combinations + I/O wait field for Browser Tools), vpn v0.2.1 (data transfer dimensions).
- **Ola 2** (2026-05-24, `catalog-v2026.05.30`): s3 v0.3.0 (8 storage classes incl. Intelligent Tiering + Glacier + Express One Zone), cognito v0.3.0 (lite/plus tiers + SAML/OIDC MAU + M2M), lambda v0.3.0 (provisioned concurrency + SnapStart + ephemeral storage).
- **Ola 3** (2026-05-24, `catalog-v2026.05.31`): step-functions v0.3.0 (Express workflows), ses v0.3.0 (Open Ingress + Mail Manager + Virtual Deliverability Manager + Archive), sagemaker family (45 per-field descriptions). waf Bot Control deferred — the AWS public calculator doesn't surface those inputs.
- **A1 new services** (2026-05-25, `catalog-v2026.06.01`): SQS, SNS, KMS, NAT Gateway. 38 services total.

### Pending — A2 (heavy hitters)

- **RDS** — universal need, blocks every traditional 3-tier app.
- **ElastiCache** — Redis/Memcached for caching layers.
- **OpenSearch** — search + observability.

### Pending — A3 (round out)

- **Aurora** — managed Postgres/MySQL with auto-scaling.
- **Kinesis** (Data Streams + Firehose) — streaming/realtime.
- **Route 53** — DNS, multi-region routing.
- **Direct Connect** — alternative to VPN for hub-and-spoke.

### Pending — Ola 4 (refactor of existing)

- **ec2** — Spot, Savings Plans 1y/3y, instance store, Dedicated Hosts.
- **glue** — Crawlers, Data Catalog, Streaming jobs.
- **redshift** — Concurrency Scaling, RA3 vs DC2 details.
- **bedrock** — fix `inference_route` override race when active provider is not Amazon.
- **s3** — fix Glacier `data_retrieval_gb` lazy-render.

### Cross-cutting gaps

- **Cross-region data transfer** modelled as a shared block. Multi-region estimates are systematically 10–30% low today because per-service handlers don't surface the data-transfer-out dimension.
- **Free Tier** not modelled — first-year estimates are high.
- **Savings Plans / Reserved Instances** only on EC2 — needs to land on RDS, Redshift, OpenSearch when those exist.
- **AWS Support tier** ($29 – $15k/mo) never appears in any estimate.

## Explicitly out of scope (initial)

- Multi-user / cloud sync.
- Embedded terminal or shell.
- Non-AWS cloud providers.
- Cost forecasting beyond what calculator.aws produces.
- Public distribution (start internal-only for ARKHO presales).
