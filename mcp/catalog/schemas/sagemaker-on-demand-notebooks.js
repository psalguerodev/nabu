import { z } from "zod";

// Generated from runner/lib/services/sagemaker-on-demand-notebooks.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    data_scientists: z.number().int().min(1).default(1),
    instances_per_scientist: z.number().int().min(1).default(1),
    hours_per_day: z.number().min(0).max(24).default(8),
    days_per_month: z.number().min(0).max(31).default(22),
    instance_type: z.string().min(1).default("ml.t3.medium"),
    storage_amount_gb: z.number().min(0).default(50)
  })
  .meta({ id: "sagemaker-on-demand-notebooks" });

export const jsonSchema = z.toJSONSchema(zodSchema);
