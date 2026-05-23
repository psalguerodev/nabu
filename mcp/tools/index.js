import * as listServices from "./list-services.js";
import * as getVersion from "./get-version.js";
import * as getServiceSchema from "./get-service-schema.js";
import * as validateEstimate from "./validate-estimate.js";
import * as enqueueEstimateJob from "./enqueue-estimate-job.js";
import * as getJobStatus from "./get-job-status.js";
import * as getJobResult from "./get-job-result.js";
import * as listJobsTool from "./list-jobs.js";

const modules = [
  listServices,
  getVersion,
  getServiceSchema,
  validateEstimate,
  enqueueEstimateJob,
  getJobStatus,
  getJobResult,
  listJobsTool,
];

export const tools = modules.map((m) => ({
  definition: m.definition,
  handler: m.handler,
}));

export const registry = new Map(
  tools.map((t) => [t.definition.name, t.handler]),
);
