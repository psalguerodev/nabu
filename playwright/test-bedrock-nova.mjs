#!/usr/bin/env node
import { createEstimate } from "./lib/calculator.js";
import "./lib/services/bedrock.js";

// 144K fotos/mes, 1 call/foto, 800 in / 350 out tokens
// 144000 / 30 / 24 / 60 ≈ 3.33 req/min, but Bedrock requires integer
// Use 1 req/min × hours that yield ~144000/month
// 144000 / 30 = 4800/day. At 1 rpm: need 4800/60 = 80 hours/day (impossible)
// At 4 rpm × 20 h × 30 d = 144000 ✓
const result = await createEstimate(
  [
    {
      service: "bedrock",
      description: "[TEST] Nova Pro razonamiento agentic 1 call/foto",
      provider: "Amazon",
      model: "Nova Pro",
      requestsPerMinute: 4,
      hoursPerDay: 20,
      inputTokensPerRequest: 800,
      outputTokensPerRequest: 350,
    },
  ],
  { name: "TEST Bedrock Nova Pro", headless: false }
);
console.log("\n=== RESULT ===");
console.log(JSON.stringify(result, null, 2));
