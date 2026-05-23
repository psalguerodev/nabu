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

test("MCP advertises list_services tool", async () => {
  const { client, transport } = await connect();
  try {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    assert.ok(names.includes("list_services"), `missing list_services in ${names.join(",")}`);
  } finally {
    await transport.close();
  }
});

test("list_services returns the handlers from playwright/lib/services", async () => {
  const { client, transport } = await connect();
  try {
    const res = await client.callTool({ name: "list_services", arguments: {} });
    const payload = JSON.parse(res.content[0].text);
    assert.ok(payload.count > 0, "expected at least one service");
    assert.equal(payload.count, payload.services.length);
    assert.ok(payload.services.includes("ec2"));
    assert.ok(payload.services.includes("lambda"));
    const sorted = [...payload.services].sort();
    assert.deepEqual(payload.services, sorted, "services must be sorted");
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
