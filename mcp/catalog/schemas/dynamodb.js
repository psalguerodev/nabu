import { z } from "zod";

// Generated from runner/lib/services/dynamodb.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    capacity_mode: z.enum(["provisioned", "on_demand"]).default("provisioned").describe("Capacity mode. Wizard default is provisioned (checkbox checked,"),
    storage_gb: z.number().min(0).default(0).describe("Data storage size in GB."),
    avg_item_size_kb: z.number().min(0).default(1).describe("Average item size in KB. Skipped when equal to the wizard default (1)."),
    baseline_write_per_sec: z.number().min(0).default(100).describe("Baseline write rate (writes/sec)."),
    peak_write_per_sec: z.number().min(0).default(400).describe("Peak write rate (writes/sec)."),
    baseline_read_per_sec: z.number().min(0).default(100).describe("Baseline read rate (reads/sec)."),
    peak_read_per_sec: z.number().min(0).default(400).describe("Peak read rate (reads/sec)."),
    peak_duration_hours: z.number().min(0).default(72).describe("Duration (hours) the peak rate is sustained. Legacy handler used a")
  })
  .meta({ id: "dynamodb" });

export const jsonSchema = z.toJSONSchema(zodSchema);
