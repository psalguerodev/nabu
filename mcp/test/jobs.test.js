import { test } from "node:test";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const SERVER = join(dirname(fileURLToPath(import.meta.url)), "..", "server.js");

async function connect() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER],
    env: { ...process.env, NABU_STUB_DURATION_MS: "80" },
  });
  const client = new Client({ name: "jobs-test", version: "0.0.0" }, {});
  await client.connect(transport);
  return { client, transport };
}

async function callJson(client, name, args) {
  const res = await client.callTool({ name, arguments: args });
  return JSON.parse(res.content[0].text);
}

async function waitForStatus(client, jobId, target, timeoutMs = 3000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const s = await callJson(client, "get_job_status", { job_id: jobId });
    if (s.status === target) return s;
    if (s.status === "failed") throw new Error(`job failed: ${s.error}`);
    await new Promise((r) => setTimeout(r, 30));
  }
  throw new Error(`timeout waiting for status=${target}`);
}

test("enqueue_estimate_job validates against the catalog schema", async () => {
  const { client, transport } = await connect();
  try {
    await assert.rejects(
      callJson(client, "enqueue_estimate_job", {
        service: "ec2",
        params: { instance_type: "", count: 0 },
      }),
      /Invalid params/i,
    );
  } finally {
    await transport.close();
  }
});

test("enqueue + status + result happy path with stub executor", async () => {
  const { client, transport } = await connect();
  try {
    const enq = await callJson(client, "enqueue_estimate_job", {
      service: "ec2",
      params: {
        instance_type: "t3.micro",
        count: 1,
        hours_per_month: 730,
        region: "us-east-1",
      },
    });
    assert.equal(enq.status, "queued");
    assert.ok(enq.job_id);

    const done = await waitForStatus(client, enq.job_id, "succeeded");
    assert.ok(done.started_at);
    assert.ok(done.finished_at);

    const result = await callJson(client, "get_job_result", {
      job_id: enq.job_id,
    });
    assert.match(result.calculator_url, /^https:\/\/calculator\.aws\//);
    assert.equal(result.total_monthly, 42.0);
    assert.equal(result.line_items.length, 1);
  } finally {
    await transport.close();
  }
});

test("list_jobs returns recent jobs newest-first", async () => {
  const { client, transport } = await connect();
  try {
    const enq = await callJson(client, "enqueue_estimate_job", {
      service: "s3",
      params: { storage_gb: 10, region: "us-east-1" },
    });
    const list = await callJson(client, "list_jobs", { limit: 5 });
    assert.ok(list.count >= 1);
    assert.equal(list.jobs[0].job_id, enq.job_id);
    assert.equal(list.jobs[0].service, "s3");
  } finally {
    await transport.close();
  }
});

test("get_job_result errors while job is still running", async () => {
  const { client, transport } = await connect();
  try {
    const enq = await callJson(client, "enqueue_estimate_job", {
      service: "lambda",
      params: {
        invocations_per_month: 100000,
        memory_mb: 512,
        avg_duration_ms: 200,
        region: "us-east-1",
      },
    });
    await assert.rejects(
      callJson(client, "get_job_result", { job_id: enq.job_id }),
      /no result available yet|queued|running/i,
    );
  } finally {
    await transport.close();
  }
});
