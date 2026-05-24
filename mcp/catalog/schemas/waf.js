import { z } from "zod";

// Generated from runner/lib/services/waf.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    web_acls: z.number().int().min(0).default(1).describe("Number of Web Access Control Lists (Web ACLs) utilized."),
    rules_per_acl: z.number().int().min(0).default(5).describe("Number of Rules added per Web ACL."),
    rule_groups: z.number().int().min(0).default(0).describe("Number of Rule Groups per Web ACL."),
    rules_per_group: z.number().int().min(0).default(0).describe("Number of Rules inside each Rule Group."),
    managed_rule_groups: z.number().int().min(0).default(1).describe("Number of Managed Rule Groups per Web ACL."),
    requests_per_month: z.number().min(0).default(1).describe("Monthly web request volume across all web ACLs, expressed in MILLIONS. The wizard's unit dropdown defaults to \"million per month\" which matches this value as-is.")
  })
  .meta({ id: "waf" });

export const jsonSchema = z.toJSONSchema(zodSchema);
