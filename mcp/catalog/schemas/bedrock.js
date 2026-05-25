import { z } from "zod";

// Generated from runner/lib/services/bedrock.yaml by
// runner/tools/gen-zod.mjs. Do not edit by hand — re-run the generator.
export const zodSchema = z
  .object({
    region: z.string().min(1).default("us-east-1").describe("AWS region code."),
    provider: z.enum(["Amazon", "Anthropic", "DeepSeek", "Meta", "Mistral", "OpenAI", "Qwen", "TwelveLabs", "Writer"]).default("Anthropic").describe("Foundation-model provider. The wizard renders one usage block per"),
    inference_route: z.string().min(1).optional().describe("Exact wizard label of the inference route to select (case-insensitive"),
    inference_type: z.string().min(1).optional().describe("Exact wizard label of the inference type (case-insensitive anchored"),
    image_input: z.boolean().default(false).describe("Estimate with image as input. Renders as a Yes/No CloudScape select"),
    prompt_caching: z.boolean().default(false).describe("Estimate with prompt caching enabled. Same Yes/No CloudScape select"),
    requests_per_minute: z.number().min(0).default(0).describe("Average requests per minute."),
    hours_per_day: z.number().min(0).max(24).default(24).describe("Hours per day at the above request rate."),
    input_tokens_per_request: z.number().int().min(0).default(1000).describe("Average input tokens per request."),
    output_tokens_per_request: z.number().int().min(0).default(500).describe("Average output tokens per request.")
  })
  .meta({ id: "bedrock" });

export const jsonSchema = z.toJSONSchema(zodSchema);
