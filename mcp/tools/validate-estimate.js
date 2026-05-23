import { getCatalogEntry, listCatalogServices } from "../catalog/index.js";

export const definition = {
  name: "validate_estimate",
  description:
    "Validate an estimate payload against the schema of the given service. Returns normalized params on success or field-level errors on failure.",
  inputSchema: {
    type: "object",
    properties: {
      service: { type: "string" },
      params: { type: "object" },
    },
    required: ["service", "params"],
  },
};

export async function handler(args) {
  const { service, params } = args ?? {};
  const entry = service && getCatalogEntry(service);
  if (!entry) {
    throw new Error(
      `Unknown service: ${service}. Available: ${listCatalogServices().join(", ")}`,
    );
  }

  const result = entry.zodSchema.safeParse(params ?? {});
  if (result.success) {
    return textResult({
      service,
      valid: true,
      normalized: result.data,
    });
  }
  return textResult({
    service,
    valid: false,
    errors: result.error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
      code: i.code,
    })),
  });
}

function textResult(payload) {
  return {
    content: [
      { type: "text", text: JSON.stringify(payload, null, 2) },
    ],
  };
}
