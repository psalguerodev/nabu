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
import {
  getCatalogEntry,
  getCatalogVersion,
  listCatalogServices,
  reload as reloadCatalog,
} from "./catalog/index.js";
import { getJobDetail, listJobs, deleteJob, deleteJobs } from "./jobs/store.js";

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

function isInitializeRequest(body) {
  if (!body) return false;
  if (Array.isArray(body)) return body.some(isInitializeRequest);
  return body.method === "initialize";
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString();
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function startHttp({ host = "127.0.0.1", port = 7531 } = {}) {
  const transports = new Map();

  async function newSessionTransport() {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => transports.set(sid, transport),
    });
    transport.onclose = () => {
      if (transport.sessionId) transports.delete(transport.sessionId);
    };
    await server.connect(transport);
    return transport;
  }

  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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
          catalog_version: getCatalogVersion(),
        }),
      );
      return;
    }
    if (req.url === "/services" && req.method === "GET") {
      const services = listCatalogServices().map((name) => {
        const e = getCatalogEntry(name);
        return { name, ...e.meta };
      });
      res.writeHead(200, { ...cors, "Content-Type": "application/json" });
      res.end(JSON.stringify({ catalog_version: getCatalogVersion(), services }));
      return;
    }
    const svcMatch = req.url?.match(/^\/services\/([a-z0-9-]+)$/);
    if (svcMatch && req.method === "GET") {
      const entry = getCatalogEntry(svcMatch[1]);
      if (!entry) {
        res.writeHead(404, { ...cors, "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "not_found" }));
        return;
      }
      res.writeHead(200, { ...cors, "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          name: entry.name,
          meta: entry.meta,
          schema: entry.jsonSchema,
        }),
      );
      return;
    }
    if (req.url === "/reload" && req.method === "POST") {
      try {
        const info = await reloadCatalog();
        res.writeHead(200, { ...cors, "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, ...info }));
      } catch (err) {
        res.writeHead(500, { ...cors, "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: String(err) }));
      }
      return;
    }
    if (req.url === "/jobs" && req.method === "GET") {
      const jobs = listJobs(50);
      res.writeHead(200, { ...cors, "Content-Type": "application/json" });
      res.end(JSON.stringify({ count: jobs.length, jobs }));
      return;
    }
    const jobMatch = req.url?.match(/^\/jobs\/([0-9a-fA-F-]+)$/);
    if (jobMatch && req.method === "GET") {
      const detail = getJobDetail(jobMatch[1]);
      if (!detail) {
        res.writeHead(404, { ...cors, "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "not_found" }));
        return;
      }
      res.writeHead(200, { ...cors, "Content-Type": "application/json" });
      res.end(JSON.stringify(detail));
      return;
    }
    if (jobMatch && req.method === "DELETE") {
      const removed = deleteJob(jobMatch[1]);
      res.writeHead(removed ? 200 : 404, {
        ...cors,
        "Content-Type": "application/json",
      });
      res.end(JSON.stringify({ removed }));
      return;
    }
    if (req.url === "/jobs" && req.method === "DELETE") {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const raw = Buffer.concat(chunks).toString();
      let body = {};
      if (raw) {
        try {
          body = JSON.parse(raw);
        } catch {
          res.writeHead(400, { ...cors, "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid_json" }));
          return;
        }
      }
      const ids = Array.isArray(body.ids) ? body.ids : null;
      const all = body.all === true;
      let removed;
      if (all) {
        const everything = listJobs(10000).map((j) => j.id);
        removed = deleteJobs(everything);
      } else if (ids && ids.length) {
        removed = deleteJobs(ids);
      } else {
        res.writeHead(400, { ...cors, "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ error: "must provide ids[] or all:true" }),
        );
        return;
      }
      res.writeHead(200, { ...cors, "Content-Type": "application/json" });
      res.end(JSON.stringify({ removed }));
      return;
    }
    if (req.url !== "/mcp") {
      res.writeHead(404, cors).end();
      return;
    }
    for (const [k, v] of Object.entries(cors)) res.setHeader(k, v);

    let body = null;
    try {
      body = await readJsonBody(req);
    } catch {
      res.writeHead(400).end("invalid json");
      return;
    }

    const sessionId = req.headers["mcp-session-id"];
    let transport = sessionId ? transports.get(sessionId) : null;

    if (!transport) {
      if (!isInitializeRequest(body)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32000, message: "No session: send initialize first" },
            id: body?.id ?? null,
          }),
        );
        return;
      }
      transport = await newSessionTransport();
    }

    try {
      await transport.handleRequest(req, res, body);
    } catch (err) {
      if (!res.headersSent) res.writeHead(500).end(String(err));
    }
  });

  await new Promise((resolve) => http.listen(port, host, resolve));
  const addr = http.address();
  const url = `http://${addr.address}:${addr.port}/mcp`;
  console.log(JSON.stringify({ ready: true, url }));
  return { http, url };
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
