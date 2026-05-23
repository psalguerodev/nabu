#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const HANDLERS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "playwright",
  "lib",
  "services",
);

export function listServices(dir = HANDLERS_DIR) {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".js"))
    .map((f) => f.replace(/\.js$/, ""))
    .sort();
}

export function createServer() {
  const server = new Server(
    { name: "nabu", version: "0.0.1" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "list_services",
        description: "List AWS services Nabu can currently estimate.",
        inputSchema: { type: "object", properties: {} },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    if (req.params.name !== "list_services") {
      throw new Error(`Unknown tool: ${req.params.name}`);
    }
    const services = listServices();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ count: services.length, services }, null, 2),
        },
      ],
    };
  });

  return server;
}

const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("/server.js");

if (isDirectRun) {
  await createServer().connect(new StdioServerTransport());
}
