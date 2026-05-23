#!/usr/bin/env node
/**
 * Nabu Playwright runner.
 *
 * Reads a JSON job spec from stdin:
 *   { jobId, services: [{ service, params }, ...], options: { headless, name } }
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
      return {
        legacy: {
          service: "ec2",
          region: params.region,
          instances: params.count,
          instanceType: params.instance_type,
          os: params.os === "windows" ? "Windows" : "Linux",
          pricing: "On-Demand",
          hoursPerMonth: params.hours_per_month,
        },
        ignored,
      };
    }
    case "s3": {
      const ignored = [];
      if (params.storage_class && params.storage_class !== "standard")
        ignored.push("storage_class");
      return {
        legacy: {
          service: "s3",
          region: params.region,
          storageGB: params.storage_gb,
          putRequests: params.put_requests_per_month ?? 0,
          getRequests: params.get_requests_per_month ?? 0,
        },
        ignored,
      };
    }
    case "lambda": {
      const ignored = [];
      return {
        legacy: {
          service: "lambda",
          region: params.region,
          requests: params.invocations_per_month,
          durationMs: params.avg_duration_ms,
          memoryMB: params.memory_mb,
          architecture: params.architecture === "arm64" ? "arm64" : "x86",
          freeTier: false,
        },
        ignored,
      };
    }
    case "dynamodb": {
      return {
        legacy: {
          service: "dynamodb",
          region: params.region,
          capacityMode: params.capacity_mode,
          storageGB: params.storage_gb,
          avgItemSizeKB: params.avg_item_size_kb,
          baselineWriteRate: params.baseline_write_per_sec,
          peakWriteRate: params.peak_write_per_sec,
          baselineReadRate: params.baseline_read_per_sec,
          peakReadRate: params.peak_read_per_sec,
          peakDurationHours: params.peak_duration_hours,
        },
        ignored: [],
      };
    }
    case "api-gateway": {
      return {
        legacy: {
          service: "api-gateway",
          region: params.region,
          httpRequests: params.http_requests_millions_per_month,
          restRequests: params.rest_requests_millions_per_month,
          avgRequestSizeKB: params.avg_request_size_kb,
        },
        ignored: [],
      };
    }
    case "cloudfront": {
      return {
        legacy: {
          service: "cloudfront",
          region: params.region,
          pricingModel: "payg",
          dataOutGB: params.data_out_gb_per_month,
          dataOutToOriginGB: params.data_to_origin_gb_per_month,
          httpsRequests: params.https_requests_per_month,
        },
        ignored: [],
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

  const legacyServices = [];
  try {
    for (const { service, params } of services) {
      const adapted = toLegacyService(service, params);
      legacyServices.push(adapted.legacy);
      for (const field of adapted.ignored) {
        emit({
          type: "log",
          level: "warn",
          message: `${service}: param '${field}' is not wired through to the calculator handler yet`,
        });
      }
    }
  } catch (err) {
    emit({ type: "error", message: err.message });
    process.exit(1);
  }

  try {
    emit({ type: "log", level: "info", message: "launching browser" });
    const result = await createEstimate(legacyServices, {
      headless: options.headless !== false,
      name: options.name ?? null,
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
