import { z } from "zod";

// Generated from runner/lib/services/lambda.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    include_free_tier: z.enum(["include", "without"]).default("without").describe("Free-tier handling. Default \"without\" matches the v0.1 handler's"),
    architecture: z.enum(["x86_64", "arm64"]).default("x86_64").describe("Lambda architecture. The wizard defaults to x86; we only click the dropdown when arm64 is requested."),
    invocations_per_month: z.number().int().min(0).default(0).describe("Number of on-demand Lambda invocations per month."),
    avg_duration_ms: z.number().min(1).default(100).describe("Average duration of each request in milliseconds."),
    memory_mb: z.number().int().min(128).max(10240).default(128).describe("Memory allocated per function in MB. Wizard unit dropdown defaults to MB so no override is needed.")
  })
  .meta({ id: "lambda" });

export const jsonSchema = z.toJSONSchema(zodSchema);
