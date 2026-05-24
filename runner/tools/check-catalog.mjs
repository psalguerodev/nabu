#!/usr/bin/env node
/**
 * Catalog guard — run all integrity checks on service datasheets, the
 * generated Zod schemas, and the catalog manifest. Designed for CI: fast,
 * filesystem-only, no browser, exits 1 on any drift with a concise summary.
 *
 * Checks performed:
 *
 *   1. Zod drift
 *      Every *.yaml under runner/lib/services/ that defines a `service:`
 *      key must match what `gen-zod.mjs` would produce now against
 *      mcp/catalog/schemas/<service>.js.
 *
 *   2. YAML loadability
 *      loadDatasheet() must not throw for any datasheet (resolves extends
 *      and $include). Catches typos and broken references.
 *
 *   3. Catalog completeness
 *      Every datasheet has an entry in mcp/catalog/catalog.json (and vice
 *      versa: every catalog entry references a schema that exists on disk).
 *
 *   4. Health locator presence
 *      Each datasheet declares at least one health_locators entry so the
 *      daily probe has something to watch.
 *
 * Usage:
 *   node tools/check-catalog.mjs        # report-and-exit, used in CI
 *   node tools/check-catalog.mjs --fix  # re-run gen-zod where drift is detected
 *
 * Bases like `runner/lib/services/sagemaker/_base.yaml` are skipped: they
 * have no `service:` key (or it starts with `_`) and aren't a catalog entry
 * on their own.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { loadDatasheet } from "../lib/datasheet.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const SERVICES_DIR = join(REPO, "runner", "lib", "services");
const SCHEMAS_DIR = join(REPO, "mcp", "catalog", "schemas");
const CATALOG_FILE = join(REPO, "mcp", "catalog", "catalog.json");

const fix = process.argv.includes("--fix");

const errors = [];
const fixed = [];
const seenServices = new Set();

function walkYaml(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walkYaml(full));
    } else if (entry.endsWith(".yaml") || entry.endsWith(".yml")) {
      out.push(full);
    }
  }
  return out;
}

function readCatalog() {
  const raw = JSON.parse(readFileSync(CATALOG_FILE, "utf8"));
  return raw.services ?? {};
}

function diffFirstLine(a, b) {
  const al = a.split("\n");
  const bl = b.split("\n");
  for (let i = 0; i < Math.max(al.length, bl.length); i++) {
    if (al[i] !== bl[i]) {
      return `line ${i + 1}: '${al[i] ?? ""}' vs '${bl[i] ?? ""}'`;
    }
  }
  return "(content differs in byte count)";
}

function runGenZod(service) {
  execFileSync(process.execPath, [join(HERE, "gen-zod.mjs"), service], {
    cwd: REPO,
    stdio: "pipe",
  });
}

function genZodOutput(service) {
  return execFileSync(
    process.execPath,
    [join(HERE, "gen-zod.mjs"), service, "--check"],
    { cwd: REPO, stdio: ["ignore", "pipe", "pipe"] },
  );
}

function checkDatasheet(yamlPath) {
  const rel = relative(REPO, yamlPath);

  // (1) loadability
  let ds;
  try {
    ds = loadDatasheet(yamlPath);
  } catch (err) {
    errors.push(`load: ${rel}: ${err.message}`);
    return;
  }

  // skip non-service files (family bases like sagemaker/_base.yaml)
  if (!ds.service || ds.service.startsWith("_")) return;
  seenServices.add(ds.service);

  // (2) Zod drift
  const schemaPath = join(SCHEMAS_DIR, `${ds.service}.js`);
  if (!existsSync(schemaPath)) {
    if (fix) {
      runGenZod(ds.service);
      fixed.push(`zod: wrote missing ${ds.service}.js`);
    } else {
      errors.push(`zod: ${ds.service}: ${schemaPath} does not exist (run pnpm -C runner gen:zod ${ds.service})`);
    }
  } else {
    try {
      execFileSync(
        process.execPath,
        [join(HERE, "gen-zod.mjs"), ds.service, "--check"],
        { cwd: REPO, stdio: ["ignore", "pipe", "pipe"] },
      );
    } catch (err) {
      const msg = (err.stderr?.toString() || err.message || "").trim();
      if (fix) {
        runGenZod(ds.service);
        fixed.push(`zod: regenerated ${ds.service}.js`);
      } else {
        errors.push(`zod: ${ds.service}: out of sync — ${msg}`);
      }
    }
  }

  // (3) catalog completeness
  const catalog = readCatalog();
  if (!catalog[ds.service]) {
    errors.push(`catalog: ${ds.service}: missing entry in mcp/catalog/catalog.json`);
  } else {
    const schemaRef = catalog[ds.service].schema_ref;
    if (!schemaRef || !existsSync(join(REPO, "mcp", "catalog", schemaRef))) {
      errors.push(`catalog: ${ds.service}: schema_ref '${schemaRef}' not found on disk`);
    }
  }

  // (4) health locator presence
  if (!Array.isArray(ds.health_locators) || ds.health_locators.length === 0) {
    errors.push(`locators: ${ds.service}: declare at least one health_locators entry`);
  }
}

function checkCatalogConsistency() {
  const catalog = readCatalog();
  for (const [name, entry] of Object.entries(catalog)) {
    const ref = entry.schema_ref;
    if (!ref) {
      errors.push(`catalog: '${name}' has no schema_ref`);
      continue;
    }
    const refPath = join(REPO, "mcp", "catalog", ref);
    if (!existsSync(refPath)) {
      errors.push(`catalog: '${name}' references missing schema ${ref}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const yamlFiles = walkYaml(SERVICES_DIR);
if (!yamlFiles.length) {
  console.error("check-catalog: no YAML datasheets found under " + SERVICES_DIR);
  process.exit(2);
}

for (const f of yamlFiles) checkDatasheet(f);
checkCatalogConsistency();

if (fixed.length) {
  console.log("Auto-fixed:");
  for (const m of fixed) console.log(`  + ${m}`);
}

if (errors.length) {
  console.error(`\n${errors.length} catalog check(s) failed:\n`);
  for (const e of errors) console.error(`  ✘ ${e}`);
  console.error(`\nTip: run \`pnpm -C runner check:catalog --fix\` to regenerate drifted Zod schemas.`);
  process.exit(1);
}

const total = seenServices.size;
console.log(`\ncheck-catalog: ${total} service datasheet(s) verified.`);
console.log("  ✓ Zod schemas in sync");
console.log("  ✓ YAML loadable");
console.log("  ✓ catalog.json entries present");
console.log("  ✓ health locators declared");
