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

**Tradeoff:** The Tauri side gains a small fs/JSON dependency for this single feature. Reads are gated by a Tauri command; the webview never gets raw fs access.
