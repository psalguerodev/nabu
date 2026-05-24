import { z } from "zod";

// Generated from runner/lib/services/sagemaker-batch-transform.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    jobs_per_month: z.number().int().min(1).default(1),
    instances_per_job: z.number().int().min(1).default(1),
    hours_per_instance: z.number().min(0).default(1),
    instance_type: z.string().min(1).default("ml.m5.large")
  })
  .meta({ id: "sagemaker-batch-transform" });

export const jsonSchema = z.toJSONSchema(zodSchema);
