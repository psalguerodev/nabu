import { z } from "zod";

export const zodSchema = z
  .object({
    region: z.string().min(1).describe("AWS region code"),
    storage_gb: z.number().min(0).default(0),
  })
  .meta({ id: "ecr" });

export const jsonSchema = z.toJSONSchema(zodSchema);
