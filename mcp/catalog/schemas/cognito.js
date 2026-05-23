import { z } from "zod";

export const zodSchema = z
  .object({
    region: z.string().min(1).describe("AWS region code"),
    tier: z.enum(["lite", "essentials", "plus"]).default("lite"),
    mau: z.number().int().min(0).default(0),
    saml_mau: z.number().int().min(0).default(0),
  })
  .meta({ id: "cognito" });

export const jsonSchema = z.toJSONSchema(zodSchema);
