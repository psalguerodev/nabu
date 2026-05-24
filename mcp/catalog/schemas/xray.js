import { z } from "zod";

// Generated from runner/lib/services/xray.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    requests_per_month: z.number().int().min(0).default(0).describe("Number of requests per month (before sampling)."),
    sampling_rate: z.number().min(0).max(100).default(100).describe("Percentage of requests sampled (0-100)."),
    queries_per_month: z.number().int().min(0).default(0).describe("Number of X-Ray Insights / trace queries per month."),
    traces_per_query: z.number().int().min(0).default(100).describe("Average number of traces retrieved per query.")
  })
  .meta({ id: "xray" });

export const jsonSchema = z.toJSONSchema(zodSchema);
