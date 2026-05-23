#!/usr/bin/env node
/**
 * Run health checks against the live calculator.aws wizard for every
 * service module that exports `healthLocators`. For each service we:
 *
 *   1. Open the Add service page on calculator.aws.
 *   2. Search for the service and click its Configure button.
 *   3. Wait for the wizard config page to be visible.
 *   4. Run checkLocators(page, mod.healthLocators).
 *   5. Click Cancel to return to the Add service page.
 *
 * Output is NDJSON to stdout, one event per service, plus a final
 * summary line of type "report" with the aggregate result.
 *
 * Usage:
 *   pnpm -C runner health                 # check every catalog service
 *   pnpm -C runner health ec2 s3 lambda   # check a subset
 *
 * Env:
 *   NABU_HEALTH_HEADED=1   show the browser
 *   NABU_HEALTH_TIMEOUT=4500  per-locator visibility timeout (ms)
 */
import { chromium } from "playwright";
import { readdir, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkLocators } from "./lib/health.js";
import { getSearchName, getConfigPattern } from "./lib/calculator.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVICES_DIR = join(HERE, "lib", "services");
const CALCULATOR_URL = "https://calculator.aws/#/createCalculator";
const BLOCKED_RESOURCE_TYPES = ["image", "media", "font"];
const REPORT_DIR =
  process.env.NABU_HEALTH_REPORT_DIR || join(HERE, "..", "artifacts", "health");

function emit(event) {
  process.stdout.write(JSON.stringify(event) + "\n");
}

async function listServices() {
  const files = await readdir(SERVICES_DIR);
  return files
    .filter((f) => f.endsWith(".js"))
    .map((f) => f.replace(/\.js$/, ""))
    .sort();
}

async function loadHandler(service) {
  const mod = await import(join(SERVICES_DIR, `${service}.js`));
  return mod;
}

async function hideChatbot(page) {
  await page
    .evaluate(() => {
      document
        .querySelectorAll("#chatbot-wrapper, [class*='notificationBubbleChatIcon']")
        .forEach((el) => {
          try {
            el.style.display = "none";
          } catch {}
        });
    })
    .catch(() => {});
}

async function gotoAddService(page) {
  await page
    .getByRole("button", { name: "Add service" })
    .first()
    .click();
  await page.getByRole("searchbox", { name: "Find Service" }).waitFor({ timeout: 15000 });
}

async function openServiceWizard(page, service) {
  const searchBox = page.getByRole("searchbox", { name: "Find Service" });
  await searchBox.clear();
  await searchBox.fill(getSearchName(service));
  const configBtn = page
    .getByRole("button", { name: new RegExp(`Configure ${getConfigPattern(service)}`) })
    .first();
  await configBtn.waitFor({ timeout: 6000 });
  await configBtn.click();
  await Promise.race([
    page.getByRole("textbox", { name: "Description" }).waitFor({ timeout: 20000 }),
    page.getByRole("button", { name: "Save and view summary" }).waitFor({ timeout: 20000 }),
  ]);
}

// Snapshot every interactive control visible on the current page along with
// its accessible name. Maintainers compare this against the missing-locator
// list to figure out which field AWS renamed/reorganized.
async function snapshotInputs(page) {
  return page.evaluate(() => {
    const selector =
      'input, textarea, [role="radio"], [role="checkbox"], [role="combobox"], [role="spinbutton"], [role="searchbox"], button';
    const out = [];
    const seen = new Set();
    for (const el of document.querySelectorAll(selector)) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      let label = el.getAttribute("aria-label") || "";
      if (!label) {
        const id = el.getAttribute("id");
        if (id) {
          const lbl = document.querySelector(`label[for="${id}"]`);
          if (lbl) label = lbl.textContent?.trim() ?? "";
        }
      }
      if (!label) label = el.getAttribute("placeholder") || "";
      if (!label && el.tagName === "BUTTON")
        label = el.textContent?.trim() ?? "";
      if (!label) continue;
      const trimmed = label.replace(/\s+/g, " ").slice(0, 100);
      const role = el.getAttribute("role") || el.tagName.toLowerCase();
      const key = `${role}::${trimmed}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ role, label: trimmed });
    }
    return out;
  });
}

async function cancelWizard(page) {
  const cancelBtn = page.getByRole("button", { name: "Cancel" }).first();
  if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await cancelBtn.click();
  }
  const searchBox = page.getByRole("searchbox", { name: "Find Service" });
  if (await searchBox.isVisible({ timeout: 2000 }).catch(() => false)) return;
  await gotoAddService(page);
}

async function main() {
  const requested = process.argv.slice(2);
  const services = requested.length ? requested : await listServices();
  const headed = process.env.NABU_HEALTH_HEADED === "1";
  const perLocatorTimeout = Number(process.env.NABU_HEALTH_TIMEOUT ?? 2500);

  const browser = await chromium.launch({ headless: !headed });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.route("**/*", (route) => {
    if (BLOCKED_RESOURCE_TYPES.includes(route.request().resourceType())) return route.abort();
    return route.continue();
  });

  const t0 = Date.now();
  const results = [];
  try {
    await page.goto(CALCULATOR_URL, { waitUntil: "networkidle", timeout: 60000 });
    await hideChatbot(page);
    await gotoAddService(page);

    for (const service of services) {
      const started = Date.now();
      let mod;
      try {
        mod = await loadHandler(service);
      } catch (err) {
        const ev = { service, ok: false, error: `load_failed: ${err.message}` };
        results.push(ev);
        emit({ type: "service", ...ev });
        continue;
      }
      if (!Array.isArray(mod.healthLocators) || mod.healthLocators.length === 0) {
        const ev = { service, ok: null, skipped: "no healthLocators exported" };
        results.push(ev);
        emit({ type: "service", ...ev });
        continue;
      }

      try {
        await openServiceWizard(page, service);
        // Optional per-handler prerequisite that puts the wizard in the
        // state the healthLocators expect (toggle a feature checkbox,
        // switch to a non-default pricing mode, etc).
        if (typeof mod.healthPrerequisite === "function") {
          await mod.healthPrerequisite(page);
        }
        const { ok, missing } = await checkLocators(page, mod.healthLocators, {
          timeout: perLocatorTimeout,
        });
        const ev = {
          service,
          ok,
          missing,
          checked: mod.healthLocators.length,
          duration_ms: Date.now() - started,
        };
        // Capture diagnostic context only when something failed — keeps
        // the artifact small on a clean day.
        if (!ok) {
          await mkdir(REPORT_DIR, { recursive: true }).catch(() => {});
          const shotPath = join(REPORT_DIR, `${service}.png`);
          try {
            await page.screenshot({ path: shotPath, fullPage: true });
            ev.screenshot = shotPath;
          } catch {}
          try {
            ev.visible_inputs = await snapshotInputs(page);
          } catch {}
        }
        results.push(ev);
        emit({ type: "service", ...ev });
      } catch (err) {
        const ev = {
          service,
          ok: false,
          error: `wizard_open_failed: ${err.message?.slice(0, 200)}`,
          duration_ms: Date.now() - started,
        };
        try {
          await mkdir(REPORT_DIR, { recursive: true }).catch(() => {});
          const shotPath = join(REPORT_DIR, `${service}.png`);
          await page.screenshot({ path: shotPath, fullPage: true });
          ev.screenshot = shotPath;
        } catch {}
        results.push(ev);
        emit({ type: "service", ...ev });
      }
      await cancelWizard(page).catch(() => {});
    }

    const summary = {
      type: "report",
      ran_at: new Date().toISOString(),
      duration_ms: Date.now() - t0,
      total: results.length,
      ok: results.filter((r) => r.ok === true).length,
      degraded: results.filter((r) => r.ok === false).length,
      skipped: results.filter((r) => r.ok === null).length,
    };
    emit(summary);
    process.exit(summary.degraded > 0 ? 1 : 0);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  emit({ type: "error", message: String(err) });
  process.exit(2);
});
