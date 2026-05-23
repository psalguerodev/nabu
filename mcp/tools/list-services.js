import { catalogVersion, listCatalogServices } from "../catalog/index.js";

export const definition = {
  name: "list_supported_services",
  description: "List AWS services Nabu can currently estimate.",
  inputSchema: { type: "object", properties: {} },
};

export async function handler() {
  const services = listCatalogServices();
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            count: services.length,
            services,
            catalog_version: catalogVersion,
          },
          null,
          2,
        ),
      },
    ],
  };
}
