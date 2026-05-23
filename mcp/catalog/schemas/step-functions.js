import { z } from "zod";

export const zodSchema = z
  .object({
    region: z.string().min(1).describe("AWS region code"),
    workflow_requests: z.number().int().min(0).default(0),
    transitions_per_workflow: z.number().int().min(0).default(0),
    express: z.boolean().default(false),
  })
  .meta({ id: "step-functions" });

export const jsonSchema = z.toJSONSchema(zodSchema);
