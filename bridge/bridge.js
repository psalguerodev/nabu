#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const UPSTREAM =
  process.env.NABU_MCP_URL ||
  process.argv[2] ||
  "http://127.0.0.1:7531/mcp";

let upstream = null;

async function connectUpstream() {
  const c = new Client(
    { name: "nabu-bridge", version: "0.0.1" },
    {},
  );
  await c.connect(new StreamableHTTPClientTransport(new URL(UPSTREAM)));
  return c;
}

async function getUpstream() {
  if (!upstream) upstream = await connectUpstream();
  return upstream;
}

// Detect "lost session" so we can reconnect transparently after an MCP
// sidecar restart. The server returns -32000 with message "No session:
// send initialize first" once the previous session was evicted. Match by
// substring rather than code so future error-shape changes don't slip past.
function isLostSessionError(err) {
  const msg = String(err?.message || err || "");
  return /no session|send initialize first|404|connection closed/i.test(msg);
}

async function withReconnect(fn) {
  try {
    return await fn(await getUpstream());
  } catch (err) {
    if (!isLostSessionError(err)) throw err;
    // Drop the stale client and try once more with a fresh connection.
    try {
      await upstream?.close?.();
    } catch {}
    upstream = null;
    return await fn(await getUpstream());
  }
}

const bridge = new Server(
  { name: "nabu", version: "0.0.1" },
  { capabilities: { tools: {} } },
);

bridge.setRequestHandler(ListToolsRequestSchema, () =>
  withReconnect((c) => c.listTools()),
);

bridge.setRequestHandler(CallToolRequestSchema, (req) =>
  withReconnect((c) => c.callTool(req.params)),
);

// Eager connect so initialize completes quickly when Claude Desktop boots,
// but tolerate failure: connection will be retried on first tool call.
try {
  upstream = await connectUpstream();
} catch (err) {
  console.error(`[nabu-bridge] initial upstream connect failed: ${err.message}`);
}

await bridge.connect(new StdioServerTransport());
