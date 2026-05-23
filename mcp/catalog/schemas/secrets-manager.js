import { z } from "zod";

export const zodSchema = z
  .object({
    region: z.string().min(1).describe("AWS region code"),
    number_of_secrets: z.number().int().min(0).default(0),
    avg_secret_duration_days: z.number().min(0).default(30),
    api_calls_per_month: z.number().int().min(0).default(0),
  })
  .meta({ id: "secrets-manager" });

export const jsonSchema = z.toJSONSchema(zodSchema);
