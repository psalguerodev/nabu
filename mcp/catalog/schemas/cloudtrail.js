import { z } from "zod";

// Generated from runner/lib/services/cloudtrail.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    mgmt_events_units: z.enum(["millions", "exact_number"]).default("exact_number").describe("Units selector for \"Number of management events\". Wizard default Millions; we always switch."),
    mgmt_events: z.number().int().min(0).default(5000).describe("Number of management events per month."),
    mgmt_trails: z.number().int().min(0).default(3).describe("Number of trails delivering management events."),
    read_mgmt_events: z.number().int().min(0).default(1).describe("Number of read management events per month."),
    read_mgmt_trails: z.number().int().min(0).default(1).describe("Number of trails delivering read management events."),
    data_events_units: z.enum(["millions", "exact_number"]).default("exact_number").describe("Units selector for data-event counts (S3 + Lambda). Applied only when any data-event count > 0."),
    s3_operations: z.number().int().min(0).default(20000).describe("Number of S3 data-event operations per month."),
    s3_trails: z.number().int().min(0).default(3).describe("Number of trails delivering S3 data events."),
    lambda_events: z.number().int().min(0).default(10).describe("Number of Lambda data events per month."),
    lambda_trails: z.number().int().min(0).default(1).describe("Number of trails delivering Lambda data events."),
    network_events_units: z.enum(["millions", "exact_number"]).default("exact_number").describe("Units selector for network-activity-event counts. Applied only when network_events > 0."),
    network_events: z.number().int().min(0).default(5000).describe("Number of network activity events per month."),
    network_trails: z.number().int().min(0).default(1).describe("Number of trails delivering network activity events.")
  })
  .meta({ id: "cloudtrail" });

export const jsonSchema = z.toJSONSchema(zodSchema);
