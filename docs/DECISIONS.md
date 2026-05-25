# Nabu — Key decisions

This file captures architectural decisions made in conversation, with the reasoning, so future-me (or a teammate) can see *why* not just *what*.

## D1 — Desktop app over pure MCP

**Decision:** Nabu is a Tauri desktop app, not a standalone MCP server.

**Why:** Playwright runs against calculator.aws take minutes. In a pure stdio MCP this blocks the chat, wastes tokens during waits, risks client timeouts, and offers no UX for progress or manual intervention when the wizard breaks.

**Tradeoff:** Loses the "zero-install MCP" simplicity. Users must run a desktop app. Accepted because the target user (ARKHO presales) is on a laptop and benefits more from visible progress than from headless purity.

## D2 — Hybrid: HTTP MCP + stdio bridge

**Decision:** The MCP server is HTTP, bound to `127.0.0.1`. Claude Desktop launches a small stdio↔HTTP bridge that proxies to it.

**Why:** Claude Desktop spawns and kills stdio MCP processes; if the MCP *is* the app, the app dies with the client. Splitting them keeps the app alive across client sessions and lets multiple clients connect.

**Tradeoff:** One extra hop and the need to publish/maintain a bridge package.

## D3 — No embedded terminal

**Decision:** The desktop UI has no terminal pane.

**Why:** Scope discipline. Nabu is "an AWS estimate app", not "a terminal with AWS features". A terminal expands the security surface (PTY + webview = RCE risk on XSS), increases maintenance, and isn't needed for the core flows.

**Reconsider if:** Users repeatedly need to drop to a shell for tasks Nabu doesn't model. At that point, prefer a focused command-runner over a full PTY.

## D4 — Catalog as the single source of truth for service support

**Decision:** The list of supported services lives in a signed `catalog.json` file. MCP tools are generated dynamically from it.

**Why:** Decouples handler releases from app releases. We can ship "Bedrock support" on any Tuesday by publishing a catalog update; users get it without reinstalling the binary.

**Tradeoff:** Adds signing/verification machinery and a runtime code-loading path (handlers are JS). Mitigated by Ed25519 signing, per-file SHA-256, and running handlers in the Playwright sidecar without Tauri IPC access.

## D5 — Reuse legacy Playwright handlers as-is

**Decision:** Nabu spawns a Node sidecar that runs the existing handlers from `playwright/lib/services/`. No rewrite to Rust.

**Why:** Handlers are the most expensive part to recreate (UI selectors, wizard step logic, AWS quirks). Reusing them de-risks the migration. Rust orchestrates; Node executes Playwright.

**Reconsider if:** the Node↔Rust bridge becomes a maintenance burden or a perf issue. Unlikely given jobs are minutes-long.

## D6 — Considered forking Terax, declined

**Decision:** Do not fork [crynta/terax-ai](https://github.com/crynta/terax-ai). Build a focused Tauri app from scratch, copying patterns from Terax as reference.

**Why:** Terax is a generalist dev-workspace (terminal + editor + git + AI panel). Nabu is a vertical presales tool. Forking imports features we don't want, ties us to an upstream that's only ~1 month old (likely to refactor heavily), and confuses the product identity.

**What we do borrow:** the stack choice itself (Tauri 2 + React 19 + Apache-2.0) and architectural patterns where they fit (e.g. xterm + portable-pty if we ever change our mind on D3).

## D7 — Zod for catalog schemas (over Ajv / pure JSON Schema)

**Decision:** Each service's params are defined as a Zod schema. The JSON Schema published in the catalog is derived from Zod via `z.toJSONSchema()`, not authored by hand.

**Why:** Validation, defaults, and normalized output (e.g. enums, coerced numbers) all live in one place. Zod is already a transitive dep of the MCP SDK so no extra runtime cost. Ajv would require a separate authoring surface and lose runtime ergonomics.

**Tradeoff:** Zod schemas are JS, not data — they have to ship as code. That code gets bundled with esbuild before publishing so consumers don't need to install Zod themselves (see D9).

## D8 — `node:sqlite` for job persistence (over `better-sqlite3`)

**Decision:** The MCP uses Node's built-in `node:sqlite` (Node ≥ 22.5) for the `jobs/job_logs/job_results` tables. The Tauri side uses `tauri-plugin-sql` against the same `nabu.db` file for the settings table.

**Why:** `better-sqlite3` failed to build against Node 26 (the user's runtime) and would have required a native compile in CI for every supported Node version. `node:sqlite` is built in, sync, has the same `prepare(...).run()` shape, and dodges the native module problem entirely.

**Tradeoff:** Requires Node ≥ 22.5 in any environment running the MCP. Documented in `mcp/package.json` `engines.node`.

## D9 — Bundle schemas with esbuild at publish time

**Decision:** The publisher (`pnpm -C mcp release`) runs each schema through esbuild with `bundle: true, minify: true, format: "esm"`, inlining Zod into each file. Handlers are copied as-is because they have zero external imports.

**Why:** Installed bundles live under `<app_config_dir>/remote-catalog/`, outside the mcp's `node_modules`. Node's ESM resolver walks UP from the importing file; from app config dirs it never reaches the runtime's `node_modules/zod`. Bundling sidesteps that entirely: an installed schema is a single self-contained file that loads from anywhere.

**Tradeoff:** Each schema becomes ~320 KB (minified). 26 schemas ~= 8 MB total. Worth it for the simplicity. Future optimization: esbuild code-splitting to share Zod across files.

## D10 — Handlers are self-contained `{id, adapter, handler}` modules

**Decision:** Each service module under `runner/lib/services/<name>.js` exports `id`, `adapter(snake_case_params)` (pure function returning camelCase config), and `handler(page, config)` (the Playwright steps). No global `registerService` registry, no shared adapter switch in `runner/run.js`.

**Why:** A new service is exactly one file. The remote install flow can drop that file into `<app_config_dir>/remote-catalog/handlers/` and it Just Works — `runner/run.js` resolves the handler via the catalog's `handlerPath` and dynamically imports it. Without this refactor, M3 would require shipping changes to `run.js`'s switch statement alongside each new service.

**Tradeoff:** Lost the symmetry with how the legacy MCP worked (handlers self-registered as a side effect). Worth it: discoverability is now driven by the catalog, not by which files happened to be imported.

## D11 — `handler_version` derived from sha256 at publish time

**Decision:** The publisher sets `handler_version = "0.1.0-<sha256[0:8]>"` for every service in a release, computed from the handler file's content hash. The embedded `catalog.json` keeps a placeholder `"0.0.0"` per service.

**Why:** We don't (yet) have a per-handler versioning policy or changelog discipline. A hash-derived version is honest: it changes exactly when the code changes, doesn't lie about ordering, and lets the Updates tab show users that a release actually contains different handlers from the one they have installed. Real semver per handler can layer on top when we need to express "this is a breaking change" — for now content-equality is enough.

**Tradeoff:** No human-readable changelog ordering; two unrelated edits look equally "new". Acceptable while we have a single maintainer.

## D12 — Claude Desktop config installer ships in-app

**Decision:** The Settings tab includes a card that writes the `nabu` entry into `claude_desktop_config.json` automatically (OS-aware path resolution, with a timestamped backup of any existing file). Users do not have to hand-edit JSON.

**Why:** Hand-editing the config is the single most error-prone setup step for new users. Wrong path per OS, JSON syntax errors, accidentally clobbering other MCP servers, forgetting an absolute path — all things we can do correctly once in code.

## D13 — Declarative YAML datasheets as the handler authoring pattern

**Decision:** New services are authored as YAML datasheets (`runner/lib/services/<category>/<service>/<service>.yaml`) consumed by a generic interpreter (`runner/lib/datasheet.js` + `runner/lib/declarative.js`). The Zod schema in `mcp/catalog/schemas/<service>.js` is auto-generated by `pnpm -C runner gen:zod <service>`. Imperative `index.js` handlers are still supported and remain for services not yet migrated (~18 of 33 at the time of this entry).

**Why:** Imperative handlers scaled poorly. Every new service was 70–200 lines of Playwright JS that duplicated boilerplate (toggle helpers, dropdown sequencing, instance combobox dance) and drifted apart in style. The Zod schema and the handler lived in different files that nothing forced to stay in sync — a YAML edit had no companion update, so the MCP would reject jobs that the runner could otherwise have driven. The datasheet pattern collapses both into one declarative file; the interpreter handles the 11 primitive actions every wizard uses; `gen-zod` keeps the schema in lockstep; and a CI guard (`pnpm -C runner check:catalog`, also wired as `.github/workflows/catalog-guard.yml`) blocks PRs that drift.

**Tradeoff:** A datasheet for EC2 is ~600 lines of YAML vs ~92 of imperative JS. The win isn't LOC — it's that every dropdown's full option list is enumerated, every conditional is explicit, units never default silently to the wizard's surprising choice (the Systems Manager incident: a missing `Unit per minute` dropdown inflated cost by 43,800×), and a new service is "fill the template + 3 registration edits" rather than "learn Playwright + copy four existing handlers."

## D14 — Folder-per-service layout under AWS categories

**Decision:** Services live at `runner/lib/services/<category>/<service>/` (categories: `ai/`, `analytics/`, `compute/`, `database/`, `management/`, `networking/`, `observability/`, `security/`, `storage/`). Each folder holds either `<service>.yaml` (declarative) or `index.js` (imperative), never both. Family wizards (SageMaker) live as `<family>/_base.yaml` plus per-sub-service folders that `extends:` the base. A `registry.js` at the top of `services/` maps catalog id → folder path; all loaders consult it.

**Why:** The flat `services/<name>.js` layout broke down when sub-service families appeared (SageMaker shipped 7 wrappers that all duplicated the parent-wizard toggle code) and when discovery artifacts (datasheet, discovery notes, future tests) wanted to live next to their handler. Categories also serve as discoverable navigation for someone browsing the repo for the first time.

**Tradeoff:** Loaders need a registry lookup instead of guessing the path. Mitigated by `check-catalog` catching missing registry entries on every PR.

**Tradeoff:** The Tauri side gains a small fs/JSON dependency for this single feature. Reads are gated by a Tauri command; the webview never gets raw fs access.

## D15 — `force: true` flag on `check_checkbox`

**Decision:** The interpreter's `check_checkbox` action accepts an optional `force: true` flag that bypasses Playwright's actionability gate.

**Why:** CloudScape (AWS's design system) wraps native checkboxes in a `<span class="...prevented">` that intercepts pointer events. Playwright's default click refuses to fire when an obscuring element is on top, blocking every legitimate toggle. `force: true` dispatches the click directly to the native input, which still receives the right onChange events. First needed for Bedrock provider checkboxes and now used wherever the same pattern recurs (CloudScape sub-feature toggles across DynamoDB, S3, S3-Vectors).

**Tradeoff:** Skips Playwright's accessibility/visibility checks for the affected step. Acceptable because we already know the target element exists (we selected it with a precise locator) and the obscuring span is a false positive.

## D16 — `option_prefix: true` flag on `select_dropdown`

**Decision:** `select_dropdown` accepts `option_prefix: true` to relax its option regex from `^X$` (anchored) to `^X` (starts-with).

**Why:** CloudScape's first-rendered selected option text comes through duplicated by the a11y tree — e.g. `"GlobalGlobal"`, `"per monthper month"`. The default anchored regex never matched those, causing 30-second timeouts on `getByRole('option', { name: ... })`. The starts-with variant matches the real prefix without picking the wrong option (option labels in the same dropdown don't share prefixes in practice).

**Tradeoff:** Two adjacent options sharing a prefix would resolve to the first one. Mitigated by opt-in (default stays anchored) and only enabling it on dropdowns we've verified.

## D17 — Per-line `description` fill in the configure wizard

**Decision:** `enqueue_estimate_job` accepts an optional `description` per service item; the runner fills the wizard's "Description - optional" textbox with it (falls back to the service id when omitted). Best-effort: any failure to fill is swallowed.

**Why:** AWS estimates render that textbox as the Description column in the read-only share view. Without it, every line item shows "-" and a 30-service estimate becomes unreadable. The runner already had the locator wait at the top of every service; one extra fill costs nothing and makes shared estimates intelligible.

**Tradeoff:** Some wizards (WAF, etc.) render extra "Description"-named textboxes deeper in the form — anchored with `.first()` to keep strict-mode safe.

## D18 — Heuristic ETA in `enqueue_estimate_job` response

**Decision:** The MCP returns `estimated_duration_sec` on every enqueue, computed from per-service p50 of recent successful jobs (last 20) plus a fixed browser-launch overhead. Services without history fall back to 12s each.

**Why:** Multi-service jobs run 1–6 minutes and Claude callers benefit from knowing whether to poll every 5s or every 60s. The SQLite job store already had the timing data; a small helper makes it discoverable. Only exposed on enqueue (not `get_job_status`) to keep the status surface minimal.

**Tradeoff:** P50 is jittery with low job counts. Heuristic baseline keeps it sane for cold services.

## D19 — Publish bundles YAML datasheets, not pre-compiled handlers

**Decision:** `mcp/tools/publish.js` ships either `<service>.js` (legacy imperative handler) or `<service>.yaml` (declarative datasheet, fully resolved via `flattenDatasheetToYaml` so `extends`/`$include` chains collapse into a single self-contained doc). `loadRemote` recognises both extensions; YAML overlays are evaluated at load time by the embedded interpreter (`datasheet.js` + `declarative.js`), which never ships in the bundle.

**Why:** Bundling the interpreter would bloat every release and create a sync hazard (interpreter on disk vs interpreter in the bundle). Keeping interpretation embedded means the bundle is just data; the runtime decides how to drive Playwright. Bonus: a YAML overlay is a few KB instead of a 320 KB esbuilded handler.

**Tradeoff:** Remote-overlaid YAML services depend on the host app's interpreter version. Breaking interpreter changes would orphan published bundles — mitigated by treating interpreter primitives (`fill`, `select_dropdown`, etc.) as a stable contract.
