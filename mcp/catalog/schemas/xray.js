import { z } from "zod";

export const zodSchema = z
  .object({
    region: z.string().min(1).describe("AWS region code"),
    requests_per_month: z.number().int().min(0).default(0),
    sampling_rate: z.number().min(0).max(100).default(100),
    queries_per_month: z.number().int().min(0).default(0),
    traces_per_query: z.number().int().min(0).default(100),
  })
  .meta({ id: "xray" });

export const jsonSchema = z.toJSONSchema(zodSchema);
