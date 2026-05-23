import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = join(HERE, "..", "server.js");
const PKG = JSON.parse(readFileSync(join(HERE, "..", "package.json"), "utf8"));

async function connect() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER],
  });
  const client = new Client({ name: "nabu-version-test", version: "0.0.0" }, {});
  await client.connect(transport);
  return { client, transport };
}

test("get_version returns the version from mcp/package.json", async () => {
  const { client, transport } = await connect();
  try {
    const res = await client.callTool({ name: "get_version", arguments: {} });
    const payload = JSON.parse(res.content[0].text);
    assert.equal(payload.version, PKG.version);
    assert.equal(payload.name, "nabu");
  } finally {
    await transport.close();
  }
});
