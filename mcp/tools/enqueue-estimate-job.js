import { randomUUID } from "node:crypto";
import { getCatalogEntry, listCatalogServices } from "../catalog/index.js";
import { createJob } from "../jobs/store.js";
import { run as runJob } from "../jobs/executor.js";

export const definition = {
  name: "enqueue_estimate_job",
  description:
    "Queue a calculator.aws estimate job for a service. Returns a job_id; poll get_job_status until succeeded then read get_job_result.",
  inputSchema: {
    type: "object",
    properties: {
      service: { type: "string" },
      params: { type: "object" },
      options: {
        type: "object",
        properties: { headless: { type: "boolean" } },
      },
    },
    required: ["service", "params"],
  },
};

export async function handler(args) {
  const { service, params, options } = args ?? {};
  const entry = service && getCatalogEntry(service);
  if (!entry) {
    throw new Error(
      `Unknown service: ${service}. Available: ${listCatalogServices().join(", ")}`,
    );
  }
  const parsed = entry.zodSchema.safeParse(params ?? {});
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));
    const err = new Error(
      `Invalid params for ${service}: ${errors.map((e) => `${e.path}: ${e.message}`).join("; ")}`,
    );
    err.details = errors;
    throw err;
  }

  const id = randomUUID();
  createJob({ id, service, params: parsed.data, options });
  setImmediate(() => runJob(id));

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          { job_id: id, status: "queued", service },
          null,
          2,
        ),
      },
    ],
  };
}
