import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listServices, HANDLERS_DIR } from "../server.js";

test("HANDLERS_DIR points at playwright/lib/services", () => {
  assert.match(HANDLERS_DIR, /playwright\/lib\/services$/);
});

test("listServices returns sorted .js basenames", () => {
  const dir = mkdtempSync(join(tmpdir(), "nabu-svc-"));
  writeFileSync(join(dir, "zebra.js"), "");
  writeFileSync(join(dir, "alpha.js"), "");
  writeFileSync(join(dir, "README.md"), "");
  mkdirSync(join(dir, "nested"));

  const result = listServices(dir);
  assert.deepEqual(result, ["alpha", "zebra"]);
});

test("listServices on real handlers dir includes core services", () => {
  const services = listServices();
  for (const expected of ["ec2", "lambda", "s3", "dynamodb"]) {
    assert.ok(services.includes(expected), `missing ${expected}`);
  }
});
