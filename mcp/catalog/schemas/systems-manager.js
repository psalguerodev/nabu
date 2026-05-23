import { z } from "zod";

export const zodSchema = z
  .object({
    region: z.string().min(1).describe("AWS region code"),
    standard_params: z.number().int().min(0).default(0),
    advanced_params: z.number().int().min(0).default(0),
    api_interactions_per_param: z.number().int().min(0).default(0),
  })
  .meta({ id: "systems-manager" });

export const jsonSchema = z.toJSONSchema(zodSchema);
