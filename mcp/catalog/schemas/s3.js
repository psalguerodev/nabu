import { z } from "zod";

// Generated from runner/lib/services/s3.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    storage_gb: z.number().min(0).default(0).describe("Average GB stored per month in S3 Standard."),
    storage_class: z.enum(["standard", "ia", "glacier"]).default("standard").describe("Storage class (kept for backward compat; only `standard` drives the wizard today)."),
    put_requests_per_month: z.number().int().min(0).default(0).describe("PUT, COPY, POST, LIST requests per month against S3 Standard."),
    get_requests_per_month: z.number().int().min(0).default(0).describe("GET, SELECT, and all other requests per month from S3 Standard.")
  })
  .meta({ id: "s3" });

export const jsonSchema = z.toJSONSchema(zodSchema);
