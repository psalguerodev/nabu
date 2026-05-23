#!/usr/bin/env node
/**
 * Nabu Playwright runner.
 *
 * Reads a JSON job spec from stdin:
 *   { jobId, services: [{ service, params }, ...], options: { headless, name } }
 *
 * Each service is resolved by dynamically importing
 *   ./lib/services/<service>.js
 * That module must export { id, adapter, handler }:
 *   - adapter(params) -> camelCase config (pure, no I/O)
 *   - handler(page, config) -> Playwright steps that configure the service
 *     on the calculator.aws wizard
 *
 * Emits NDJSON to stdout (log / result / error) and exits 0 on success, 1
 * on failure.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createEstimate } from "./lib/calculator.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVICES_DIR = join(HERE, "lib", "services");

function emit(event) {
  process.stdout.write(JSON.stringify(event) + "\n");
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

async function loadHandlerModule(service, explicitPath) {
  if (!/^[a-z0-9-]+$/.test(service)) {
    throw new Error(`Invalid service name: ${service}`);
  }
  const path = explicitPath || join(SERVICES_DIR, `${service}.js`);
  let mod;
  try {
    mod = await import(path);
  } catch (err) {
    throw new Error(
      `Cannot load handler for '${service}' at ${path}: ${err.message}`,
    );
  }
  if (typeof mod.adapter !== "function" || typeof mod.handler !== "function") {
    throw new Error(
      `Handler module for '${service}' must export adapter() and handler()`,
    );
  }
  return mod;
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) {
    emit({ type: "error", message: "no job spec on stdin" });
    process.exit(2);
  }
  const spec = JSON.parse(raw);
  const services = spec.services ?? [];
  const options = spec.options ?? {};

  if (!services.length) {
    emit({ type: "error", message: "services[] is empty" });
    process.exit(2);
  }

  emit({
    type: "log",
    level: "info",
    message: `runner starting for ${services.length} service(s): ${services.map((s) => s.service).join(", ")}`,
  });

  const resolved = [];
  for (const { service, params, handler_path } of services) {
    let mod;
    try {
      mod = await loadHandlerModule(service, handler_path);
    } catch (err) {
      emit({ type: "error", message: err.message });
      process.exit(1);
    }
    const camelConfig = mod.adapter(params ?? {});
    resolved.push({
      service,
      region: params?.region,
      handler: mod.handler,
      ...camelConfig,
    });
  }

  try {
    emit({ type: "log", level: "info", message: "launching browser" });
    const result = await createEstimate(resolved, {
      headless: options.headless !== false,
      name: options.name ?? null,
      onProgress: (ev) => {
        if (ev.type === "service_start") {
          emit({
            type: "log",
            level: "info",
            message: `[${ev.index + 1}/${ev.total}] configuring ${ev.service}`,
          });
        } else if (ev.type === "service_done") {
          emit({
            type: "log",
            level: "info",
            message: `[done] ${ev.service}`,
          });
        } else if (ev.type === "service_error") {
          emit({
            type: "log",
            level: "error",
            message: `[fail] ${ev.service}: ${ev.message}`,
          });
        }
      },
    });
    emit({
      type: "result",
      calculator_url: result.url,
      line_items: services.map(({ service }) => ({
        service,
        configured: true,
      })),
      total_monthly: result.monthly ?? 0,
      upfront: result.upfront ?? 0,
      annual: result.annual ?? 0,
      xlsx_path: null,
    });
    emit({ type: "log", level: "info", message: `done in ${result.elapsed}s` });
    process.exit(0);
  } catch (err) {
    emit({ type: "error", message: err.message ?? String(err) });
    process.exit(1);
  }
}

main().catch((err) => {
  emit({ type: "error", message: String(err) });
  process.exit(1);
});
