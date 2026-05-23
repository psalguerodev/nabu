import * as listServices from "./list-services.js";
import * as getVersion from "./get-version.js";
import * as getServiceSchema from "./get-service-schema.js";
import * as validateEstimate from "./validate-estimate.js";

const modules = [listServices, getVersion, getServiceSchema, validateEstimate];

export const tools = modules.map((m) => ({
  definition: m.definition,
  handler: m.handler,
}));

export const registry = new Map(
  tools.map((t) => [t.definition.name, t.handler]),
);
