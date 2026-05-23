import * as listServices from "./list-services.js";
import * as getVersion from "./get-version.js";

const modules = [listServices, getVersion];

export const tools = modules.map((m) => ({
  definition: m.definition,
  handler: m.handler,
}));

export const registry = new Map(
  tools.map((t) => [t.definition.name, t.handler]),
);
