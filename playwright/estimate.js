#!/usr/bin/env node
import { createEstimate } from "./lib/calculator.js";

// Register all service handlers
import "./lib/services/ec2.js";
import "./lib/services/s3.js";
import "./lib/services/lambda.js";
import "./lib/services/step-functions.js";
import "./lib/services/dynamodb.js";
import "./lib/services/api-gateway.js";
import "./lib/services/cloudfront.js";
import "./lib/services/vpn.js";
import "./lib/services/cognito.js";
import "./lib/services/waf.js";
import "./lib/services/athena.js";
import "./lib/services/eventbridge.js";
import "./lib/services/cloudwatch.js";
import "./lib/services/xray.js";
import "./lib/services/systems-manager.js";
import "./lib/services/bedrock.js";
import "./lib/services/bedrock-agentcore.js";
import "./lib/services/secrets-manager.js";
import "./lib/services/ecr.js";
import "./lib/services/appsync.js";
import "./lib/services/glue.js";
import "./lib/services/redshift.js";
import "./lib/services/sagemaker-async.js";
import "./lib/services/textract.js";
import "./lib/services/cloudtrail.js";
import "./lib/services/s3-vectors.js";

// Parse CLI arguments
const args = process.argv.slice(2);
let services = null;
let headless = true;
let inputFile = null;
let estimateName = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--services" && args[i + 1]) {
    services = JSON.parse(args[++i]);
  } else if (args[i] === "--file" && args[i + 1]) {
    inputFile = args[++i];
  } else if (args[i] === "--name" && args[i + 1]) {
    estimateName = args[++i];
  } else if (args[i] === "--visible") {
    headless = false;
  } else if (args[i] === "--help" || args[i] === "-h") {
    printHelp();
    process.exit(0);
  }
}

// Load from file if specified
if (inputFile && !services) {
  const { readFileSync } = await import("fs");
  const data = JSON.parse(readFileSync(inputFile, "utf8"));
  services = data.services || data;
  // Use name from JSON if not provided via CLI
  if (!estimateName && data.name) estimateName = data.name;
}

if (!services || services.length === 0) {
  printHelp();
  process.exit(1);
}

function printHelp() {
  console.log(`
AWS Calculator Estimate Generator (Playwright)

Usage:
  node estimate.js --file <path.json>              Load services from JSON file
  node estimate.js --services '<json array>'       Inline services JSON
  node estimate.js --file <path.json> --visible    Show browser window

Options:
  --file <path>       JSON file with services array
  --services <json>   Inline JSON array of services
  --visible           Show browser (default: headless)
  --help              Show this help

Services format:
  [
    { "service": "ec2", "instances": 2, "instanceType": "t3.medium", "pricing": "On-Demand" },
    { "service": "s3", "storageGB": 100 },
    { "service": "lambda", "requests": 1000000, "durationMs": 200, "memoryMB": 256 },
    { "service": "step-functions", "workflowRequests": 10000, "transitionsPerWorkflow": 5 },
    { "service": "dynamodb", "capacityMode": "on-demand", "storageGB": 10 },
    { "service": "api-gateway", "httpRequests": 1 },
    { "service": "cloudfront", "pricingModel": "payg", "dataOutGB": 100, "httpsRequests": 1000000 }
  ]
  `);
}

console.log(`\n⏳ Creating estimate with ${services.length} services...`);
console.log(`   Services: ${services.map(s => s.service).join(", ")}`);
console.log(`   Mode: ${headless ? "headless" : "visible browser"}\n`);

try {
  const result = await createEstimate(services, { headless, name: estimateName });
  console.log(`✅ Estimate created in ${result.elapsed}s`);
  console.log(`\n🔗 ${result.url}`);
  console.log(`\n💰 Monthly: $${result.monthly.toFixed(2)}`);
  console.log(`   Upfront: $${result.upfront.toFixed(2)}`);
  console.log(`   12 months: $${result.annual.toFixed(2)}\n`);
} catch (err) {
  console.error(`\n❌ Error: ${err.message}`);
  console.error(`   Screenshot saved to /tmp/aws-calc-error.png`);
  process.exit(1);
}
