import { z } from "zod";

export const zodSchema = z
  .object({
    region: z.string().min(1).describe("AWS region code"),
    web_acls: z.number().int().min(0).default(1),
    rules_per_acl: z.number().int().min(0).default(5),
    rule_groups: z.number().int().min(0).default(0),
    rules_per_group: z.number().int().min(0).default(0),
    managed_rule_groups: z.number().int().min(0).default(1),
    requests_per_month: z.number().min(0).default(1).describe("Requests (millions per month)"),
  })
  .meta({ id: "waf" });

export const jsonSchema = z.toJSONSchema(zodSchema);
