#!/usr/bin/env node
import { createEstimate } from "./lib/calculator.js";
import "./lib/services/bedrock-agentcore.js";

const result = await createEstimate(
  [
    {
      service: "bedrock-agentcore",
      description: "TEST runtime only",
      sessionsPerMonth: 144000,
      avgSessionDurationSec: 15,
      ioWaitPercent: 20,
      avgVcpu: 2,
      avgSessionMemoryGB: 5,
    },
  ],
  { name: "TEST AC runtime only", headless: false }
);
console.log(JSON.stringify(result, null, 2));
