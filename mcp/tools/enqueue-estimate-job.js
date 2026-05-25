import { randomUUID } from "node:crypto";
import { getCatalogEntry, listCatalogServices } from "../catalog/index.js";
import { createJob } from "../jobs/store.js";
import { run as runJob } from "../jobs/executor.js";
import { estimateDurationSec } from "../jobs/eta.js";

export const definition = {
  name: "enqueue_estimate_job",
  description:
    "Queue a calculator.aws estimate job for one or more services. " +
    "Pass either { service, params } (single) or { services: [{service, params}, ...] } (combined). " +
    "Returns a job_id plus estimated_duration_sec (heuristic ETA based on historical job durations); poll get_job_status until succeeded then read get_job_result.",
  inputSchema: {
    type: "object",
    properties: {
      service: { type: "string" },
      params: { type: "object" },
      services: {
        type: "array",
        items: {
          type: "object",
          properties: {
            service: { type: "string" },
            params: { type: "object" },
            group: {
              type: "string",
              description:
                "Optional group name. Consecutive services sharing the same group are placed under the same calculator.aws group section.",
            },
            description: {
              type: "string",
              description:
                "Optional per-line description shown in the calculator.aws estimate (fills the wizard's 'Description - optional' textbox). Defaults to the service id when omitted.",
            },
          },
          required: ["service", "params"],
        },
        minItems: 1,
      },
      options: {
        type: "object",
        properties: { headless: { type: "boolean" }, name: { type: "string" } },
      },
    },
  },
};

export async function handler(args) {
  const items = normalizeItems(args);
  if (items.length === 0) {
    throw new Error(
      "enqueue_estimate_job requires either { service, params } or a non-empty services[]",
    );
  }

  const normalized = [];
  const errors = [];
  for (const [i, { service, params, group, description }] of items.entries()) {
    const entry = service && getCatalogEntry(service);
    if (!entry) {
      errors.push(
        `services[${i}]: unknown service '${service}'. Available: ${listCatalogServices().join(", ")}`,
      );
      continue;
    }
    const parsed = entry.zodSchema.safeParse(params ?? {});
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(
          `services[${i}].${issue.path.join(".")}: ${issue.message}`,
        );
      }
      continue;
    }
    normalized.push({
      service,
      params: parsed.data,
      ...(group ? { group } : {}),
      ...(description ? { description } : {}),
    });
  }
  if (errors.length) {
    const err = new Error(`Invalid params: ${errors.join("; ")}`);
    err.details = errors;
    throw err;
  }

  const id = randomUUID();
  const isSingle = normalized.length === 1;
  createJob({
    id,
    service: isSingle ? normalized[0].service : normalized.map((s) => s.service).join("+"),
    name: args?.options?.name ?? null,
    params: isSingle ? normalized[0].params : { services: normalized },
    options: args?.options ?? null,
  });
  setImmediate(() => runJob(id));

  const services = normalized.map((s) => s.service);
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            job_id: id,
            status: "queued",
            services,
            estimated_duration_sec: estimateDurationSec(services),
          },
          null,
          2,
        ),
      },
    ],
  };
}

function normalizeItems(args) {
  if (args?.services && Array.isArray(args.services)) {
    return args.services.map((s) => ({
      service: s.service,
      params: s.params,
      group: s.group,
      description: s.description,
    }));
  }
  if (args?.service) {
    return [{ service: args.service, params: args.params }];
  }
  return [];
}
