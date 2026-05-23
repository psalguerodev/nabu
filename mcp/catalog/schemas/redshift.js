import { z } from "zod";

export const zodSchema = z
  .object({
    region: z.string().min(1).describe("AWS region code"),
    mode: z.enum(["serverless", "provisioned"]).default("serverless"),
    nodes: z.number().int().min(1).default(1),
    instance_type: z.string().min(1).default("ra3.xlplus"),
    utilization_percent: z.number().min(0).max(100).default(100),
    base_rpu: z.number().min(0).default(8),
    hours_per_day: z.number().min(0).max(24).default(0),
    workload_size: z.string().nullable().default(null),
  })
  .meta({ id: "redshift" });

export const jsonSchema = z.toJSONSchema(zodSchema);
