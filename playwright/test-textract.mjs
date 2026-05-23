#!/usr/bin/env node
import { createEstimate } from "./lib/calculator.js";
import "./lib/services/textract.js";

const result = await createEstimate(
  [
    {
      service: "textract",
      description: "[TEST] OCR de precios de etiquetas en góndolas",
      numberOfPages: 144000,
      percentWithText: 100,
    },
  ],
  { name: "TEST Textract handler", headless: false }
);
console.log("\n=== RESULT ===");
console.log(JSON.stringify(result, null, 2));
