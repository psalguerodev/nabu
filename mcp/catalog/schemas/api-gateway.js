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
    region: z.string().min(1),
  })
  .meta({ id: "api-gateway" });

export const jsonSchema = z.toJSONSchema(zodSchema);
