#!/usr/bin/env node
/**
 * Nabu Playwright runner.
 *
 * Reads a JSON job spec from stdin:
 *   { jobId, service, params, options: { headless, name } }
 *
 * Emits NDJSON to stdout, one event per line:
 *   { type: "log",    level: "info"|"warn"|"error", message }
 *   { type: "result", calculator_url, total_monthly, line_items, xlsx_path }
 *   { type: "error",  message }
 *
 * Exits 0 on success, 1 on failure.
 */
import { createEstimate } from "./index.js";

function emit(event) {
  process.stdout.write(JSON.stringify(event) + "\n");
}

async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString("utf8");
}

function toLegacyService(service, params) {
  switch (service) {
    case "ec2": {
      const ignored = [];
      if (params.hours_per_month != null && params.hours_per_month !== 730)
        ignored.push("hours_per_month");
      if (params.region) ignored.push("region");
      return {
        legacy: {
          service: "ec2",
          instances: params.count,
          instanceType: params.instance_type,
          os: params.os === "windows" ? "Windows" : "Linux",
          pricing: "On-Demand",
        },
        ignored,
      };
    }
    case "s3": {
      const ignored = [];
      if (params.region) ignored.push("region");
      if (params.storage_class && params.storage_class !== "standard")
        ignored.push("storage_class");
      return {
        legacy: {
          service: "s3",
          storageGB: params.storage_gb,
          putRequests: params.put_requests_per_month ?? 0,
          getRequests: params.get_requests_per_month ?? 0,
        },
        ignored,
      };
    }
    case "lambda": {
      const ignored = [];
      if (params.region) ignored.push("region");
      return {
        legacy: {
          service: "lambda",
          requests: params.invocations_per_month,
          durationMs: params.avg_duration_ms,
          memoryMB: params.memory_mb,
          architecture: params.architecture === "arm64" ? "arm64" : "x86",
          freeTier: false,
        },
        ignored,
      };
    }
    default:
      throw new Error(`Unsupported service: ${service}`);
  }
}

async function main() {
  const raw = await readStdin();
  if (!raw.trim()) {
    emit({ type: "error", message: "no job spec on stdin" });
    process.exit(2);
  }
  const spec = JSON.parse(raw);
  const { service, params, options = {} } = spec;

  emit({ type: "log", level: "info", message: `runner starting for service=${service}` });

  let legacy;
  try {
    const adapted = toLegacyService(service, params);
    legacy = adapted.legacy;
    for (const field of adapted.ignored) {
      emit({
        type: "log",
        level: "warn",
        message: `param '${field}' is not wired through to the calculator handler yet`,
      });
    }
  } catch (err) {
    emit({ type: "error", message: err.message });
    process.exit(1);
  }

  try {
    emit({ type: "log", level: "info", message: "launching browser" });
    const result = await createEstimate([legacy], {
      headless: options.headless !== false,
      name: options.name ?? null,
    });
    emit({
      type: "result",
      calculator_url: result.url,
      line_items: [
        {
          service,
          monthly_usd: result.monthly ?? 0,
          upfront_usd: result.upfront ?? 0,
          annual_usd: result.annual ?? 0,
        },
      ],
      total_monthly: result.monthly ?? 0,
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
