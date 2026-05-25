import { z } from "zod";

// Generated from runner/lib/services/sqs.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    standard_requests: z.number().min(0).default(0).describe("Standard queue request volume. Pair with `standard_requests_unit`"),
    standard_requests_unit: z.enum(["million_per_day", "million_per_week", "million_per_month"]).default("million_per_month").describe("Unit for standard_requests. Wizard default is `million per month`."),
    fifo_requests: z.number().min(0).default(0).describe("FIFO queue request volume. Pair with `fifo_requests_unit`. FIFO"),
    fifo_requests_unit: z.enum(["million_per_day", "million_per_week", "million_per_month"]).default("million_per_month").describe("Unit for fifo_requests. Wizard default million per month."),
    fair_requests: z.number().min(0).default(0).describe("Fair queue request volume. Fair queues provide multi-tenant"),
    fair_requests_unit: z.enum(["million_per_day", "million_per_week", "million_per_month"]).default("million_per_month").describe("Unit for fair_requests. Wizard default million per month.")
  })
  .meta({ id: "sqs" });

export const jsonSchema = z.toJSONSchema(zodSchema);
