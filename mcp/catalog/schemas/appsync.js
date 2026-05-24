import { z } from "zod";

// Generated from runner/lib/services/appsync.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    enable_real_time: z.boolean().default(false).describe("Enables the AppSync GraphQL Real-Time feature checkbox and exposes its 4 sub-fields."),
    enable_data_transfer: z.boolean().default(false).describe("Enables the AppSync Data Transfer feature checkbox."),
    api_requests_per_month: z.number().int().min(0).default(0).describe("Number of GraphQL API requests per month."),
    subscribed_clients: z.number().int().min(0).default(100).describe("Number of subscribed clients (rendered as a textbox, not a spinbutton)."),
    real_time_avg_duration_minutes: z.number().min(0).default(0).describe("Average active duration per subscribed client (minutes)."),
    inbound_messages_per_month: z.number().int().min(0).default(0).describe("Number of inbound messages per month."),
    outbound_messages_per_month: z.number().int().min(0).default(0).describe("Number of outbound messages per month.")
  })
  .meta({ id: "appsync" });

export const jsonSchema = z.toJSONSchema(zodSchema);
