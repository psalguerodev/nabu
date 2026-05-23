#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { tools, registry } from "./tools/index.js";
import { SERVER_NAME, SERVER_VERSION } from "./tools/get-version.js";

export { listServices, HANDLERS_DIR } from "./tools/list-services.js";

export function createServer() {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => t.definition),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const handler = registry.get(req.params.name);
    if (!handler) throw new Error(`Unknown tool: ${req.params.name}`);
    return handler(req.params.arguments ?? {});
  });

  return server;
}

const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("/server.js");

if (isDirectRun) {
  await createServer().connect(new StdioServerTransport());
}
