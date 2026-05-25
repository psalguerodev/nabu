import { z } from "zod";

// Generated from runner/lib/services/s3.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    storage_gb: z.number().min(0).default(0).describe("Average GB stored per month in S3 Standard."),
    storage_class: z.enum(["standard", "ia", "glacier"]).default("standard").describe("Storage class (backward compat; cosmetic - flow drives all classes via per-class fields)."),
    put_requests_per_month: z.number().int().min(0).default(0).describe("PUT, COPY, POST, LIST requests per month against S3 Standard."),
    get_requests_per_month: z.number().int().min(0).default(0).describe("GET, SELECT, and all other requests per month from S3 Standard."),
    int_tiering_storage_gb: z.number().min(0).default(0).describe("Average GB stored per month in S3 Intelligent-Tiering (sum across tiers)."),
    int_tiering_put_requests_per_month: z.number().int().min(0).default(0).describe("PUT/COPY/POST/LIST requests per month against S3 Intelligent-Tiering."),
    int_tiering_get_requests_per_month: z.number().int().min(0).default(0).describe("GET/SELECT/other requests per month from S3 Intelligent-Tiering."),
    standard_ia_storage_gb: z.number().min(0).default(0).describe("Average GB stored per month in S3 Standard-Infrequent Access."),
    standard_ia_put_requests_per_month: z.number().int().min(0).default(0).describe("PUT/COPY/POST/LIST requests per month against S3 Standard-IA."),
    standard_ia_get_requests_per_month: z.number().int().min(0).default(0).describe("GET/SELECT/other requests per month from S3 Standard-IA."),
    standard_ia_data_retrieval_gb: z.number().min(0).default(0).describe("GB of data retrieved per month from S3 Standard-IA."),
    one_zone_ia_storage_gb: z.number().min(0).default(0).describe("Average GB stored per month in S3 One Zone-Infrequent Access."),
    one_zone_ia_put_requests_per_month: z.number().int().min(0).default(0).describe("PUT/COPY/POST/LIST requests per month against S3 One Zone-IA."),
    one_zone_ia_get_requests_per_month: z.number().int().min(0).default(0).describe("GET/SELECT/other requests per month from S3 One Zone-IA."),
    one_zone_ia_data_retrieval_gb: z.number().min(0).default(0).describe("GB of data retrieved per month from S3 One Zone-IA."),
    glacier_instant_storage_gb: z.number().min(0).default(0).describe("Average GB stored per month in S3 Glacier Instant Retrieval."),
    glacier_instant_put_requests_per_month: z.number().int().min(0).default(0).describe("PUT/COPY/POST/LIST requests per month against S3 Glacier Instant Retrieval."),
    glacier_instant_get_requests_per_month: z.number().int().min(0).default(0).describe("GET/SELECT/other requests per month from S3 Glacier Instant Retrieval."),
    glacier_instant_data_retrieval_gb: z.number().min(0).default(0).describe("GB of data retrieved per month from S3 Glacier Instant Retrieval."),
    glacier_flexible_storage_gb: z.number().min(0).default(0).describe("Average GB stored per month in S3 Glacier Flexible Retrieval."),
    glacier_flexible_put_requests_per_month: z.number().int().min(0).default(0).describe("PUT/COPY/POST/LIST requests per month against S3 Glacier Flexible Retrieval."),
    glacier_flexible_data_retrieval_gb: z.number().min(0).default(0).describe("GB of data retrieved per month via the Standard tier from S3 Glacier"),
    glacier_deep_archive_storage_gb: z.number().min(0).default(0).describe("Average GB stored per month in S3 Glacier Deep Archive."),
    glacier_deep_archive_put_requests_per_month: z.number().int().min(0).default(0).describe("PUT/COPY/POST/LIST requests per month against S3 Glacier Deep Archive."),
    glacier_deep_archive_data_retrieval_gb: z.number().min(0).default(0).describe("GB of data retrieved per month via the Standard tier from S3 Glacier"),
    express_one_zone_storage_gb: z.number().min(0).default(0).describe("Average GB stored per month in S3 Express One Zone."),
    express_one_zone_put_requests_per_month: z.number().int().min(0).default(0).describe("PUT/COPY/POST/LIST/RENAME requests per month against S3 Express One Zone."),
    express_one_zone_get_requests_per_month: z.number().int().min(0).default(0).describe("GET and all other requests per month from S3 Express One Zone.")
  })
  .meta({ id: "s3" });

export const jsonSchema = z.toJSONSchema(zodSchema);
