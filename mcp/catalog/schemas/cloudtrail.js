import { z } from "zod";

export const zodSchema = z
  .object({
    region: z.string().min(1).describe("AWS region code"),
    mgmt_events: z.number().int().min(0).default(5000),
    mgmt_trails: z.number().int().min(0).default(3),
    read_mgmt_events: z.number().int().min(0).default(1),
    read_mgmt_trails: z.number().int().min(0).default(1),
    s3_operations: z.number().int().min(0).default(20000),
    s3_trails: z.number().int().min(0).default(3),
    lambda_events: z.number().int().min(0).default(10),
    lambda_trails: z.number().int().min(0).default(1),
    network_events: z.number().int().min(0).default(5000),
    network_trails: z.number().int().min(0).default(1),
  })
  .meta({ id: "cloudtrail" });

export const jsonSchema = z.toJSONSchema(zodSchema);
