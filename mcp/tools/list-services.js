import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const HANDLERS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "playwright",
  "lib",
  "services",
);

export function listServices(dir = HANDLERS_DIR) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".js"))
    .map((f) => f.replace(/\.js$/, ""))
    .sort();
}

export const definition = {
  name: "list_supported_services",
  description: "List AWS services Nabu can currently estimate.",
  inputSchema: { type: "object", properties: {} },
};

export async function handler() {
  const services = listServices();
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ count: services.length, services }, null, 2),
      },
    ],
  };
}
