import { z } from "zod";

// Generated from runner/lib/services/api-gateway.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    http_requests_millions_per_month: z.number().min(0).default(0).describe("HTTP API requests, in millions per month (wizard default unit)."),
    avg_request_size_kb: z.number().min(0.1).default(34).describe("Average request payload size in KB. Wizard default 34."),
    rest_requests_millions_per_month: z.number().min(0).default(0).describe("REST API requests, in millions per month (wizard default unit)."),
    cache_gb: z.enum(["None", "0.5", "1.6", "6.1", "13.5", "28.4", "58.2", "118", "237"]).default("None").describe("REST API caching size. \"None\" disables the cache."),
    websocket_messages_thousands_per_sec: z.number().min(0).default(0).describe("WebSocket messages, in thousands per second (wizard default unit).")
  })
  .meta({ id: "api-gateway" });

export const jsonSchema = z.toJSONSchema(zodSchema);
