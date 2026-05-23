import { z } from "zod";

export const zodSchema = z
  .object({
    region: z.string().min(1).describe("AWS region code"),
    api_requests_per_month: z.number().int().min(0).default(0),
    enable_real_time: z.boolean().default(false),
    subscribed_clients: z.number().int().min(0).default(100),
    real_time_avg_duration_minutes: z.number().min(0).default(0),
    inbound_messages_per_month: z.number().int().min(0).default(0),
    outbound_messages_per_month: z.number().int().min(0).default(0),
    enable_data_transfer: z.boolean().default(false),
  })
  .meta({ id: "appsync" });

export const jsonSchema = z.toJSONSchema(zodSchema);
