import { z } from "zod";

// Generated from runner/lib/services/kms.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    customer_managed_cmks: z.number().int().min(0).default(0).describe("Number of customer-managed Customer Master Keys (CMKs). AWS-managed"),
    symmetric_requests: z.number().int().min(0).default(0).describe("Symmetric-key API requests per month (Encrypt, Decrypt, GenerateDataKey"),
    asymmetric_requests_non_rsa2048: z.number().int().min(0).default(0).describe("Asymmetric API requests per month for any key type EXCEPT RSA 2048"),
    asymmetric_requests_rsa2048: z.number().int().min(0).default(0).describe("Asymmetric API requests per month using RSA 2048 keys. Cheaper than"),
    ecc_generate_data_key_pair_requests: z.number().int().min(0).default(0).describe("GenerateDataKeyPair requests per month against ECC CMKs. Separate"),
    rsa_generate_data_key_pair_requests: z.number().int().min(0).default(0).describe("GenerateDataKeyPair requests per month against RSA CMKs. Separate")
  })
  .meta({ id: "kms" });

export const jsonSchema = z.toJSONSchema(zodSchema);
