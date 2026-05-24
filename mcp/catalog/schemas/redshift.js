import { z } from "zod";

// Generated from runner/lib/services/redshift.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    mode: z.enum(["serverless", "provisioned"]).default("serverless").describe("Redshift mode. Wizard default is Provisioned; YAML default is serverless, so always applied."),
    workload_size: z.enum(["price_performance", "balanced", "price"]).optional().describe("Optional workload-size dropdown for Serverless. When unset, the"),
    base_rpu: z.enum(["8", "16", "24", "32", "40", "48", "56", "64", "80", "96", "112", "128", "256", "512"]).default("8").describe("Base RPU for Redshift Serverless. Discrete dropdown values."),
    hours_per_day: z.number().min(0).max(24).default(0).describe("Expected daily runtime in hours (Serverless)."),
    nodes: z.number().int().min(1).default(1).describe("Number of provisioned nodes."),
    instance_type: z.string().min(1).default("ra3.xlplus").describe("Exact provisioned node instance type (e.g. ra3.xlplus, ra3.4xlarge,"),
    utilization_percent: z.number().min(0).max(100).default(100).describe("Utilization percent (On-Demand only). 100 == wizard default.")
  })
  .meta({ id: "redshift" });

export const jsonSchema = z.toJSONSchema(zodSchema);
