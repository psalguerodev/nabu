import { z } from "zod";

// Generated from runner/lib/services/s3-vectors.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    number_of_indexes: z.number().int().min(1).default(1).describe("Number of vector indexes in the bucket."),
    vectors_per_index: z.number().int().min(0).default(120000).describe("Vectors stored per index (average)."),
    vector_dimensions: z.number().int().min(1).default(1024).describe("Dimensions per vector."),
    filterable_metadata_kb: z.number().min(0).default(2).describe("Filterable metadata (KB) attached per vector."),
    non_filterable_metadata_kb: z.number().min(0).default(0).describe("Non-filterable metadata (KB) per vector. Skipped when 0 (wizard"),
    key_size_kb: z.number().min(0).default(0.5).describe("Key size (KB) per vector."),
    percent_overwritten_per_month: z.number().min(0).default(0.167).describe("Percentage of vectors overwritten per month."),
    total_queries_per_month: z.number().int().min(0).default(15000).describe("Total number of queries per month.")
  })
  .meta({ id: "s3-vectors" });

export const jsonSchema = z.toJSONSchema(zodSchema);
