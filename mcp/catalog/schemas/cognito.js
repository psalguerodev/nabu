import { z } from "zod";

// Generated from runner/lib/services/cognito.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    tier: z.enum(["lite", "essentials", "plus"]).default("lite").describe("User-pool pricing tier. Lite is free up to 10k MAU; Essentials (~$0.0055"),
    mau: z.number().int().min(0).default(0).describe("Monthly active users in the selected tier."),
    saml_mau: z.number().int().min(0).default(0).describe("SAML or OIDC federation monthly active users."),
    advanced_security: z.enum(["enabled", "disabled"]).default("enabled").describe("Advanced security features toggle. Lite-tier ONLY — the wizard hides"),
    m2m_token_requests: z.number().int().min(0).default(0).describe("Machine-to-machine (M2M) token requests per month. Tier-agnostic — the"),
    m2m_app_clients: z.number().int().min(0).default(0).describe("Number of M2M app clients."),
    m2m_token_optimization_rate: z.number().min(0).max(100).default(0).describe("Token-request optimization rate (% of token requests served from cache"),
    m2m_app_client_optimization_rate: z.number().min(0).max(100).default(0).describe("App-client optimization rate (% discount). Wizard default 0.")
  })
  .meta({ id: "cognito" });

export const jsonSchema = z.toJSONSchema(zodSchema);
