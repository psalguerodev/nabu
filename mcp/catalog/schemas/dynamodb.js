import { z } from "zod";

export const zodSchema = z
  .object({
    capacity_mode: z.enum(["provisioned", "on-demand"]).default("provisioned"),
    storage_gb: z.number().min(0).describe("Data stored per month in GB"),
    avg_item_size_kb: z.number().min(0.1).default(1),
    baseline_write_per_sec: z
      .number()
      .min(0)
      .default(100)
      .describe("Baseline write rate (WCU/sec) for provisioned mode"),
    peak_write_per_sec: z.number().min(0).default(400),
    baseline_read_per_sec: z.number().min(0).default(100),
    peak_read_per_sec: z.number().min(0).default(400),
    peak_duration_hours: z.number().min(0).max(744).default(72),
    region: z.string().min(1),
  })
  .meta({ id: "dynamodb" });

export const jsonSchema = z.toJSONSchema(zodSchema);
