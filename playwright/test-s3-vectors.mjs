#!/usr/bin/env node
import { createEstimate } from "./lib/calculator.js";
import "./lib/services/s3-vectors.js";

const result = await createEstimate(
  [
    {
      service: "s3-vectors",
      description: "[TEST] Embeddings catálogo SKUs",
      numberOfIndexes: 1,
      vectorsPerIndex: 120000,
      vectorDimensions: 1024,
      filterableMetadataKB: 2,
      keySizeKB: 0.5,
      percentOverwrittenPerMonth: 0.167,
      totalQueriesPerMonth: 15000,
    },
  ],
  { name: "TEST S3 Vectors handler", headless: false }
);
console.log("\n=== RESULT ===");
console.log(JSON.stringify(result, null, 2));
