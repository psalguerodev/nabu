## Approach
- Read existing files before writing. Don't re-read unless changed.
- Thorough in reasoning, concise in output.
- Skip files over 100KB unless required.
- No sycophantic openers or closing fluff.
- No emojis or em-dashes.
- Do not guess APIs, versions, flags, commit SHAs, or package names. Verify by reading code or docs before asserting.

## Service handlers — current authoring model

- New services are **declarative YAML datasheets** at `runner/lib/services/<category>/<service>/<service>.yaml`. The interpreter (`runner/lib/datasheet.js` + `runner/lib/declarative.js`) compiles them to primitive Playwright steps. See `docs/ARCHITECTURE.md` "Handler authoring patterns" and `docs/DECISIONS.md` D13–D14.
- Every catalog service ships as a YAML datasheet today (38 services as of `catalog-v2026.06.01`). The imperative `index.js` path is still loadable for future opt-out cases. A service folder has EITHER `<leaf>.yaml` OR `index.js`, never both.
- `runner/lib/services/registry.js` is the id → folder map every loader consults.
- After editing a YAML: `pnpm -C runner gen:zod <service>` regenerates `mcp/catalog/schemas/<service>.js`. Never edit that file by hand.
- Validate any change with `pnpm -C runner check:catalog` (also wired as `.github/workflows/catalog-guard.yml`).
- To add a brand-new service: invoke the `aws-calc-train` skill — it knows both the YAML and the legacy JS paths and auto-detects which the repo uses.
- Common wizard quirks that bite YAML authors: CloudScape's `<span class="...prevented">` interceptor on checkboxes (use `force: true` on `check_checkbox`, see D15) and doubled-label dropdown options like "GlobalGlobal" (use `option_prefix: true` on `select_dropdown`, see D16). For lazy-rendered sub-section toggles, prefer `toggle_checkbox_data_id` over role-based clicks.

## Enqueue contract

- `enqueue_estimate_job` accepts an optional `description` per service item — it gets typed into the wizard's "Description - optional" textbox so the line item is labelled in the read-only share view. Falls back to the service id when omitted (D17).
- The enqueue response includes `estimated_duration_sec` — heuristic ETA from per-service p50 of recent successes, useful for picking a poll interval (D18).
