import { z } from "zod";

// Generated from runner/lib/services/step-functions.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    express: z.boolean().default(false).describe("Enable the Express Workflows section."),
    workflow_requests: z.number().int().min(0).default(0).describe("Number of workflow executions."),
    transitions_per_workflow: z.number().int().min(0).default(0).describe("Average number of state transitions per workflow execution.")
  })
  .meta({ id: "step-functions" });

export const jsonSchema = z.toJSONSchema(zodSchema);
