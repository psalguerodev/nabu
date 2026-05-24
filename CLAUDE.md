## Approach
- Read existing files before writing. Don't re-read unless changed.
- Thorough in reasoning, concise in output.
- Skip files over 100KB unless required.
- No sycophantic openers or closing fluff.
- No emojis or em-dashes.
- Do not guess APIs, versions, flags, commit SHAs, or package names. Verify by reading code or docs before asserting.

## Service handlers — current authoring model

- New services are **declarative YAML datasheets** at `runner/lib/services/<category>/<service>/<service>.yaml`. The interpreter (`runner/lib/datasheet.js` + `runner/lib/declarative.js`) compiles them to primitive Playwright steps. See `docs/ARCHITECTURE.md` "Handler authoring patterns" and `docs/DECISIONS.md` D13–D14.
- Imperative `index.js` handlers still exist for services not yet migrated. A service folder has EITHER `<leaf>.yaml` OR `index.js`, never both.
- `runner/lib/services/registry.js` is the id → folder map every loader consults.
- After editing a YAML: `pnpm -C runner gen:zod <service>` regenerates `mcp/catalog/schemas/<service>.js`. Never edit that file by hand.
- Validate any change with `pnpm -C runner check:catalog` (also wired as `.github/workflows/catalog-guard.yml`).
- To add a brand-new service: invoke the `aws-calc-train` skill — it knows both the YAML and the legacy JS paths and auto-detects which the repo uses.
