#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createServer as createHttpServer } from "node:http";
import { randomUUID } from "node:crypto";

import { tools, registry } from "./tools/index.js";
import { SERVER_NAME, SERVER_VERSION } from "./tools/get-version.js";
import { catalog, catalogVersion, listCatalogServices } from "./catalog/index.js";

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

export async function startHttp({ host = "127.0.0.1", port = 7531 } = {}) {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  await server.connect(transport);

  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Accept, mcp-session-id, mcp-protocol-version",
    "Access-Control-Expose-Headers": "mcp-session-id",
  };

  const http = createHttpServer(async (req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, cors).end();
      return;
    }
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { ...cors, "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          name: SERVER_NAME,
          version: SERVER_VERSION,
          catalog_version: catalogVersion,
        }),
      );
      return;
    }
    if (req.url === "/services" && req.method === "GET") {
      const services = listCatalogServices().map((name) => {
        const e = catalog.get(name);
        return { name, ...e.meta };
      });
      res.writeHead(200, { ...cors, "Content-Type": "application/json" });
      res.end(JSON.stringify({ catalog_version: catalogVersion, services }));
      return;
    }
    if (req.url !== "/mcp") {
      res.writeHead(404, cors).end();
      return;
    }
    for (const [k, v] of Object.entries(cors)) res.setHeader(k, v);
    try {
      await transport.handleRequest(req, res);
    } catch (err) {
      if (!res.headersSent) res.writeHead(500).end(String(err));
    }
  });

  await new Promise((resolve) => http.listen(port, host, resolve));
  const addr = http.address();
  const url = `http://${addr.address}:${addr.port}/mcp`;
  console.log(JSON.stringify({ ready: true, url }));
  return { http, server, transport, url };
}

const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("/server.js");

if (isDirectRun) {
  const args = process.argv.slice(2);
  const useHttp = args.includes("--http");
  const portArg = args.find((a) => a.startsWith("--port="));
  const port = portArg ? Number(portArg.slice("--port=".length)) : 7531;

  if (useHttp) {
    await startHttp({ port });
  } else {
    await createServer().connect(new StdioServerTransport());
  }
}
