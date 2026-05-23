import { z } from "zod";

export const zodSchema = z
  .object({
    region: z.string().min(1).describe("AWS region code"),
    number_of_pages: z.number().int().min(0).default(0),
    percent_with_text: z.number().min(0).max(100).default(100),
    percent_with_queries: z.number().min(0).max(100).default(0),
    percent_with_tables: z.number().min(0).max(100).default(0),
    percent_with_forms: z.number().min(0).max(100).default(0),
    percent_with_forms_tables: z.number().min(0).max(100).default(0),
    percent_with_layout: z.number().min(0).max(100).default(0),
    percent_with_expense: z.number().min(0).max(100).default(0),
    percent_with_id: z.number().min(0).max(100).default(0),
    percent_with_lending: z.number().min(0).max(100).default(0),
    percent_with_signatures: z.number().min(0).max(100).default(0),
  })
  .meta({ id: "textract" });

export const jsonSchema = z.toJSONSchema(zodSchema);
