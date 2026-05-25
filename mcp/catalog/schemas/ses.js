import { z } from "zod";

// Generated from runner/lib/services/ses.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    emails_sent_from_client: z.number().int().min(0).default(0).describe("Outbound email messages sent via SMTP/API from your application."),
    emails_sent_from_client_unit: z.enum(["per_day", "per_week", "per_month"]).default("per_month").describe("Unit for emails_sent_from_client. Wizard default is per month."),
    attachment_gb_from_client: z.number().min(0).default(0).describe("Total attachment data sent from email client, in GB."),
    attachment_gb_from_client_unit: z.enum(["gb_per_day", "gb_per_week", "gb_per_month"]).default("gb_per_month").describe("Unit for attachment_gb_from_client. Wizard default GB per month."),
    emails_received: z.number().int().min(0).default(0).describe("Inbound email messages received through SES."),
    emails_received_unit: z.enum(["per_day", "per_week", "per_month"]).default("per_month").describe("Unit for emails_received."),
    emails_via_dedicated_ips_managed: z.number().int().min(0).default(0).describe("Outbound emails sent through SES Dedicated IPs (managed pool)."),
    emails_via_dedicated_ips_managed_unit: z.enum(["per_day", "per_week", "per_month"]).default("per_month").describe("Unit for emails_via_dedicated_ips_managed."),
    dedicated_ips_standard_count: z.number().int().min(0).default(0).describe("Number of standard dedicated IP addresses ($24.95/IP/month)."),
    open_ingress_endpoints: z.number().int().min(0).default(0).describe("Number of Open Ingress endpoints (per month). Wizard only exposes \"per month\" unit."),
    mail_manager_emails: z.number().int().min(0).default(0).describe("Number of emails processed by Mail Manager. Wizard default unit is per day; we always set the unit explicitly."),
    mail_manager_emails_unit: z.enum(["per_day", "per_week", "per_month"]).default("per_month").describe("Unit for mail_manager_emails (wizard default is per day — we override to per_month for caller ergonomics)."),
    mail_manager_avg_size_kb: z.number().min(0).default(0).describe("Average size of emails processed by Mail Manager (KB by default; flip the unit to MB explicitly via mail_manager_avg_size_unit if you pass MB-scale values)."),
    mail_manager_avg_size_unit: z.enum(["kb", "mb"]).default("kb").describe("Unit for mail_manager_avg_size_kb."),
    vdm_enabled: z.boolean().default(false).describe("Toggle the Virtual Deliverability Manager (VDM). Renders as a"),
    archive_inserted_indexed_gb: z.number().min(0).default(0).describe("GB of email content inserted and indexed in the Archive per month."),
    archive_already_stored_gb: z.number().min(0).default(0).describe("GB of email content already stored in the Archive (carryover).")
  })
  .meta({ id: "ses" });

export const jsonSchema = z.toJSONSchema(zodSchema);
