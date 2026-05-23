import { z } from "zod";

export const zodSchema = z
  .object({
    region: z.string().min(1).describe("AWS region code"),
    site_to_site_connections: z.number().int().min(0).default(1),
    hours_per_day: z.number().min(0).max(24).default(24),
  })
  .meta({ id: "vpn" });

export const jsonSchema = z.toJSONSchema(zodSchema);
