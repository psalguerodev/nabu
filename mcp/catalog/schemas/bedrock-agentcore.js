import { z } from "zod";

// Generated from runner/lib/services/bedrock-agentcore.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    enable_gateway: z.boolean().default(false).describe("Toggle the AgentCore Gateway sub-service. Exposes Gateway-specific inputs."),
    enable_identity: z.boolean().default(false).describe("Toggle the AgentCore Identity sub-service. No additional inputs filled."),
    enable_browser_tools: z.boolean().default(false).describe("Toggle the AgentCore Browser Tools sub-service. Exposes BT-specific inputs."),
    enable_code_interpreter: z.boolean().default(false).describe("Toggle the AgentCore Code Interpreter sub-service. No additional inputs filled."),
    enable_memory: z.boolean().default(false).describe("Toggle the AgentCore Memory sub-service. No additional inputs filled."),
    enable_observability: z.boolean().default(false).describe("Toggle the AgentCore Observability sub-service. Exposes log/span ingest inputs."),
    sessions_per_month: z.number().int().min(0).default(0).describe("Runtime — number of agent sessions per month."),
    avg_session_duration_sec: z.number().min(0).default(60).describe("Runtime — average session duration in seconds."),
    io_wait_percent: z.number().min(0).max(100).default(0).describe("Runtime — I/O wait percent. Skipped when 0."),
    avg_vcpu: z.number().min(0).default(1).describe("Runtime — average vCPU."),
    avg_session_memory_gb: z.number().min(0).default(1).describe("Runtime — average memory per session (GB)."),
    gateway_sessions: z.number().int().min(0).default(0).describe("Gateway — number of agent sessions per month. Shares its accessible"),
    gateway_tools: z.number().int().min(0).default(0).describe("Gateway — total number of tools defined."),
    gateway_search_requests: z.number().int().min(0).default(0).describe("Gateway — average number of Search API requests."),
    gateway_tool_invocations: z.number().int().min(0).default(0).describe("Gateway — average number of tool invocations."),
    browser_sessions_per_month: z.number().int().min(0).default(0).describe("Browser Tools — number of agent sessions per month. Shares its"),
    browser_session_duration_sec: z.number().min(0).default(60).describe("Browser Tools — average session duration (seconds). Shared label, see above."),
    browser_session_vcpu: z.number().min(0).default(1).describe("Browser Tools — vCPU per browser session."),
    browser_session_memory_gb: z.number().min(0).default(2).describe("Browser Tools — memory per browser session (GB)."),
    observability_logs_gb: z.number().min(0).default(0).describe("Observability — vended logs ingested (GB)."),
    observability_spans_gb: z.number().min(0).default(0).describe("Observability — spans ingested (GB).")
  })
  .meta({ id: "bedrock-agentcore" });

export const jsonSchema = z.toJSONSchema(zodSchema);
