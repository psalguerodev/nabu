import { z } from "zod";

export const zodSchema = z
  .object({
    invocations_per_month: z.number().int().min(0),
    memory_mb: z.number().int().min(128).max(10240),
    avg_duration_ms: z.number().min(1),
    architecture: z.enum(["x86_64", "arm64"]).default("x86_64"),
    region: z.string().min(1),
  })
  .meta({ id: "lambda" });

export const jsonSchema = z.toJSONSchema(zodSchema);
