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

const upstream = new Client(
  { name: "nabu-bridge", version: "0.0.1" },
  {},
);
await upstream.connect(new StreamableHTTPClientTransport(new URL(UPSTREAM)));

const bridge = new Server(
  { name: "nabu", version: "0.0.1" },
  { capabilities: { tools: {} } },
);

bridge.setRequestHandler(ListToolsRequestSchema, () => upstream.listTools());

bridge.setRequestHandler(CallToolRequestSchema, (req) =>
  upstream.callTool(req.params),
);

await bridge.connect(new StdioServerTransport());
