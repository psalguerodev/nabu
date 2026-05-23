import { z } from "zod";

export const zodSchema = z
  .object({
    region: z.string().min(1).describe("AWS region code"),
    metrics: z.number().int().min(0).default(0).describe("Custom metrics"),
    api_requests: z.number().int().min(0).default(0),
  })
  .meta({ id: "cloudwatch" });

export const jsonSchema = z.toJSONSchema(zodSchema);
