import { z } from "zod";

export const zodSchema = z
  .object({
    http_requests_millions_per_month: z
      .number()
      .min(0)
      .default(0)
      .describe("HTTP API requests (millions/month)"),
    rest_requests_millions_per_month: z
      .number()
      .min(0)
      .default(0)
      .describe("REST API requests (millions/month)"),
    avg_request_size_kb: z.number().min(0.1).default(34),
    websocket_messages_thousands_per_sec: z
      .number()
      .min(0)
      .default(0)
      .describe("WebSocket messages (thousands per second)"),
    cache_gb: z
      .enum(["None", "0.5", "1.6", "6.1", "13.5", "28.4", "58.2", "118", "237"])
      .default("None")
      .describe("API Gateway cache size in GB"),
    region: z.string().min(1),
  })
  .meta({ id: "api-gateway" });

export const jsonSchema = z.toJSONSchema(zodSchema);
