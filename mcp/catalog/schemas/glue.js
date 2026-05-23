import { z } from "zod";

export const zodSchema = z
  .object({
    region: z.string().min(1).describe("AWS region code"),
    spark_dpus: z.number().min(0).default(0),
    spark_minutes_per_month: z.number().min(0).default(0),
    python_shell_dpus: z.number().min(0).default(0),
    python_shell_minutes_per_month: z.number().min(0).default(0),
    interactive_dpus: z.number().min(0).default(2),
    interactive_minutes_per_month: z.number().min(0).default(1),
  })
  .meta({ id: "glue" });

export const jsonSchema = z.toJSONSchema(zodSchema);
