#!/usr/bin/env node
import { createEstimate } from "./lib/calculator.js";
import "./lib/services/cloudtrail.js";

const result = await createEstimate(
  [
    {
      service: "cloudtrail",
      description: "[TEST] CloudTrail observability",
      mgmtEvents: 5000,
      mgmtTrails: 3,
      s3Operations: 20000,
      s3Trails: 3,
      lambdaEvents: 10,
      lambdaTrails: 1,
      networkEvents: 5000,
      networkTrails: 1,
    },
  ],
  { name: "TEST CloudTrail handler", headless: false }
);
console.log("\n=== RESULT ===");
console.log(JSON.stringify(result, null, 2));
