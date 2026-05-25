import { z } from "zod";

// Generated from runner/lib/services/sagemaker-real-time-inference.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    models_deployed: z.number().int().min(1).default(1).describe("Number of unique models hosted by the endpoint group."),
    models_per_endpoint: z.number().int().min(1).default(1).describe("Number of model variants packed into a single endpoint."),
    instances_per_endpoint: z.number().int().min(1).default(1).describe("Number of provisioned instances per endpoint."),
    hours_per_day: z.number().min(0).max(24).default(24).describe("Hours per day the endpoint is active."),
    days_per_month: z.number().min(0).max(31).default(30).describe("Days per month the endpoint is active."),
    instance_type: z.string().min(1).default("ml.m5.large").describe("Exact SageMaker instance type (ml.* identifier)."),
    storage_amount_gb: z.number().min(0).default(50).describe("EBS storage attached to each endpoint instance (GB)."),
    data_in_gb: z.number().min(0).optional().describe("Inbound data processed per month (GB). Skipped when 0."),
    data_out_gb: z.number().min(0).optional().describe("Outbound data processed per month (GB). Skipped when 0.")
  })
  .meta({ id: "sagemaker-real-time-inference" });

export const jsonSchema = z.toJSONSchema(zodSchema);
