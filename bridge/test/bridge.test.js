import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const MCP_SERVER = join(REPO, "mcp", "server.js");
const BRIDGE = join(REPO, "bridge", "bridge.js");

async function startHttpUpstream() {
  const child = spawn(process.execPath, [MCP_SERVER, "--http", "--port=0"], {
    stdio: ["ignore", "pipe", "inherit"],
  });
  const url = await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("upstream timeout")), 5000);
    let buf = "";
    child.stdout.on("data", (chunk) => {
      buf += chunk.toString();
      const line = buf.split("\n").find((l) => l.includes('"ready":true'));
      if (line) {
        clearTimeout(t);
        resolve(JSON.parse(line).url);
      }
    });
    child.once("exit", (c) => reject(new Error(`upstream exited ${c}`)));
  });
  return { child, url };
}

test("bridge proxies list_supported_services from stdio to HTTP", async () => {
  const { child: upstream, url } = await startHttpUpstream();
  let bridgeTransport;
  let bridgeClient;
  try {
    bridgeTransport = new StdioClientTransport({
      command: process.execPath,
      args: [BRIDGE, url],
    });
    bridgeClient = new Client(
      { name: "bridge-test", version: "0.0.0" },
      {},
    );
    await bridgeClient.connect(bridgeTransport);

    const { tools } = await bridgeClient.listTools();
    const names = tools.map((t) => t.name);
    assert.ok(names.includes("list_supported_services"));

    const res = await bridgeClient.callTool({
      name: "list_supported_services",
      arguments: {},
    });
    const payload = JSON.parse(res.content[0].text);
    assert.ok(payload.services.includes("ec2"));
  } finally {
    if (bridgeTransport) await bridgeTransport.close();
    upstream.kill("SIGTERM");
    await new Promise((resolve) => upstream.once("exit", resolve));
  }
});
