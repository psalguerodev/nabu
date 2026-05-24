import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const SERVER = join(dirname(fileURLToPath(import.meta.url)), "..", "server.js");

async function connect() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER],
  });
  const client = new Client({ name: "nabu-smoke", version: "0.0.0" }, {});
  await client.connect(transport);
  return { client, transport };
}

test("MCP advertises list_supported_services tool", async () => {
  const { client, transport } = await connect();
  try {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    assert.ok(names.includes("list_supported_services"), `missing list_supported_services in ${names.join(",")}`);
  } finally {
    await transport.close();
  }
});

test("list_supported_services returns the services defined in the catalog", async () => {
  const { client, transport } = await connect();
  try {
    const res = await client.callTool({ name: "list_supported_services", arguments: {} });
    const payload = JSON.parse(res.content[0].text);
    assert.deepEqual(payload.services, [
      "api-gateway",
      "appsync",
      "athena",
      "bedrock",
      "bedrock-agentcore",
      "cloudfront",
      "cloudtrail",
      "cloudwatch",
      "cognito",
      "dynamodb",
      "ebs",
      "ec2",
      "ecr",
      "eventbridge",
      "glue",
      "lambda",
      "redshift",
      "s3",
      "s3-vectors",
      "sagemaker-async",
      "sagemaker-batch-transform",
      "sagemaker-on-demand-notebooks",
      "sagemaker-real-time-inference",
      "sagemaker-serverless-inference",
      "sagemaker-studio-notebooks",
      "sagemaker-training",
      "secrets-manager",
      "ses",
      "step-functions",
      "systems-manager",
      "textract",
      "vpn",
      "waf",
      "xray",
    ]);
    assert.equal(payload.count, 34);
    assert.equal(payload.catalog_version, "0.1.0");
  } finally {
    await transport.close();
  }
});

test("unknown tool call rejects", async () => {
  const { client, transport } = await connect();
  try {
    await assert.rejects(
      client.callTool({ name: "does_not_exist", arguments: {} }),
      /Unknown tool/,
    );
  } finally {
    await transport.close();
  }
});
