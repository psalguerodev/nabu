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
import { cpSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
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

// 2. Bun-compile the MCP binary
step("bun build --compile mcp/server.js");
const mcpOut = join(RES, MCP_BIN);
execFile("bun", [
  "build", "mcp/server.js",
  "--compile", `--target=bun-${TARGET}`,
  `--outfile=${mcpOut}`,
]);

// 3. Copy Bun runtime binary (spawns the runner JS at job time)
step(`copying bun runtime`);
const bunExe = process.execPath.endsWith(IS_WIN ? "bun.exe" : "bun")
  ? process.execPath
  : execFileSync(IS_WIN ? "where" : "which", ["bun"]).toString().trim().split("\n")[0];
cpSync(bunExe, join(RES, BUN_BIN));
if (!IS_WIN) execFile("chmod", ["+x", join(RES, BUN_BIN)]);

// 4 + 5. Runner runtime tree — use `pnpm deploy` to materialise a
// self-contained directory (node_modules + package.json) for the
// runner workspace, then copy the runner source files INTO it so
// node_modules resolution works without surgery. Bun is invoked with
// cwd=runner-runtime and args=run.js by the host app.
step("staging runner-runtime/ via pnpm deploy");
const runtimeDir = join(RES, "runner-runtime");
rmSync(runtimeDir, { recursive: true, force: true });
execFile("pnpm", ["deploy", "--filter", "./runner", "--prod", "--legacy", runtimeDir]);
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
