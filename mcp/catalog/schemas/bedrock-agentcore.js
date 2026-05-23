import { z } from "zod";

export const zodSchema = z
  .object({
    region: z.string().min(1).describe("AWS region code"),
    enable_gateway: z.boolean().default(false),
    enable_identity: z.boolean().default(false),
    enable_browser_tools: z.boolean().default(false),
    enable_code_interpreter: z.boolean().default(false),
    enable_memory: z.boolean().default(false),
    enable_observability: z.boolean().default(false),
    sessions_per_month: z.number().int().min(0).default(0),
    avg_session_duration_sec: z.number().min(0).default(60),
    io_wait_percent: z.number().min(0).max(100).default(0),
    avg_vcpu: z.number().min(0).default(1),
    avg_session_memory_gb: z.number().min(0).default(1),
    gateway_sessions: z.number().int().min(0).default(0),
    gateway_tools: z.number().int().min(0).default(0),
    gateway_search_requests: z.number().int().min(0).default(0),
    gateway_tool_invocations: z.number().int().min(0).default(0),
    observability_logs_gb: z.number().min(0).default(0),
    observability_spans_gb: z.number().min(0).default(0),
    browser_sessions_per_month: z.number().min(0).default(0),
    browser_session_duration_sec: z.number().min(0).default(60),
    browser_session_vcpu: z.number().min(0).default(1),
    browser_session_memory_gb: z.number().min(0).default(1),
  })
  .meta({ id: "bedrock-agentcore" });

export const jsonSchema = z.toJSONSchema(zodSchema);
