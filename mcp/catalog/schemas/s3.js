import { z } from "zod";

export const zodSchema = z
  .object({
    storage_gb: z
      .number()
      .min(0)
      .describe("Average GB stored per month"),
    storage_class: z
      .enum(["standard", "ia", "glacier"])
      .default("standard"),
    put_requests_per_month: z.number().int().min(0).default(0),
    get_requests_per_month: z.number().int().min(0).default(0),
    region: z.string().min(1).describe("AWS region code"),
  })
  .meta({ id: "s3" });

export const jsonSchema = z.toJSONSchema(zodSchema);
