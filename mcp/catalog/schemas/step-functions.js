import { z } from "zod";

// Generated from runner/lib/services/step-functions.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    express: z.boolean().default(false).describe("Enable the Express Workflows section."),
    workflow_requests: z.number().int().min(0).default(0).describe("Standard Workflows — number of workflow executions."),
    transitions_per_workflow: z.number().int().min(0).default(0).describe("Standard Workflows — average number of state transitions per workflow execution."),
    express_workflow_requests: z.number().int().min(0).default(0).describe("Express Workflows — number of workflow executions per period."),
    express_workflow_requests_unit: z.enum(["per_second", "per_minute", "per_hour", "per_day", "per_month"]).default("per_month").describe("Unit for express_workflow_requests. Wizard default is \"per month\"."),
    express_duration_ms: z.number().min(0).default(0).describe("Express Workflows — average duration of each workflow execution in milliseconds."),
    express_memory_mb: z.number().int().min(64).max(10240).default(64).describe("Express Workflows — memory consumed by each workflow (MB). Wizard default is 64 MB."),
    express_memory_unit: z.enum(["MB", "GB"]).default("MB").describe("Unit for express_memory_mb. Wizard default is MB.")
  })
  .meta({ id: "step-functions" });

export const jsonSchema = z.toJSONSchema(zodSchema);
