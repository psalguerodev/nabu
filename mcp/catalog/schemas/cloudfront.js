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
    pricing_model: z
      .enum(["payg", "flat"])
      .default("payg")
      .describe("Pay-as-you-go or flat-rate plan"),
    plan: z
      .enum(["free", "pro", "business", "premium"])
      .nullable()
      .default(null)
      .describe("Flat-rate plan tier (when pricing_model='flat')"),
    plan_quantity: z.number().int().min(1).default(1),
    region: z.string().min(1).default("us-east-1"),
  })
  .meta({ id: "cloudfront" });

export const jsonSchema = z.toJSONSchema(zodSchema);
