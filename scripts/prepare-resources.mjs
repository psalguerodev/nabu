#!/usr/bin/env node
/**
 * Prepare app/src-tauri/resources/ for a Tauri bundle.
 *
 * Layout:
 *   resources/
 *     nabu-mcp[.exe]    Bun-compiled MCP binary for the host OS
 *     bun[.exe]         Bun runtime binary (used to spawn runner/run.js)
 *     runner/
 *       run.js
 *       lib/{datasheet,declarative,calculator,regions,health}.js
 *     node_modules/playwright, playwright-core, chromium-bidi, yaml
 *     embedded/
 *       catalog/catalog.json + schemas/*.js
 *       services/registry.js + <category>/<service>/<leaf>.yaml
 *
 * Invoked by Tauri's beforeBuildCommand. NABU_TARGET overrides the
 * bun-compile target triple (darwin-arm64 | darwin-x64 | linux-x64 |
 * windows-x64). Default is the host platform.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, cpSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, realpathSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const TAURI = join(REPO, "app", "src-tauri");
const RES = join(TAURI, "resources");

function detectTarget() {
  if (process.env.NABU_TARGET) return process.env.NABU_TARGET;
  const platform = process.platform === "darwin" ? "darwin"
    : process.platform === "win32" ? "windows"
    : "linux";
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  return `${platform}-${arch}`;
}

const TARGET = detectTarget();
const IS_WIN = TARGET.startsWith("windows");
const MCP_BIN = IS_WIN ? "nabu-mcp.exe" : "nabu-mcp";
const BRIDGE_BIN = IS_WIN ? "nabu-bridge.exe" : "nabu-bridge";
const BUN_BIN = IS_WIN ? "bun.exe" : "bun";

function step(msg) { process.stdout.write(`==> ${msg}\n`); }
function execFile(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { stdio: "inherit", cwd: REPO, ...opts });
}

// 1. Clean output dir
step(`target=${TARGET}`);
step(`cleaning ${RES}`);
rmSync(RES, { recursive: true, force: true });
mkdirSync(RES, { recursive: true });

// 2. Bun-compile the MCP binary + the Claude Desktop bridge.
step("bun build --compile mcp/server.js");
const mcpOut = join(RES, MCP_BIN);
execFile("bun", [
  "build", "mcp/server.js",
  "--compile", `--target=bun-${TARGET}`,
  `--outfile=${mcpOut}`,
]);
step("bun build --compile bridge/bridge.js");
execFile("bun", [
  "build", "bridge/bridge.js",
  "--compile", `--target=bun-${TARGET}`,
  `--outfile=${join(RES, BRIDGE_BIN)}`,
]);

// 3. Copy Bun runtime binary (spawns the runner JS at job time).
// Use realpath + copyFileSync to copy the actual binary content,
// not a symlink — homebrew installs bun as a symlink so cpSync
// without dereferencing leaves a dangling reference inside the
// Tauri resource dir.
step(`copying bun runtime`);
const bunCandidate = process.execPath.endsWith(IS_WIN ? "bun.exe" : "bun")
  ? process.execPath
  : execFileSync(IS_WIN ? "where" : "which", ["bun"]).toString().trim().split("\n")[0];
const bunExe = realpathSync(bunCandidate);
copyFileSync(bunExe, join(RES, BUN_BIN));
// Homebrew installs bun as a read-only 555 file; copyFileSync inherits
// those perms. Tauri's bundle phase later wants to copy this into the
// bundle output and fails with "Permission denied" if the dest needs
// to be overwritten. 755 keeps it executable while letting the user
// rewrite it on re-runs.
if (!IS_WIN) execFile("chmod", ["755", join(RES, BUN_BIN)]);
// Strip `com.apple.provenance` xattr — macOS Sequoia/Tahoe SIP marker
// inherited from /opt/homebrew/. The xattr makes Tauri's resource
// reader fail with "Permission denied" during cargo build. Targeted
// delete on the bun copy (recursive clear via `-rc` is silently
// ignored for SIP-marked attributes).
if (process.platform === "darwin") {
  try { execFile("xattr", ["-d", "com.apple.provenance", join(RES, BUN_BIN)]); } catch {}
}

// 4 + 5. Runner runtime tree — build a SELF-CONTAINED directory with
// a flat node_modules. pnpm deploy was the obvious choice but it
// leaves symlinks (@arkho/nabu-runner -> ../../../../../../../../runner,
// + .pnpm/* relative links) that escape the resources tree, which
// makes Tauri's resource walker fail with "Permission denied" during
// `cargo build`. We use plain `npm install --omit=dev` instead so
// node_modules is real directories with no symlinks.
step("staging runner-runtime/ via npm install --omit=dev");
const runtimeDir = join(RES, "runner-runtime");
rmSync(runtimeDir, { recursive: true, force: true });
mkdirSync(runtimeDir, { recursive: true });
// Compose a temporary package.json that only references the runtime
// deps the runner needs (no devDeps, no workspace links).
const runnerPkg = JSON.parse(
  readFileSync(join(REPO, "runner", "package.json"), "utf8"),
);
const trimmedPkg = {
  name: "nabu-runner-runtime",
  version: runnerPkg.version || "0.0.0",
  private: true,
  type: "module",
  dependencies: runnerPkg.dependencies || {},
};
writeFileSync(
  join(runtimeDir, "package.json"),
  JSON.stringify(trimmedPkg, null, 2),
);
execFile("npm", ["install", "--omit=dev", "--no-audit", "--no-fund"], {
  cwd: runtimeDir,
});
// Copy the JS the runner imports at runtime.
mkdirSync(join(runtimeDir, "lib"), { recursive: true });
cpSync(join(REPO, "runner", "run.js"), join(runtimeDir, "run.js"));
for (const f of ["datasheet.js", "declarative.js", "calculator.js", "regions.js", "health.js"]) {
  cpSync(join(REPO, "runner", "lib", f), join(runtimeDir, "lib", f));
}

// 6. Embedded data files (catalog json + schemas, all yamls + registry)
step("staging embedded/ data");
const emb = join(RES, "embedded");
mkdirSync(emb, { recursive: true });
cpSync(join(REPO, "mcp", "catalog"), join(emb, "catalog"), { recursive: true });
cpSync(join(REPO, "runner", "lib", "services"), join(emb, "services"), { recursive: true });

// 7. Report
function du(dir) {
  let total = 0;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    try {
      const s = statSync(p);
      total += s.isDirectory() ? du(p) : s.size;
    } catch {
      // tolerate broken symlinks left by pnpm deploy
    }
  }
  return total;
}
step(`done. resources tree:`);
process.stdout.write(`  TOTAL ${(du(RES) / 1024 / 1024).toFixed(1)} MB\n`);
for (const entry of readdirSync(RES)) {
  const p = join(RES, entry);
  const s = statSync(p);
  const sizeMb = (s.isDirectory() ? du(p) : s.size) / 1024 / 1024;
  process.stdout.write(`  ${sizeMb.toFixed(1).padStart(7)} MB  ${entry}${s.isDirectory() ? "/" : ""}\n`);
}
