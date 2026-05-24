import { z } from "zod";

// Generated from runner/lib/services/bedrock.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    provider: z.enum(["Amazon", "Anthropic"]).default("Anthropic").describe("Foundation-model provider. Wizard default is Amazon (checked) with"),
    model: z.string().min(1).optional().describe("Exact wizard label of the model to select (case-insensitive). E.g."),
    requests_per_minute: z.number().min(0).default(0).describe("Average requests per minute."),
    hours_per_day: z.number().min(0).max(24).default(24).describe("Hours per day at the above request rate."),
    input_tokens_per_request: z.number().int().min(0).default(1000).describe("Average input tokens per request."),
    output_tokens_per_request: z.number().int().min(0).default(500).describe("Average output tokens per request.")
  })
  .meta({ id: "bedrock" });

export const jsonSchema = z.toJSONSchema(zodSchema);
