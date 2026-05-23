/**
 * Per-service health checks for calculator.aws handlers.
 *
 * A handler's health is "OK" when the locators it relies on still exist on
 * the live config wizard. We don't actually fill anything — just navigate
 * to the wizard page for each service and ask Playwright whether the
 * declared locators are visible.
 *
 * Each service module under runner/lib/services/<name>.js can export an
 * array `healthLocators` of the form:
 *
 *   [
 *     {
 *       role: "spinbutton",
 *       name: /Number of instances/,
 *       label: "instances input",
 *     },
 *     {
 *       css: "table[aria-label='EC2 selection'] tbody input[type='radio']",
 *       label: "instance selection radio",
 *     },
 *     // ...
 *   ]
 *
 * Each entry is either a getByRole({role, name}) descriptor or a raw CSS
 * locator. checkLocators returns { ok, missing[] } where `missing` lists
 * the human-readable labels of locators that were not visible within the
 * timeout.
 */

const DEFAULT_TIMEOUT_MS = 2500;

export async function checkLocators(page, locators, { timeout = DEFAULT_TIMEOUT_MS } = {}) {
  const missing = [];
  for (const entry of locators ?? []) {
    let locator;
    if (entry.css) {
      locator = page.locator(entry.css);
    } else if (entry.role) {
      locator = page.getByRole(entry.role, { name: entry.name });
    } else {
      missing.push(entry.label || "(invalid locator)");
      continue;
    }
    // Poll for the element to be attached + non-empty. Avoid Playwright's
    // strict "visible" semantics (no overlap, in-viewport-ish) — those
    // fail on legitimately-rendered-but-offscreen fields. For drift
    // detection we only care whether the DOM has it at all.
    let found = false;
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const count = await locator.count().catch(() => 0);
      if (count > 0) {
        found = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    if (!found) {
      missing.push(entry.label || entry.name?.toString() || entry.css);
    }
  }
  return { ok: missing.length === 0, missing };
}
