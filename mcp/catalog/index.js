import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

const manifest = JSON.parse(
  readFileSync(join(HERE, "catalog.json"), "utf8"),
);

export const catalogVersion = manifest.version;

const entries = await Promise.all(
  Object.entries(manifest.services).map(async ([name, meta]) => {
    const mod = await import(join(HERE, meta.schema_ref));
    return [
      name,
      {
        name,
        meta,
        zodSchema: mod.zodSchema,
        jsonSchema: mod.jsonSchema,
      },
    ];
  }),
);

export const catalog = new Map(entries);

export function listCatalogServices() {
  return [...catalog.keys()].sort();
}

export function getCatalogEntry(name) {
  return catalog.get(name);
}
