import { z } from "zod";

// Generated from runner/lib/services/ecr.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    storage_gb: z.number().min(0).default(0).describe("Amount of data stored (GB).")
  })
  .meta({ id: "ecr" });

export const jsonSchema = z.toJSONSchema(zodSchema);
