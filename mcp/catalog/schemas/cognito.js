import { z } from "zod";

// Generated from runner/lib/services/cognito.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    tier: z.enum(["lite", "essentials", "plus"]).default("lite").describe("User-pool pricing tier. Lite is free up to 10k MAU; Essentials and Plus are metered per MAU."),
    mau: z.number().int().min(0).default(0).describe("Monthly active users in the selected tier."),
    saml_mau: z.number().int().min(0).default(0).describe("SAML or OIDC federation monthly active users.")
  })
  .meta({ id: "cognito" });

export const jsonSchema = z.toJSONSchema(zodSchema);
