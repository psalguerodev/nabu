import { z } from "zod";

// Generated from runner/lib/services/nat-gateway.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    number_of_nat_gateways: z.number().int().min(0).default(0).describe("Number of NAT Gateways provisioned. One per AZ is the typical"),
    data_processed_amount: z.number().min(0).default(0).describe("Volume of data processed by the NAT Gateways per month, in the"),
    data_processed_unit: z.enum(["gb_per_month", "tb_per_month"]).default("gb_per_month").describe("Unit for data_processed_amount."),
    regional_nat_gateways: z.number().int().min(1).default(1).describe("Number of Regional NAT Gateways. Wizard requires non-zero (~$45/mo per gateway)."),
    regional_nat_azs: z.number().int().min(1).default(1).describe("Number of Availability Zones the Regional NAT Gateway spans. Wizard requires non-zero."),
    regional_data_processed_amount: z.number().min(0).default(0).describe("Data processed per Regional NAT Gateway (in regional_data_processed_unit). Defaults to 0 (no traffic)."),
    regional_data_processed_unit: z.enum(["gb_per_month", "tb_per_month"]).default("gb_per_month").describe("Unit for regional_data_processed_amount.")
  })
  .meta({ id: "nat-gateway" });

export const jsonSchema = z.toJSONSchema(zodSchema);
