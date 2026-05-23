#!/usr/bin/env node
import { createEstimate } from "./lib/calculator.js";
import "./lib/services/sagemaker-async.js";

const services = [
  {
    service: "sagemaker-async",
    description: "[TEST] ShelfVision YOLO + Grounding DINO async inference",
    modelsDeployed: 1,
    modelsPerEndpoint: 1,
    instancesPerEndpoint: 1,
    hoursPerDay: 12,
    daysPerMonth: 30,
    instanceType: "ml.g5.2xlarge",
    storageAmountGB: 100,
    dataInGB: 0,
    dataOutGB: 0,
  },
];

const result = await createEstimate(services, {
  name: "TEST SageMaker Async Inference handler",
  headless: false,
});

console.log("\n=== RESULT ===");
console.log(JSON.stringify(result, null, 2));
