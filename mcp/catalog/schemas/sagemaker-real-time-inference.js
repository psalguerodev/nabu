import { z } from "zod";

// Generated from runner/lib/services/sagemaker-real-time-inference.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    models_deployed: z.number().int().min(1).default(1),
    models_per_endpoint: z.number().int().min(1).default(1),
    instances_per_endpoint: z.number().int().min(1).default(1),
    hours_per_day: z.number().min(0).max(24).default(24),
    days_per_month: z.number().min(0).max(31).default(30),
    instance_type: z.string().min(1).default("ml.m5.large"),
    storage_amount_gb: z.number().min(0).default(50),
    data_in_gb: z.number().min(0).optional(),
    data_out_gb: z.number().min(0).optional()
  })
  .meta({ id: "sagemaker-real-time-inference" });

export const jsonSchema = z.toJSONSchema(zodSchema);
