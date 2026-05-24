#!/usr/bin/env node
/**
 * Build and sign a Nabu remote catalog release bundle.
 *
 * Reads the local embedded catalog (mcp/catalog/catalog.json) and
 * produces a bundle in `dist/release/` containing:
 *
 *   latest.json          - catalog index with sha256 per asset
 *   latest.json.sig      - hex-encoded ed25519 signature of latest.json
 *   schemas/<name>.js    - copy of each service's Zod schema
 *   handlers/<name>.js   - copy of each service's handler module
 *
 * The private key is read from the NABU_RELEASE_PRIVATE_KEY env var.
 * For local dev that comes from .env.local (gitignored); in CI it
 * comes from a GitHub Actions secret of the same name.
 *
 * Usage:
 *   pnpm -C mcp publish             # publish everything in the catalog
 *   pnpm -C mcp publish ec2 s3      # publish a subset
 */
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { sign } from "../sign/index.js";
import { SERVICE_PATHS } from "../../runner/lib/services/registry.js";
import {
  resolveHandlerSource,
  loadHandlerFromYaml,
  flattenDatasheetToYaml,
} from "../../runner/lib/datasheet.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const CATALOG_DIR = join(REPO, "mcp", "catalog");
const HANDLERS_DIR = join(REPO, "runner", "lib", "services");
// Schemas are bundled with esbuild so `zod` ships inlined. That way the
// published files load from any directory regardless of node_modules
// proximity — required for Tauri installs that land under
// <app_config_dir>/remote-catalog/.
const OUT = join(REPO, "mcp", "dist", "release");

function loadDotenv() {
  const path = join(REPO, ".env.local");
  try {
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !(m[1] in process.env)) {
        process.env[m[1]] = m[2];
      }
    }
  } catch {
    // No .env.local — relying on real env (CI).
  }
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

async function main() {
  loadDotenv();
  const priv = process.env.NABU_RELEASE_PRIVATE_KEY;
  if (!priv) {
    console.error(
      "Missing NABU_RELEASE_PRIVATE_KEY. Put it in .env.local for local " +
        "dev, or expose it as a CI secret of the same name.",
    );
    process.exit(2);
  }

  const manifest = JSON.parse(
    readFileSync(join(CATALOG_DIR, "catalog.json"), "utf8"),
  );
  const requested = process.argv.slice(2);
  const services = requested.length
    ? requested
    : Object.keys(manifest.services);
  for (const s of services) {
    if (!manifest.services[s]) {
      console.error(`Service '${s}' is not in the embedded catalog.`);
      process.exit(2);
    }
  }

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(join(OUT, "schemas"), { recursive: true });
  mkdirSync(join(OUT, "handlers"), { recursive: true });

  const releaseServices = {};
  for (const name of services) {
    const schemaSrc = join(CATALOG_DIR, manifest.services[name].schema_ref);
    const schemaDst = join(OUT, "schemas", `${name}.js`);

    // Bundle the schema with zod inlined so it can be imported from any
    // directory the user drops it into.
    await build({
      entryPoints: [schemaSrc],
      outfile: schemaDst,
      bundle: true,
      minify: true,
      format: "esm",
      platform: "neutral",
      target: ["node22"],
      logLevel: "silent",
    });

    // Resolve the handler via the registry — services live under their AWS
    // category folder and may be either an imperative index.js or a
    // declarative <leaf>.yaml. The remote bundle ships whichever the source
    // tree uses; the embedded interpreter (datasheet.js + declarative.js)
    // is reused at load time for YAML overlays.
    const sub = SERVICE_PATHS[name];
    if (!sub) {
      console.error(`Service '${name}' has no registry entry.`);
      process.exit(2);
    }
    const folderAbs = join(HANDLERS_DIR, sub);
    const src = resolveHandlerSource(folderAbs);
    if (!src) {
      console.error(`Service '${name}': no index.js or <leaf>.yaml found in ${folderAbs}`);
      process.exit(2);
    }
    const ext = src.kind === "yaml" ? "yaml" : "js";
    const handlerDst = join(OUT, "handlers", `${name}.${ext}`);
    if (src.kind === "yaml") {
      // Flatten extends/_base.yaml chains so the bundle ships a single
      // self-contained datasheet per service.
      writeFileSync(handlerDst, flattenDatasheetToYaml(src.path));
    } else {
      copyFileSync(src.path, handlerDst);
    }

    const handlerHash = sha256(handlerDst);
    const schemaHash = sha256(schemaDst);
    // Read the handler module's exported `version` to compose the released
    // per-service version. Re-publishing with no code change keeps the
    // semver part stable; the +<sha8> build identifier changes whenever
    // the file content does.
    const handlerMod =
      src.kind === "yaml"
        ? loadHandlerFromYaml(handlerDst)
        : await import(handlerDst);
    const baseVersion = handlerMod.version ?? "0.1.0";
    const versionSuffix = handlerHash.slice(0, 8);
    releaseServices[name] = {
      handler_version: `${baseVersion}+${versionSuffix}`,
      schema_ref: `schemas/${name}.js`,
      handler_ref: `handlers/${name}.${ext}`,
      schema_sha256: schemaHash,
      handler_sha256: handlerHash,
      status: manifest.services[name].status,
      tags: manifest.services[name].tags ?? [],
    };
  }

  const releasedAt = new Date().toISOString();
  const indexObj = {
    catalog_version: `${manifest.version}+${releasedAt}`,
    released_at: releasedAt,
    min_app_version: "0.1.0",
    services: releaseServices,
  };
  const indexJson = JSON.stringify(indexObj, null, 2);
  writeFileSync(join(OUT, "latest.json"), indexJson);

  const signature = await sign(indexJson, priv);
  writeFileSync(join(OUT, "latest.json.sig"), signature);

  console.log(
    `Published ${services.length} service(s) to ${OUT}\n` +
      `  catalog_version: ${indexObj.catalog_version}\n` +
      `  signature: ${signature.slice(0, 32)}…`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
