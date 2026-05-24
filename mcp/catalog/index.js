/**
 * Catalog loader for Nabu.
 *
 * - The embedded catalog ships in this repo: mcp/catalog/catalog.json +
 *   schemas/*.js plus the matching handlers under runner/lib/services/*.
 * - A remote catalog can overlay it. When present, it lives at
 *   $NABU_REMOTE_CATALOG_DIR (set by Tauri to <app_config_dir>/remote-catalog/).
 *   For local dev we fall back to <repo>/dist/release/ if it exists.
 *
 * Remote layout (matches what `pnpm -C mcp release` produces):
 *   latest.json           index with sha256 per asset
 *   latest.json.sig       hex-encoded ed25519 signature of latest.json
 *   schemas/<name>.js     Zod schema
 *   handlers/<name>.js    handler module (id/adapter/handler)
 *
 * Verification flow on reload():
 *   1. read latest.json, latest.json.sig, verify with embedded pubkey.
 *   2. for each service: recompute sha256 of schemas/<n>.js and handlers/<n>.js
 *      against the index. Mismatch -> the service is dropped with a warning.
 *   3. dynamically import each module (with cache-busting query so reload()
 *      picks up new versions).
 *
 * Tools read the catalog via the exported function API (getCatalogEntry,
 * listCatalogServices, catalogVersion, getCatalogVersion). reload() rebuilds
 * the in-memory state so a POST /reload can refresh tools without restart.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { verify } from "../sign/index.js";
import { NABU_PUBKEY_HEX } from "../sign/pubkey.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

const EMBEDDED_CATALOG_FILE = join(HERE, "catalog.json");
const EMBEDDED_SCHEMAS_DIR = HERE;
const EMBEDDED_HANDLERS_DIR = join(REPO, "runner", "lib", "services");

function resolveRemoteDir() {
  // Opt-in: NABU_REMOTE_CATALOG_DIR must be set explicitly. Tauri points
  // this at <app_config_dir>/remote-catalog/. Local dev can set it to
  // dist/release/ to exercise the overlay against a freshly built bundle.
  return process.env.NABU_REMOTE_CATALOG_DIR || null;
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

async function dynamicImport(absPath) {
  // Cache-bust on reload so a re-published handler is actually re-read.
  const url = `${pathToFileURL(absPath).href}?v=${Date.now()}`;
  return import(url);
}

// Resolve a service folder to either its index.js or its <leaf>.yaml
// datasheet, importing whichever exists. YAML-driven services have no
// wrapper module; we build the handler module in memory via datasheet.js.
async function loadHandlerForFolder(folderAbs) {
  const { resolveHandlerSource, loadHandlerFromYaml } = await dynamicImport(
    join(REPO, "runner", "lib", "datasheet.js"),
  );
  const src = resolveHandlerSource(folderAbs);
  if (!src) {
    throw new Error(
      `no index.js or <leaf>.yaml found in ${folderAbs}`,
    );
  }
  if (src.kind === "js") {
    return { mod: await dynamicImport(src.path), handlerPath: src.path };
  }
  return { mod: loadHandlerFromYaml(src.path), handlerPath: src.path };
}

async function loadEmbedded() {
  const manifest = JSON.parse(readFileSync(EMBEDDED_CATALOG_FILE, "utf8"));
  const { SERVICE_PATHS } = await dynamicImport(
    join(EMBEDDED_HANDLERS_DIR, "registry.js"),
  );
  const entries = [];
  for (const [name, meta] of Object.entries(manifest.services)) {
    const schemaPath = join(EMBEDDED_SCHEMAS_DIR, meta.schema_ref);
    const sub = SERVICE_PATHS[name];
    if (!sub) {
      console.error(`[catalog] no registry entry for '${name}' — add to runner/lib/services/registry.js`);
      continue;
    }
    const folderAbs = join(EMBEDDED_HANDLERS_DIR, sub);
    const [schemaMod, loaded] = await Promise.all([
      dynamicImport(schemaPath),
      loadHandlerForFolder(folderAbs),
    ]);
    const handlerMod = loaded.mod;
    const handlerPath = loaded.handlerPath;
    // handler_version is sourced from the handler module's `version` export,
    // so it lives next to the code that determines it. catalog.json's
    // handler_version (if present) is a legacy fallback.
    const handlerVersion =
      handlerMod.version ?? meta.handler_version ?? "0.0.0";
    entries.push([
      name,
      {
        name,
        meta: {
          ...meta,
          handler_version: handlerVersion,
          source: "embedded",
        },
        zodSchema: schemaMod.zodSchema,
        jsonSchema: schemaMod.jsonSchema,
        schemaPath,
        handlerPath,
      },
    ]);
  }
  return { version: manifest.version, entries };
}

async function loadRemote(dir) {
  const indexPath = join(dir, "latest.json");
  const sigPath = join(dir, "latest.json.sig");
  if (!existsSync(indexPath) || !existsSync(sigPath)) return null;

  const indexRaw = readFileSync(indexPath, "utf8");
  const sig = readFileSync(sigPath, "utf8").trim();
  const sigOk = await verify(indexRaw, sig, NABU_PUBKEY_HEX);
  if (!sigOk) {
    console.error(
      `[catalog] remote latest.json signature did not verify against ${NABU_PUBKEY_HEX.slice(0, 16)}…; ignoring remote overlay`,
    );
    return null;
  }
  const index = JSON.parse(indexRaw);

  const entries = [];
  for (const [name, meta] of Object.entries(index.services ?? {})) {
    const schemaPath = join(dir, meta.schema_ref);
    const handlerPath = join(dir, meta.handler_ref);
    try {
      const schemaHash = sha256(schemaPath);
      const handlerHash = sha256(handlerPath);
      if (
        meta.schema_sha256 &&
        meta.schema_sha256 !== schemaHash
      ) {
        console.error(
          `[catalog] remote service '${name}': schema sha256 mismatch; dropping`,
        );
        continue;
      }
      if (
        meta.handler_sha256 &&
        meta.handler_sha256 !== handlerHash
      ) {
        console.error(
          `[catalog] remote service '${name}': handler sha256 mismatch; dropping`,
        );
        continue;
      }
      const mod = await dynamicImport(schemaPath);
      // YAML overlays defer compilation to the embedded interpreter at
      // load time (the bundle never ships datasheet.js / declarative.js).
      // We import once here just to validate the YAML parses; the cached
      // module is dropped because the runner re-imports per-job.
      if (handlerPath.endsWith(".yaml") || handlerPath.endsWith(".yml")) {
        const { loadHandlerFromYaml } = await dynamicImport(
          join(REPO, "runner", "lib", "datasheet.js"),
        );
        loadHandlerFromYaml(handlerPath);
      }
      entries.push([
        name,
        {
          name,
          meta: { ...meta, source: "remote" },
          zodSchema: mod.zodSchema,
          jsonSchema: mod.jsonSchema,
          schemaPath,
          handlerPath,
        },
      ]);
    } catch (err) {
      console.error(
        `[catalog] remote service '${name}': load failed (${err.message}); dropping`,
      );
    }
  }
  return { version: index.catalog_version, entries };
}

let _catalog = new Map();
let _version = null;
let _remoteVersion = null;

export async function reload() {
  const embedded = await loadEmbedded();
  const next = new Map(embedded.entries);
  let version = embedded.version;
  let remoteVersion = null;

  const remoteDir = resolveRemoteDir();
  if (remoteDir) {
    const remote = await loadRemote(remoteDir);
    if (remote) {
      remoteVersion = remote.version;
      // Remote entries overlay (override) embedded ones with the same name.
      for (const [name, entry] of remote.entries) next.set(name, entry);
      version = remote.version;
    }
  }

  _catalog = next;
  _version = version;
  _remoteVersion = remoteVersion;
  return { version, remoteVersion, count: _catalog.size };
}

export function listCatalogServices() {
  return [..._catalog.keys()].sort();
}

export function getCatalogEntry(name) {
  return _catalog.get(name);
}

export function getCatalogVersion() {
  return _version;
}

export function getRemoteCatalogVersion() {
  return _remoteVersion;
}

// Initial load at module import time so existing callers (which read state
// immediately) see a populated catalog.
await reload();
