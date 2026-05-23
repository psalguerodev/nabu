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
  const client = new Client({ name: "schema-test", version: "0.0.0" }, {});
  await client.connect(transport);
  return { client, transport };
}

test("get_service_schema returns a JSON Schema for ec2", async () => {
  const { client, transport } = await connect();
  try {
    const res = await client.callTool({
      name: "get_service_schema",
      arguments: { service: "ec2" },
    });
    const payload = JSON.parse(res.content[0].text);
    assert.equal(payload.service, "ec2");
    assert.equal(payload.schema.type, "object");
    assert.ok(payload.schema.properties.instance_type, "has instance_type prop");
    assert.ok(payload.schema.required.includes("count"));
  } finally {
    await transport.close();
  }
});

test("get_service_schema rejects unknown service", async () => {
  const { client, transport } = await connect();
  try {
    await assert.rejects(
      client.callTool({
        name: "get_service_schema",
        arguments: { service: "nonexistent" },
      }),
      /Unknown service|not in catalog/i,
    );
  } finally {
    await transport.close();
  }
});
