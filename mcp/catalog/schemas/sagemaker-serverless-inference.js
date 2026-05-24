import { z } from "zod";

// Generated from runner/lib/services/sagemaker-serverless-inference.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    requests_per_month: z.number().int().min(1).default(1000).describe("Raw monthly request count. The handler rescales for the wizard's"),
    duration_ms: z.number().int().min(1).default(100),
    memory_mb: z.enum(["1024", "2048", "3072", "4096", "5120", "6144"]).default("1024"),
    provisioned_concurrency: z.number().int().min(0).optional()
  })
  .meta({ id: "sagemaker-serverless-inference" });

export const jsonSchema = z.toJSONSchema(zodSchema);
