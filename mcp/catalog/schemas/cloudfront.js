import { z } from "zod";

// Generated from runner/lib/services/cloudfront.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    pricing_model: z.enum(["payg", "flat"]).default("payg").describe("Pay-as-you-go vs flat-rate plans. Wizard default is Flat Rate; YAML default is payg, so we always apply."),
    data_out_gb_per_month: z.number().min(0).default(0).describe("Data transferred to the internet per month (GB)."),
    data_to_origin_gb_per_month: z.number().min(0).default(0).describe("Data transferred back to origin per month (GB)."),
    https_requests_per_month: z.number().int().min(0).default(0).describe("HTTPS requests per month."),
    plan: z.enum(["free", "pro", "business", "premium"]).default("free").describe("Flat-rate plan tier (used when pricing_model='flat')."),
    plan_quantity: z.number().int().min(1).default(1).describe("Quantity multiplier for the selected flat-rate plan.")
  })
  .meta({ id: "cloudfront" });

export const jsonSchema = z.toJSONSchema(zodSchema);
