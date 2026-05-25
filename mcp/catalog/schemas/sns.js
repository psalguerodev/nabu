import { z } from "zod";

// Generated from runner/lib/services/sns.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    enable_standard: z.boolean().default(true).describe("Standard topics section (default-on in the wizard). Disable only when modelling FIFO-only workloads."),
    enable_fifo: z.boolean().default(false).describe("FIFO Topics section (opt-in). Exposes per-subscription, ordered-delivery fields."),
    requests_millions: z.number().min(0).default(0).describe("Standard topic requests per month (in millions by default)."),
    requests_unit: z.enum(["per_month", "million_per_month"]).default("million_per_month").describe("Unit for requests_millions."),
    http_notifications_millions: z.number().min(0).default(0).describe("Standard HTTP/HTTPS notifications per month (millions by default)."),
    http_notifications_unit: z.enum(["per_month", "million_per_month"]).default("million_per_month").describe("Unit for http_notifications_millions."),
    email_notifications_millions: z.number().min(0).default(0).describe("Standard EMAIL / EMAIL-JSON notifications per month (millions by default)."),
    email_notifications_unit: z.enum(["per_month", "million_per_month"]).default("million_per_month").describe("Unit for email_notifications_millions."),
    sqs_notifications_millions: z.number().min(0).default(0).describe("Standard SQS notifications per month (millions by default)."),
    sqs_notifications_unit: z.enum(["per_month", "million_per_month"]).default("million_per_month").describe("Unit for sqs_notifications_millions."),
    lambda_notifications_millions: z.number().min(0).default(0).describe("Standard Lambda notifications per month (millions by default)."),
    lambda_notifications_unit: z.enum(["per_month", "million_per_month"]).default("million_per_month").describe("Unit for lambda_notifications_millions."),
    firehose_notifications_millions: z.number().min(0).default(0).describe("Standard Kinesis Data Firehose notifications per month (millions by default)."),
    firehose_notifications_unit: z.enum(["per_month", "million_per_month"]).default("million_per_month").describe("Unit for firehose_notifications_millions."),
    mobile_push_notifications_millions: z.number().min(0).default(0).describe("Standard Mobile Push notifications per month (millions by default)."),
    mobile_push_notifications_unit: z.enum(["per_month", "million_per_month"]).default("million_per_month").describe("Unit for mobile_push_notifications_millions."),
    fifo_requests_millions: z.number().min(0).default(0).describe("FIFO topic requests per month (millions by default). nth=1 of \"Requests Value\"."),
    fifo_avg_message_size: z.number().min(0).default(1).describe("FIFO topics — average message size (KB by default)."),
    fifo_message_size_unit: z.enum(["byte", "kb"]).default("kb").describe("Unit for fifo_avg_message_size."),
    fifo_subscriptions: z.number().int().min(0).default(0).describe("FIFO topics — number of subscriptions per month.")
  })
  .meta({ id: "sns" });

export const jsonSchema = z.toJSONSchema(zodSchema);
