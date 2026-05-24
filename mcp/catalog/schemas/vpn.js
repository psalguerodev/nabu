import { z } from "zod";

// Generated from runner/lib/services/vpn.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    site_to_site_connections: z.number().int().min(0).default(1).describe("Number of Site-to-Site VPN connections."),
    hours_per_day: z.number().min(0).max(24).default(24).describe("Average duration each connection is active per day (hours).")
  })
  .meta({ id: "vpn" });

export const jsonSchema = z.toJSONSchema(zodSchema);
