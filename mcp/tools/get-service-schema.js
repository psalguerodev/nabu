import { getCatalogEntry, listCatalogServices } from "../catalog/index.js";

export const definition = {
  name: "get_service_schema",
  description:
    "Return the JSON Schema describing the parameters for a service in the Nabu catalog.",
  inputSchema: {
    type: "object",
    properties: {
      service: {
        type: "string",
        description: "Service name as listed by list_supported_services.",
      },
    },
    required: ["service"],
  },
};

export async function handler(args) {
  const service = args?.service;
  const entry = service && getCatalogEntry(service);
  if (!entry) {
    throw new Error(
      `Unknown service: ${service}. Available: ${listCatalogServices().join(", ")}`,
    );
  }
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          { service, schema: entry.jsonSchema },
          null,
          2,
        ),
      },
    ],
  };
}
