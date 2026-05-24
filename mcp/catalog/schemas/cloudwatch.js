import { z } from "zod";

// Generated from runner/lib/services/cloudwatch.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    metrics: z.number().int().min(0).default(0).describe("Custom / detailed metrics."),
    api_requests: z.number().int().min(0).default(0).describe("Number of other API requests.")
  })
  .meta({ id: "cloudwatch" });

export const jsonSchema = z.toJSONSchema(zodSchema);
