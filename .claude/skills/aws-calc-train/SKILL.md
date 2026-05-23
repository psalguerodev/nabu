---
name: aws-calc-train
description: Train a new AWS service handler for the aws-calculator-gen MCP (Playwright automation of calculator.aws). Use when the user wants to add support for a new AWS service to the estimate generator. Guides end-to-end: discover the calculator UI with agent-browser, write the Playwright handler, register it, and test. Triggers include "add a handler for <service>", "train calculator for <service>", "the MCP doesn't have <service>", "extend aws-calculator-gen".
allowed-tools: Bash(agent-browser:*), Bash(node:*), Read, Write, Edit, Grep, Glob
---

# Training a new AWS service handler for aws-calculator-gen

Use this skill when the user asks to add an AWS service that the `aws-calculator-gen` MCP (at `~/Downloads/aws-calculator-gen/`) does not yet support. It encodes the workflow we already validated on SageMaker AI, Bedrock, and 30+ other services.

**Repo layout** (assume this path unless user says otherwise):
- `~/Downloads/aws-calculator-gen/lib/calculator.js` — core engine + `SERVICE_MAP` + `registerService()`
- `~/Downloads/aws-calculator-gen/lib/services/<svc>.js` — one handler per service
- `~/Downloads/aws-calculator-gen/lib/worker.js` — background worker imports
- `~/Downloads/aws-calculator-gen/index.js` — MCP server imports

**Forks may differ.** Before applying the 3 registration edits, run `grep -rn "registerService\|SERVICE_MAP\|import.*services/" <repo>/` to locate the actual registration points. Some forks (e.g. `Musheer360/aws-calculator-mcp`) have no `worker.js`, expose `SERVICE_MAP` as `getSearchName()`/`getConfigPattern()` functions inside `calculator.js`, and register handlers via a single `playwright/estimate.js` import list — adapt your edits to whatever the repo actually uses.

## Workflow

### 1. Discover the calculator UI with agent-browser

```bash
agent-browser open https://calculator.aws/#/createCalculator
agent-browser wait --load networkidle
agent-browser snapshot -i
# Click the "Add service" button (ref varies; find it in the snapshot)
agent-browser click @eN
agent-browser fill @eM "<ServiceSearchTerm>"
agent-browser wait 2000
agent-browser snapshot -i
```

Note the exact card name (e.g., "Amazon SageMaker", "Amazon Bedrock"). The `Configure <name>` button regex must match this and be unique — add a negative lookahead if a similar-named service exists (e.g., `Amazon SageMaker(?! Ground)`).

Click the Configure button, **wait for the form to render fully** (often shows "Loading..." briefly), then snapshot:

```bash
agent-browser click @eX  # Configure button
agent-browser wait --load networkidle
agent-browser wait 3000
agent-browser snapshot -i
```

### 2. Map the form — what to look for in the snapshot

1. **Feature toggle checkboxes at the top** — many services (SageMaker, Bedrock) have a row of checkboxes that enable/disable sub-sections. Note which are checked **by default** — they become *required* (their fields must pass validation) unless you explicitly uncheck them.
2. **Input fields** (`textbox`, `spinbutton`) — record the exact `aria-label`. Identical labels across sections need `.nth()` indexing. **Don't assume role from siblings** — the same form can mix `textbox` and `spinbutton` for similar-purpose numeric fields (e.g., AppSync's `Number Of Subscribed Clients` is `textbox` while sibling `Number of Inbound Messages` is `spinbutton`). Always verify role on the actual node.
3. **Dropdowns** — `button[aria-haspopup="listbox"]` for selects, `button[aria-haspopup="dialog"]` for region/location pickers.
4. **Required fields that reject 0** — AWS often treats 0 as "missing". Fill with `1` as a safe dummy, or toggle the section off.
5. **Save buttons** — forms commonly render *two* "Save and view summary" buttons (mobile + desktop footer). The hidden one breaks `.first()` clicks. Use `button:visible` selector.
6. **Re-snapshot after every feature toggle.** Toggling a checkbox like "AppSync GraphQL Real-Time" reveals new required fields that weren't in the initial snapshot. Don't trust your first scan — toggle each feature you care about, then re-snapshot and grep for the *new* fields specifically. Otherwise you'll miss required fields that only fire validation at Save time.

Try a happy-path fill in agent-browser, then click Save. If save doesn't transition (URL stays on config page), check for validation:

```bash
agent-browser eval 'JSON.stringify(Array.from(document.querySelectorAll("[aria-invalid=\"true\"]")).map(e => e.getAttribute("aria-label")))'
```

### 3. Write the handler

Place at `~/Downloads/aws-calculator-gen/lib/services/<service>.js`. Start from `templates/handler.js.tmpl` in this skill (or below). Key idioms:

```javascript
// Toggle a feature checkbox by label to desired state
const setFeature = async (label, wantChecked) => {
  const cb = page.getByRole("checkbox", { name: label });
  if (await cb.count() === 0) return;
  const isChecked = await cb.isChecked().catch(() => false);
  if (isChecked !== wantChecked) {
    await cb.click();
    await page.waitForTimeout(500);
  }
};

// Fill by role (preferred for form inputs)
await page.getByRole("textbox", { name: /Studio Notebook hour\(s\) per day/ }).fill(String(hours));

// Same-label multiple sections — use nth()
const dsFields = page.getByRole("textbox", { name: "Number of data scientist(s) Enter the number of data scientist(s) per month" });
await dsFields.nth(0).fill("5");  // first section
await dsFields.nth(1).fill("3");  // second section

// Blur at the end so React commits the last field
await page.keyboard.press("Tab");
await page.waitForTimeout(500);
```

### 4. Register the handler

Three edits — do them in one pass:

**a.** Add to `SERVICE_MAP` in `lib/calculator.js`:
```javascript
sagemaker: { search: "SageMaker", config: "Amazon SageMaker(?! Ground)" },
```
- `search` is typed into the service search box
- `config` is a regex that matches the `Configure <cardName>` button. Use a negative lookahead when disambiguation is needed.

**b.** Import in `lib/worker.js`:
```javascript
import "./services/sagemaker.js";
```

**c.** Import in `index.js` (the MCP entry):
```javascript
import "./lib/services/sagemaker.js";
```

### 5. Test

Write `~/Downloads/aws-calculator-gen/test-<service>.mjs` using `templates/test.mjs.tmpl`. Run it:

```bash
cd ~/Downloads/aws-calculator-gen && node test-<service>.mjs
```

Expect a JSON result with `url`, `monthly`, `upfront`, `annual`. If save fails, re-run with `headless: false` in the test script to watch the form interactively, and use `agent-browser` side-by-side to inspect state.

## Common gotchas (validated on real services)

| Symptom | Cause | Fix |
|---|---|---|
| Save and view summary doesn't transition | Two buttons exist; `.first()` hits the hidden one | Use `button:visible` locator |
| "Field X is required" with 0 filled | Calculator rejects 0 for count fields | Fill with `1` or uncheck the feature toggle |
| Configure button not found | Regex matches multiple services or none | Add negative lookahead (`(?! Ground)`) or be more specific |
| Dropdown won't open | CloudScape button is technically invisible | Use `.click({ force: true })` |
| Checkbox toggle doesn't register in React | Native `.click()` on hidden input skips React | Use `page.getByRole("checkbox", { name })` |
| "Loading..." persists | Form not rendered yet when handler runs | Wait for a known section text: `await page.waitForFunction(() => /MySection/.test(document.body.innerText))` |
| Cost stays $0 | Fields filled but not committed | `await page.keyboard.press("Tab")` after last fill |
| Same label in multiple sections | Features reuse "Number of data scientist(s)" | Use `.nth(0)`, `.nth(1)`, etc. — indices follow DOM order of *visible* sections |
| Dropdowns after section toggle don't appear | Section not rendered yet | `await page.waitForTimeout(1500)` after toggling |
| Estimate displays correct cost in form, but `Update estimate` after Share fails with "Sorry, something went wrong" | CloudScape autocomplete combobox (e.g. SageMaker "Select an instance") does NOT commit selection on `option.click()`. The form looks filled and the cost shows correctly, but the React state stays uncommitted, so the saved estimate has no instance binding and the price re-calc engine errors on reload. | Use keyboard navigation: `await combo.fill(value); await combo.press("ArrowDown"); await combo.press("Enter")` — that path fires the right onChange events. Validate by Share→re-open in fresh session→click Update; should show "saved successfully" modal, not the error robot page. |
| Save and view summary times out / Share button never appears (Playwright timeout) on services with many optional sections (GuardDuty, SageMaker) | Filling many fields with mixed unit comboboxes can leave the form in a state where one section's validation isn't satisfied — the page stays on the config view instead of transitioning. | Start minimal: fill only the foundational sections (skip optional protection plans). If the minimal version saves OK, add fields one section at a time and re-test. The bulk-fill approach can be added once each subsection is validated. |
| Bundled feature checkbox covers multiple subsections; one subsection you don't use silently blocks Save | A single feature toggle (e.g. Glue's "ETL jobs and interactive sessions") expands to several subsections. Even if you only use one, the others' minimums still apply — Glue Interactive Sessions rejects DPU < 2 even when you set duration to 1 minute. There's no top-level error; Save just doesn't transition. | Fill **every** subsection of an enabled feature with values that pass each subsection's minimum (e.g. `interactiveDpus = 2`, `interactiveMinutes = 1`), even when functionally unused. Default the placeholders inside the handler so callers don't have to remember. |
| Numeric field rejects decimal value with inline `cannot be in decimal` error | Some "rate" fields (e.g. Bedrock `Average requests per minute`) are integer-only despite accepting <1 conceptually. The decimal triggers an inline validation that prevents Save without raising a click error. | Treat all numeric fields as integer-only by default. To express sub-1 throughput, compensate with `hoursPerDay`, `daysPerMonth`, or per-request token counts. |
| Conditional required field appears only after enabling a feature toggle | Toggling reveals new fields that weren't in the initial form snapshot. Easy to miss because the snapshot you took before toggling doesn't include them. | After every toggle, re-run `agent-browser snapshot -i` and grep specifically for the new subsection. Verify the role of each new field — sibling fields can mix `textbox` and `spinbutton` (e.g. AppSync's `Number Of Subscribed Clients` is `textbox` while siblings are `spinbutton`). |
| Form footer "Total Monthly cost" misleads diagnosis | The footer is the cumulative cost of the **whole estimate** (everything saved so far + current draft), not the current service. When debugging a stuck Save, the footer value is essentially meaningless for isolating the broken service. | Don't use the footer to debug. Instead query inline validation directly: `agent-browser eval 'JSON.stringify(Array.from(document.querySelectorAll("[aria-invalid=\"true\"]")).map(e => e.getAttribute("aria-label")))'` and look for visible `❌ <field> is required` text. |

## Diagnostic tips

When the Playwright run errors with a `waitFor` timeout, the message tells you which save path failed and therefore which service to inspect:

| Timeout message | Save path used | Where to look |
|---|---|---|
| `waiting for locator('text=Estimate summary')` | `Save and view summary` (last service overall, or last in a group before the next group starts) | The current service in the screenshot is the one whose Save click didn't transition. Could also be the *next* service if its config form failed validation after a successful save — verify by looking at which form the screenshot shows. |
| `waiting for getByRole('searchbox', { name: 'Find Service' })` | `Save and add service` (next service is in the same group) | The service still visible in the screenshot is the culprit; its Save didn't navigate to the Add Service page. |
| `waiting for textbox/spinbutton/checkbox <field>` inside the handler | Field selector mismatch | Open the form fresh in agent-browser, snapshot the subsection, and verify the exact role + name. The most common cause is assuming `spinbutton` when the field is actually `textbox` (or vice versa). |

## Handler template

See [templates/handler.js.tmpl](templates/handler.js.tmpl).

## Test script template

See [templates/test.mjs.tmpl](templates/test.mjs.tmpl).

## Reference: services already handled

Run `ls ~/Downloads/aws-calculator-gen/lib/services/` for the current list. Good references for patterns:
- `bedrock.js` — provider checkboxes with native-input fallback
- `sagemaker.js` — feature toggles + same-label `.nth()` fields
- `lambda.js` — simple numeric form
- `s3.js` — sub-service groups
- `dynamodb.js` — capacity mode switch
