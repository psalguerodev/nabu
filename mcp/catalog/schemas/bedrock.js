import { z } from "zod";

export const zodSchema = z
  .object({
    region: z.string().min(1).describe("AWS region code"),
    provider: z.string().min(1).default("Anthropic"),
    model: z.string().nullable().default(null),
    requests_per_minute: z.number().min(0).default(0),
    hours_per_day: z.number().min(0).max(24).default(24),
    input_tokens_per_request: z.number().int().min(0).default(1000),
    output_tokens_per_request: z.number().int().min(0).default(500),
  })
  .meta({ id: "bedrock" });

export const jsonSchema = z.toJSONSchema(zodSchema);
