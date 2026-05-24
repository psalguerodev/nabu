import { z } from "zod";

// Generated from runner/lib/services/textract.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    number_of_pages: z.number().int().min(0).default(0).describe("Total number of pages processed per month."),
    percent_with_text: z.number().min(0).max(100).default(100).describe("Percentage of pages run through Detect Document Text API."),
    percent_with_queries: z.number().min(0).max(100).default(0).describe("Percentage of pages run through Analyze Document API with Queries."),
    percent_with_tables: z.number().min(0).max(100).default(0).describe("Percentage of pages run through Analyze Document API with Tables."),
    percent_with_forms: z.number().min(0).max(100).default(0).describe("Percentage of pages run through Analyze Document API with Forms."),
    percent_with_forms_tables: z.number().min(0).max(100).default(0).describe("Percentage of pages run through Analyze Document API with Forms and Tables."),
    percent_with_layout: z.number().min(0).max(100).default(0).describe("Percentage of pages run through Analyze Document API with Layouts."),
    percent_with_expense: z.number().min(0).max(100).default(0).describe("Percentage of pages run through Analyze Expense API (invoices and receipts)."),
    percent_with_id: z.number().min(0).max(100).default(0).describe("Percentage of pages run through Analyze ID API (identity documents)."),
    percent_with_lending: z.number().min(0).max(100).default(0).describe("Percentage of pages run through Analyze Lending API."),
    percent_with_signatures: z.number().min(0).max(100).default(0).describe("Percentage of pages run through Analyze Document API for Signatures.")
  })
  .meta({ id: "textract" });

export const jsonSchema = z.toJSONSchema(zodSchema);
