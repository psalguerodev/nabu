import { z } from "zod";

// Generated from runner/lib/services/sagemaker-training.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    jobs_per_month: z.number().int().min(1).default(1).describe("Number of batch jobs run per month."),
    instances_per_job: z.number().int().min(1).default(1).describe("Number of instances spun up per batch job."),
    hours_per_instance: z.number().min(0).default(1),
    instance_type: z.string().min(1).default("ml.m5.large").describe("Exact SageMaker instance type (ml.* identifier)."),
    storage_amount_gb: z.number().min(0).default(50).describe("EBS storage attached to each endpoint instance (GB).")
  })
  .meta({ id: "sagemaker-training" });

export const jsonSchema = z.toJSONSchema(zodSchema);
