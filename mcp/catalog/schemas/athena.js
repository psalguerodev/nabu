import { z } from "zod";

// Generated from runner/lib/services/athena.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    queries_per_day: z.number().int().min(0).default(0).describe("Number of queries executed per day."),
    queries_per_month: z.number().min(0).default(0).optional().describe("Legacy v0.1 param. When > 0 and `queries_per_day` is 0, the raw"),
    data_scanned_per_query_gb: z.number().min(0).default(1).describe("Average amount of data scanned per query (GB).")
  })
  .meta({ id: "athena" });

export const jsonSchema = z.toJSONSchema(zodSchema);
