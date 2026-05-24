#!/usr/bin/env node
/**
 * Generate (or refresh) the MCP Zod schema for a service from its YAML
 * datasheet. The output is a single .js file at
 *   ../mcp/catalog/schemas/<service>.js
 * exporting { zodSchema, jsonSchema } in the shape the MCP catalog loader
 * expects.
 *
 * Usage:
 *   node tools/gen-zod.mjs ec2
 *   node tools/gen-zod.mjs ec2 --check    # exit 1 if regenerated output differs from disk
 *
 * Field → Zod mapping rules:
 *
 *   type=string             z.string().min(1)           plus regex pattern from constraints
 *   type=integer            z.number().int()            plus min/max
 *   type=number             z.number()                  plus min/max
 *   type=boolean            z.boolean()
 *   type=enum               z.enum([...values])
 *   type=object             z.object({ children... })
 *   type=array              z.array(z.unknown())        (arrays are deferred — runner
 *                                                       doesn't execute them yet)
 *
 * Modifiers:
 *   default:           .default(value)
 *   optional: true     .optional()
 *   required: true     leaves as-is (no .optional())
 *   unsupported: true  field is omitted from the generated Zod schema.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDatasheet } from "../lib/datasheet.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");

async function resolveYamlPath(service) {
  const base = join(REPO, "runner", "lib", "services");
  const { pathFor } = await import(join(base, "registry.js"));
  const sub = pathFor(service);
  if (!sub) {
    throw new Error(`gen-zod: '${service}' not found in registry.js`);
  }
  // Datasheet conventionally named <basename>.yaml inside the service folder
  // (e.g. ai/sagemaker/async/async.yaml). The basename is the trailing
  // path segment.
  const leaf = sub.split("/").pop();
  const candidate = join(base, sub, `${leaf}.yaml`);
  if (!existsSync(candidate)) {
    throw new Error(
      `gen-zod: no datasheet at ${candidate} (expected <folder>/<leaf>.yaml)`,
    );
  }
  return candidate;
}

function emitFieldType(field) {
  if (field.unsupported) return null;
  const t = field.type;
  switch (t) {
    case "string": {
      let s = `z.string().min(1)`;
      if (field.constraints?.pattern) {
        s = `z.string().regex(/${field.constraints.pattern.replace(/\//g, "\\/")}/)`;
      }
      return s;
    }
    case "integer": {
      let s = `z.number().int()`;
      if (field.constraints?.min !== undefined) s += `.min(${field.constraints.min})`;
      if (field.constraints?.max !== undefined) s += `.max(${field.constraints.max})`;
      return s;
    }
    case "number": {
      let s = `z.number()`;
      if (field.constraints?.min !== undefined) s += `.min(${field.constraints.min})`;
      if (field.constraints?.max !== undefined) s += `.max(${field.constraints.max})`;
      return s;
    }
    case "boolean":
      return `z.boolean()`;
    case "enum": {
      const values = (field.options ?? [])
        .filter((o) => !o.unsupported)
        .map((o) => JSON.stringify(o.value));
      return `z.enum([${values.join(", ")}])`;
    }
    case "object": {
      const lines = [];
      for (const c of field.children ?? []) {
        const inner = emitFieldExpr(c);
        if (inner) lines.push(`    ${c.id}: ${inner}`);
      }
      return `z.object({\n${lines.join(",\n")}\n  })`;
    }
    case "array":
      return `z.array(z.unknown())`;
    default:
      throw new Error(`gen-zod: unsupported field type "${t}" on ${field.id}`);
  }
}

function emitFieldExpr(field) {
  const base = emitFieldType(field);
  if (!base) return null;
  let expr = base;
  if (field.default !== undefined) {
    expr += `.default(${JSON.stringify(field.default)})`;
  }
  if (field.optional && !field.required) {
    expr += `.optional()`;
  }
  if (field.description) {
    const d = JSON.stringify(field.description.trim().split("\n")[0]);
    expr += `.describe(${d})`;
  }
  return expr;
}

function emitSchema(ds) {
  const lines = [];
  for (const f of ds.fields ?? []) {
    if (f.unsupported) continue;
    // `advanced` (filters) and `legacy` (kept for backward compat) get
    // emitted with their declared type but always optional, so callers
    // can omit them. They're informational flags for docs / tooling.
    const overrides = f.advanced || f.legacy ? { optional: true } : {};
    const expr = emitFieldExpr({ ...f, ...overrides });
    if (!expr) continue;
    lines.push(`    ${f.id}: ${expr}`);
  }
  return `import { z } from "zod";

// Generated from runner/lib/services/${ds.service}.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
${lines.join(",\n")}
  })
  .meta({ id: ${JSON.stringify(ds.service)} });

export const jsonSchema = z.toJSONSchema(zodSchema);
`;
}

async function main() {
  const [service, ...rest] = process.argv.slice(2);
  if (!service) {
    console.error("usage: gen-zod.mjs <service> [--check]");
    process.exit(2);
  }
  const check = rest.includes("--check");
  const yamlPath = await resolveYamlPath(service);
  const outPath = join(REPO, "mcp", "catalog", "schemas", `${service}.js`);

  // Use the runtime loader so `extends` + `$include` are honored and the
  // Zod schema reflects the fully-resolved field set.
  const ds = loadDatasheet(yamlPath);
  const generated = emitSchema(ds);

  if (check) {
    const existing = readFileSync(outPath, "utf8");
    if (existing !== generated) {
      console.error(`gen-zod: ${outPath} is out of sync with ${yamlPath}.`);
      process.exit(1);
    }
    console.log(`gen-zod: ${service} schema in sync.`);
    return;
  }

  writeFileSync(outPath, generated);
  console.log(`gen-zod: wrote ${outPath} (${generated.length} bytes).`);
}

await main();
