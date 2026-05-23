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
  });
  const client = new Client({ name: "validate-test", version: "0.0.0" }, {});
  await client.connect(transport);
  return { client, transport };
}

async function callValidate(client, payload) {
  const res = await client.callTool({
    name: "validate_estimate",
    arguments: payload,
  });
  return JSON.parse(res.content[0].text);
}

test("validate_estimate accepts a well-formed EC2 estimate", async () => {
  const { client, transport } = await connect();
  try {
    const result = await callValidate(client, {
      service: "ec2",
      params: {
        instance_type: "t3.medium",
        count: 2,
        hours_per_month: 730,
        region: "us-east-1",
        os: "linux",
      },
    });
    assert.equal(result.valid, true);
    assert.equal(result.service, "ec2");
    assert.ok(result.normalized.count === 2);
  } finally {
    await transport.close();
  }
});

test("validate_estimate reports field-level errors", async () => {
  const { client, transport } = await connect();
  try {
    const result = await callValidate(client, {
      service: "ec2",
      params: {
        instance_type: "",
        count: 0,
        hours_per_month: 800,
        region: "us-east-1",
      },
    });
    assert.equal(result.valid, false);
    const paths = result.errors.map((e) => e.path);
    assert.ok(paths.includes("instance_type"), "flags empty instance_type");
    assert.ok(paths.includes("count"), "flags count < 1");
    assert.ok(paths.includes("hours_per_month"), "flags hours > 744");
  } finally {
    await transport.close();
  }
});

test("validate_estimate rejects unknown service", async () => {
  const { client, transport } = await connect();
  try {
    await assert.rejects(
      callValidate(client, { service: "rds", params: {} }),
      /Unknown service/i,
    );
  } finally {
    await transport.close();
  }
});

test("validate_estimate applies defaults to missing optional fields", async () => {
  const { client, transport } = await connect();
  try {
    const result = await callValidate(client, {
      service: "s3",
      params: { storage_gb: 100, region: "us-east-1" },
    });
    assert.equal(result.valid, true);
    assert.equal(result.normalized.storage_class, "standard");
    assert.equal(result.normalized.put_requests_per_month, 0);
  } finally {
    await transport.close();
  }
});
