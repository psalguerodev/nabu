import { z } from "zod";

// Generated from runner/lib/services/lambda.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    include_free_tier: z.enum(["include", "without"]).default("without").describe("Free-tier handling. Default \"without\" matches the v0.1 handler's"),
    architecture: z.enum(["x86_64", "arm64"]).default("x86_64").describe("Lambda architecture (on-demand section). Wizard default is x86; we only click the dropdown when arm64 is requested."),
    invocations_per_month: z.number().int().min(0).default(0).describe("On-demand Lambda invocations per month."),
    avg_duration_ms: z.number().min(1).default(100).describe("On-demand average duration of each request in milliseconds."),
    memory_mb: z.number().int().min(128).max(10240).default(128).describe("On-demand memory allocated per function in MB. Wizard unit dropdown defaults to MB."),
    ephemeral_storage_mb: z.number().int().min(512).max(10240).default(512).describe("Ephemeral storage allocated per function (MB). AWS includes 512 MB"),
    ephemeral_storage_unit: z.enum(["MB", "GB"]).default("MB").describe("Unit for ephemeral_storage_mb. Wizard default is MB."),
    pricing_model: z.enum(["on_demand", "provisioned_concurrency"]).default("on_demand").describe("Selects which billing surface to model. on_demand fills only the"),
    pc_architecture: z.enum(["x86_64", "arm64"]).default("x86_64").describe("Architecture for the Provisioned Concurrency section."),
    pc_concurrency: z.number().int().min(1).default(1).describe("Provisioned Concurrency — number of concurrent executions."),
    pc_hours_enabled: z.number().min(0).max(24).default(24).describe("Hours per day Provisioned Concurrency is enabled."),
    pc_hours_unit: z.enum(["hours", "minutes", "seconds"]).default("hours").describe("Unit for pc_hours_enabled. Wizard default is \"hours\"."),
    pc_requests: z.number().int().min(0).default(0).describe("Provisioned Concurrency — number of requests served by PC."),
    pc_requests_unit: z.enum(["per_second", "per_minute", "per_hour", "per_day", "per_month"]).default("per_month").describe("Unit for pc_requests. Wizard default is \"per month\"."),
    pc_avg_duration_ms: z.number().min(1).default(100).describe("Provisioned Concurrency — average duration of each provisioned request (ms)."),
    pc_memory_mb: z.number().int().min(128).max(10240).default(128).describe("Provisioned Concurrency — memory allocated (MB). Shares label with on-demand; driven via nth=1."),
    pc_memory_unit: z.enum(["MB", "GB"]).default("MB").describe("Unit for pc_memory_mb. Shares label with on-demand; driven via nth=1."),
    snapstart_enabled: z.boolean().default(false).describe("Enable SnapStart pricing. SnapStart applies to Java (and newer Python /"),
    snapstart_hours_enabled: z.number().min(0).max(24).default(24).describe("Hours per day SnapStart is enabled (cache retention window)."),
    snapstart_hours_unit: z.enum(["hours", "minutes", "seconds"]).default("hours").describe("Unit for snapstart_hours_enabled. Wizard default is \"hours\"."),
    snapstart_restores: z.number().int().min(0).default(0).describe("Number of SnapStart cold-start restores (per month)."),
    snapstart_memory_mb: z.number().int().min(128).max(10240).default(128).describe("Memory allocated for SnapStart functions (MB). Shares label; driven via nth=2."),
    snapstart_memory_unit: z.enum(["MB", "GB"]).default("MB").describe("Unit for snapstart_memory_mb. Shares label; driven via nth=2.")
  })
  .meta({ id: "lambda" });

export const jsonSchema = z.toJSONSchema(zodSchema);
