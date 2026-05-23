import { z } from "zod";

export const zodSchema = z
  .object({
    region: z.string().min(1).describe("AWS region code"),
    custom_events: z.number().min(0).default(0).describe("Custom events (millions per month)"),
    payload_size_kb: z.number().min(0).default(1),
  })
  .meta({ id: "eventbridge" });

export const jsonSchema = z.toJSONSchema(zodSchema);
