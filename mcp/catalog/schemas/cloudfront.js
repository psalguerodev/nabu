import { z } from "zod";

export const zodSchema = z
  .object({
    data_out_gb_per_month: z
      .number()
      .min(0)
      .default(0)
      .describe("Data transferred to internet per month (GB)"),
    data_to_origin_gb_per_month: z.number().min(0).default(0),
    https_requests_per_month: z
      .number()
      .int()
      .min(0)
      .default(0)
      .describe("HTTPS requests per month"),
    region: z.string().min(1).default("us-east-1"),
  })
  .meta({ id: "cloudfront" });

export const jsonSchema = z.toJSONSchema(zodSchema);
