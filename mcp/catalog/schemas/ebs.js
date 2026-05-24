import { z } from "zod";

// Generated from runner/lib/services/ebs.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    volume_count: z.number().int().min(1).default(1).describe("Number of identical volumes."),
    hours_per_month: z.number().min(0).max(744).default(730).describe("Average duration each volume is attached per month."),
    volume_type: z.enum(["gp3", "gp2", "io1", "io2", "st1", "sc1", "magnetic"]).default("gp3").describe("EBS volume type."),
    volume_size_gb: z.number().min(1).default(100).describe("Storage amount per volume (GB)."),
    iops: z.number().int().min(100).optional().describe("Provisioned IOPS per volume (gp3/io1/io2 only)."),
    throughput_mbps: z.number().int().min(125).optional().describe("Provisioned throughput in MBps (gp3 only).")
  })
  .meta({ id: "ebs" });

export const jsonSchema = z.toJSONSchema(zodSchema);
