#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createServer as createHttpServer } from "node:http";
import { randomUUID, createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, rm, rename, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname as pathDirname } from "node:path";
import { verify } from "./sign/index.js";
import { NABU_PUBKEY_HEX } from "./sign/pubkey.js";

const execFileAsync = promisify(execFile);

import { tools, registry } from "./tools/index.js";
import { SERVER_NAME, SERVER_VERSION } from "./tools/get-version.js";
import {
  getCatalogEntry,
  getCatalogVersion,
  listCatalogServices,
  reload as reloadCatalog,
} from "./catalog/index.js";
import { createJob, getJobDetail, listJobs, deleteJob, deleteJobs } from "./jobs/store.js";
import { run as runJob } from "./jobs/executor.js";

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

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString();
  return raw ? JSON.parse(raw) : {};
}

function sha256File(path) {
  return readFile(path).then((buf) =>
    createHash("sha256").update(buf).digest("hex"),
  );
}

async function fetchToFile(url, dest, { retries = 4 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        await writeFile(dest, buf);
        return;
      }
      // Retry transient GitHub CDN failures (5xx, 429); fail fast on
      // anything else.
      if (res.status >= 500 || res.status === 429) {
        lastErr = new Error(`GET ${url} -> HTTP ${res.status}`);
      } else {
        throw new Error(`GET ${url} -> HTTP ${res.status}`);
      }
    } catch (err) {
      lastErr = err;
    }
    if (i < retries) {
      const delay = Math.min(8000, 500 * 2 ** i);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

async function installRelease({ base_url, tarball_url }) {
  const targetDir = process.env.NABU_REMOTE_CATALOG_DIR;
  if (!targetDir) {
    throw new Error(
      "NABU_REMOTE_CATALOG_DIR is not set; cannot install a remote release",
    );
  }
  if (!base_url && !tarball_url) {
    throw new Error("provide base_url or tarball_url");
  }
  const base = base_url
    ? base_url.endsWith("/") ? base_url : `${base_url}/`
    : null;

  // Stage into a temp dir so a failed install never corrupts the active overlay.
  const stage = await mkdtemp(join(tmpdir(), "nabu-install-"));
  try {
    // 1. fetch index + signature
    const indexUrl = base ? `${base}latest.json` : tarball_url.replace(/[^/]+$/, "latest.json");
    const sigUrl = base ? `${base}latest.json.sig` : `${indexUrl}.sig`;
    const tarUrl = tarball_url ?? `${base}nabu-catalog.tar.gz`;

    const indexPath = join(stage, "latest.json");
    const sigPath = join(stage, "latest.json.sig");
    const tarPath = join(stage, "nabu-catalog.tar.gz");
    await fetchToFile(indexUrl, indexPath);
    await fetchToFile(sigUrl, sigPath);
    await fetchToFile(tarUrl, tarPath);

    // 2. verify signature
    const indexRaw = (await readFile(indexPath)).toString("utf8");
    const sig = (await readFile(sigPath)).toString("utf8").trim();
    const ok = await verify(indexRaw, sig, NABU_PUBKEY_HEX);
    if (!ok) throw new Error("ed25519 signature on latest.json did not verify");
    const index = JSON.parse(indexRaw);

    // 3. extract tarball into stage/extract/
    const extract = join(stage, "extract");
    await mkdir(extract, { recursive: true });
    await execFileAsync("tar", ["-xzf", tarPath, "-C", extract]);

    // 4. verify per-file sha256 against the signed index
    const verified = [];
    for (const [name, meta] of Object.entries(index.services ?? {})) {
      const schemaPath = join(extract, meta.schema_ref);
      const handlerPath = join(extract, meta.handler_ref);
      const schemaHash = await sha256File(schemaPath);
      const handlerHash = await sha256File(handlerPath);
      if (meta.schema_sha256 && meta.schema_sha256 !== schemaHash) {
        throw new Error(`schema sha256 mismatch for ${name}`);
      }
      if (meta.handler_sha256 && meta.handler_sha256 !== handlerHash) {
        throw new Error(`handler sha256 mismatch for ${name}`);
      }
      verified.push(name);
    }

    // 5. atomic-ish swap into the active overlay dir.
    // rename is atomic on same filesystem; we replace the directory wholesale.
    await mkdir(pathDirname(targetDir), { recursive: true });
    const backup = `${targetDir}.previous`;
    await rm(backup, { recursive: true, force: true });
    try {
      await rename(targetDir, backup);
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
    await rename(extract, targetDir);
    await rm(backup, { recursive: true, force: true });

    return {
      catalog_version: index.catalog_version,
      installed_services: verified.length,
      services: verified,
    };
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
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
    if (req.url === "/install" && req.method === "POST") {
      try {
        const body = await readJson(req);
        const result = await installRelease(body);
        await reloadCatalog();
        res.writeHead(200, { ...cors, "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, ...result }));
      } catch (err) {
        res.writeHead(500, { ...cors, "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: String(err.message ?? err) }));
      }
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
    const retryMatch = req.url?.match(/^\/jobs\/([0-9a-fA-F-]+)\/retry$/);
    if (retryMatch && req.method === "POST") {
      const original = getJobDetail(retryMatch[1]);
      if (!original) {
        res.writeHead(404, { ...cors, "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "not_found" }));
        return;
      }
      const newId = randomUUID();
      createJob({
        id: newId,
        service: original.service,
        name: original.name ? `${original.name} (retry)` : null,
        params: original.params,
        options: original.options,
      });
      setImmediate(() => runJob(newId));
      res.writeHead(200, { ...cors, "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, job_id: newId }));
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
