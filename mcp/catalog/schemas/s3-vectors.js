import { z } from "zod";

export const zodSchema = z
  .object({
    region: z.string().min(1).describe("AWS region code"),
    number_of_indexes: z.number().int().min(1).default(1),
    vectors_per_index: z.number().int().min(0).default(120000),
    vector_dimensions: z.number().int().min(1).default(1024),
    filterable_metadata_kb: z.number().min(0).default(2),
    non_filterable_metadata_kb: z.number().min(0).default(0),
    key_size_kb: z.number().min(0).default(0.5),
    percent_overwritten_per_month: z.number().min(0).default(0.167),
    total_queries_per_month: z.number().int().min(0).default(15000),
  })
  .meta({ id: "s3-vectors" });

export const jsonSchema = z.toJSONSchema(zodSchema);
