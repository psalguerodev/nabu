import { z } from "zod";

// Generated from runner/lib/services/secrets-manager.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    number_of_secrets: z.number().int().min(0).default(0).describe("Number of secrets stored."),
    avg_secret_duration_days: z.number().int().min(1).max(30).default(30).describe("Average lifetime of each secret in days (1-30). The calculator's"),
    api_calls_per_month: z.number().int().min(0).default(0).describe("Number of API calls per month.")
  })
  .meta({ id: "secrets-manager" });

export const jsonSchema = z.toJSONSchema(zodSchema);
