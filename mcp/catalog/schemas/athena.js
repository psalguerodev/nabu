import { z } from "zod";

export const zodSchema = z
  .object({
    region: z.string().min(1).describe("AWS region code"),
    queries_per_day: z.number().int().min(0).default(0),
    queries_per_month: z.number().min(0).default(0),
    data_scanned_per_query_gb: z.number().min(0).default(1),
  })
  .meta({ id: "athena" });

export const jsonSchema = z.toJSONSchema(zodSchema);
