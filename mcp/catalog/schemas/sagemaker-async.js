import { z } from "zod";

export const zodSchema = z
  .object({
    region: z.string().min(1).describe("AWS region code"),
    models_deployed: z.number().int().min(1).default(1),
    models_per_endpoint: z.number().int().min(1).default(1),
    instances_per_endpoint: z.number().int().min(1).default(1),
    hours_per_day: z.number().min(0).max(24).default(12),
    days_per_month: z.number().min(0).max(31).default(30),
    instance_type: z.string().min(1).default("ml.g5.2xlarge"),
    storage_amount_gb: z.number().min(0).default(100),
    data_in_gb: z.number().min(0).default(0),
    data_out_gb: z.number().min(0).default(0),
  })
  .meta({ id: "sagemaker-async" });

export const jsonSchema = z.toJSONSchema(zodSchema);
