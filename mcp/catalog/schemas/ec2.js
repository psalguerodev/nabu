import { z } from "zod";

export const zodSchema = z
  .object({
    instance_type: z
      .string()
      .min(1)
      .describe("AWS instance type, e.g. t3.medium"),
    count: z.number().int().min(1).describe("Number of instances"),
    hours_per_month: z
      .number()
      .min(0)
      .max(744)
      .describe("Hours per month per instance (max 744)"),
    region: z.string().min(1).describe("AWS region code, e.g. us-east-1"),
    os: z.enum(["linux", "windows"]).default("linux"),
  })
  .meta({ id: "ec2" });

export const jsonSchema = z.toJSONSchema(zodSchema);
