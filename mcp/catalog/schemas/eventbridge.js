import { z } from "zod";

// Generated from runner/lib/services/eventbridge.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    custom_events: z.number().int().min(0).default(0).describe("Number of custom events per month (in MILLIONS — calculator default unit)."),
    payload_size_kb: z.number().int().min(1).default(1).describe("Size of the payload in KB.")
  })
  .meta({ id: "eventbridge" });

export const jsonSchema = z.toJSONSchema(zodSchema);
