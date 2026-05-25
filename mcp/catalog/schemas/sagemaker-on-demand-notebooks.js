import { z } from "zod";

// Generated from runner/lib/services/sagemaker-on-demand-notebooks.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    data_scientists: z.number().int().min(1).default(1).describe("Number of data scientists using the notebook service."),
    instances_per_scientist: z.number().int().min(1).default(1),
    hours_per_day: z.number().min(0).max(24).default(8).describe("Hours per day the endpoint is active."),
    days_per_month: z.number().min(0).max(31).default(22).describe("Days per month the endpoint is active."),
    instance_type: z.string().min(1).default("ml.t3.medium").describe("Exact SageMaker instance type (ml.* identifier)."),
    storage_amount_gb: z.number().min(0).default(50).describe("EBS storage attached to each endpoint instance (GB).")
  })
  .meta({ id: "sagemaker-on-demand-notebooks" });

export const jsonSchema = z.toJSONSchema(zodSchema);
