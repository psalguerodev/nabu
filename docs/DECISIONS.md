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
