import { z } from "zod";

// Generated from runner/lib/services/glue.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    spark_dpus: z.number().int().min(0).default(0).describe("Number of DPUs for each Apache Spark ETL job."),
    spark_minutes_per_month: z.number().int().min(0).default(0).describe("Minutes per month the Apache Spark ETL job runs."),
    python_shell_dpus: z.number().int().min(0).default(0).describe("Number of DPUs for each Python Shell job."),
    python_shell_minutes_per_month: z.number().int().min(0).default(0).describe("Minutes per month the Python Shell ETL job runs."),
    interactive_dpus: z.number().int().min(0).default(2).describe("Number of DPUs for each provisioned interactive session. Wizard requires >= 2 when filled."),
    interactive_minutes_per_month: z.number().int().min(0).default(1).describe("Minutes per month of provisioned interactive sessions. Wizard requires >= 1 when filled.")
  })
  .meta({ id: "glue" });

export const jsonSchema = z.toJSONSchema(zodSchema);
