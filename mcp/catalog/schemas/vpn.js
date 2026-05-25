import { z } from "zod";

// Generated from runner/lib/services/vpn.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    site_to_site_connections: z.number().int().min(0).default(1).describe("Number of Site-to-Site VPN connections."),
    hours_per_day: z.number().min(0).max(24).default(24).describe("Average duration each connection is active per day (hours)."),
    inbound_data_amount: z.number().min(0).default(0).describe("Inbound data transfer amount (in the unit selected by inbound_data_unit). Inbound from internet or other regions is currently $0/GB."),
    inbound_data_unit: z.enum(["gb_per_month", "tb_per_month"]).default("tb_per_month").describe("Unit for inbound_data_amount."),
    intra_region_data_amount: z.number().min(0).default(0).describe("Intra-region data transfer amount (in the unit selected by intra_region_data_unit). Traffic between AZs in the same region routed via VPN endpoints."),
    intra_region_data_unit: z.enum(["gb_per_month", "tb_per_month"]).default("tb_per_month").describe("Unit for intra_region_data_amount."),
    outbound_data_amount: z.number().min(0).default(0).describe("Outbound data transfer amount (in the unit selected by outbound_data_unit). Default destination is the Internet ($0.05–$0.09/GB); this dominates VPN cost in hub-and-spoke topologies."),
    outbound_data_unit: z.enum(["gb_per_month", "tb_per_month"]).default("tb_per_month").describe("Unit for outbound_data_amount.")
  })
  .meta({ id: "vpn" });

export const jsonSchema = z.toJSONSchema(zodSchema);
