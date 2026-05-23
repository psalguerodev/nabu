import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const SERVER = join(dirname(fileURLToPath(import.meta.url)), "..", "server.js");

async function startHttpServer() {
  const child = spawn(process.execPath, [SERVER, "--http", "--port=0"], {
    stdio: ["ignore", "pipe", "inherit"],
  });

  const url = await new Promise((resolve, reject) => {
    let buf = "";
    const onTimeout = setTimeout(
      () => reject(new Error("server did not become ready in 5s")),
      5000,
    );
    child.stdout.on("data", (chunk) => {
      buf += chunk.toString();
      const line = buf.split("\n").find((l) => l.includes('"ready":true'));
      if (line) {
        clearTimeout(onTimeout);
        try {
          resolve(JSON.parse(line).url);
        } catch (e) {
          reject(e);
        }
      }
    });
    child.once("exit", (code) =>
      reject(new Error(`server exited prematurely (code ${code})`)),
    );
  });

  return { child, url };
}

async function connect(url) {
  const transport = new StreamableHTTPClientTransport(new URL(url));
  const client = new Client({ name: "nabu-http-smoke", version: "0.0.0" }, {});
  await client.connect(transport);
  return { client, transport };
}

test("HTTP MCP exposes /health for liveness probes", async () => {
  const { child, url } = await startHttpServer();
  try {
    const healthUrl = url.replace(/\/mcp$/, "/health");
    const res = await fetch(healthUrl);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.name, "nabu");
    assert.ok(body.version, "version present");
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => child.once("exit", resolve));
  }
});

test("HTTP MCP serves list_supported_services", async () => {
  const { child, url } = await startHttpServer();
  try {
    const { client, transport } = await connect(url);
    try {
      const { tools } = await client.listTools();
      const names = tools.map((t) => t.name);
      assert.ok(names.includes("list_supported_services"));

      const res = await client.callTool({
        name: "list_supported_services",
        arguments: {},
      });
      const payload = JSON.parse(res.content[0].text);
      assert.ok(payload.services.includes("ec2"));
    } finally {
      await transport.close();
    }
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => child.once("exit", resolve));
  }
});
