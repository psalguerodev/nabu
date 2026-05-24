import { z } from "zod";

// Generated from runner/lib/services/systems-manager.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    api_throughput: z.enum(["standard", "high"]).default("standard").describe("API throughput tier. Standard is free up to a quota; High Throughput is metered per interaction."),
    standard_params: z.number().int().min(0).default(0).describe("Number of standard Parameter Store parameters."),
    advanced_params: z.number().int().min(0).default(0).describe("Number of advanced Parameter Store parameters."),
    api_interactions_per_param: z.number().int().min(0).default(0).describe("API interactions per parameter, in the unit selected by api_interactions_unit."),
    api_interactions_unit: z.enum(["per_second", "per_minute", "per_hour", "per_day", "per_month"]).default("per_month").describe("Time unit for api_interactions_per_param. Default is per_month so callers pass realistic counts; the wizard's UI default is per_minute, so the runner always sets this explicitly.")
  })
  .meta({ id: "systems-manager" });

export const jsonSchema = z.toJSONSchema(zodSchema);
