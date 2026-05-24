import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { addLog, setResult, setStatus, getJob } from "./store.js";
import { getCatalogEntry } from "../catalog/index.js";

const STUB_DURATION_MS = Number(process.env.NABU_STUB_DURATION_MS ?? 5000);
const EXECUTOR_MODE = process.env.NABU_EXECUTOR ?? "real";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNNER_PATH = process.env.NABU_RUNNER_PATH
  ? process.env.NABU_RUNNER_PATH
  : join(HERE, "..", "..", "runner", "run.js");

export function run(jobId) {
  if (EXECUTOR_MODE === "stub") return runStub(jobId);
  return runReal(jobId);
}

export function runStub(jobId) {
  const job = getJob(jobId);
  if (!job) return;

  const steps = ["launch_browser", "open_calculator", "configure", "save"];
  setStatus(jobId, "running");
  addLog(jobId, "info", `stub executor started for service=${job.service}`);

  const stepDelay = Math.max(10, Math.floor(STUB_DURATION_MS / steps.length));
  let i = 0;
  const tick = () => {
    if (i < steps.length) {
      addLog(jobId, "info", `step: ${steps[i]} (${i + 1}/${steps.length})`);
      i += 1;
      setTimeout(tick, stepDelay);
      return;
    }
    const fakeUrl = `https://calculator.aws/#/estimate?id=stub-${jobId}`;
    setResult(jobId, {
      calculator_url: fakeUrl,
      line_items: [
        { service: job.service, monthly_usd: 42.0, note: "stub line item" },
      ],
      total_monthly: 42.0,
      xlsx_path: null,
    });
    setStatus(jobId, "succeeded");
    addLog(jobId, "info", `stub finished, calculator_url=${fakeUrl}`);
  };
  setTimeout(tick, stepDelay);
}

export function runReal(jobId) {
  const job = getJob(jobId);
  if (!job) return;

  setStatus(jobId, "running");
  addLog(jobId, "info", `spawning runner: ${RUNNER_PATH}`);

  const child = spawn(process.execPath, [RUNNER_PATH], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  const rawServices = job.params?.services
    ? job.params.services
    : [{ service: job.service, params: job.params }];
  const services = rawServices.map(({ service, params, group }) => {
    const entry = getCatalogEntry(service);
    return {
      service,
      params,
      handler_path: entry?.handlerPath ?? null,
      ...(group ? { group } : {}),
    };
  });
  child.stdin.write(
    JSON.stringify({
      jobId,
      services,
      options: job.options ?? {},
    }),
  );
  child.stdin.end();

  let buf = "";
  child.stdout.on("data", (chunk) => {
    buf += chunk.toString();
    let nl;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      try {
        const event = JSON.parse(line);
        handleEvent(jobId, event);
      } catch {
        addLog(jobId, "warn", `non-json from runner: ${line}`);
      }
    }
  });

  child.stderr.on("data", (chunk) => {
    const text = chunk.toString().trim();
    if (text) addLog(jobId, "warn", `runner stderr: ${text}`);
  });

  child.once("exit", (code, signal) => {
    if (buf.trim()) addLog(jobId, "warn", `runner stdout (unflushed): ${buf}`);
    const current = getJob(jobId);
    if (!current) return;
    if (code === 0) {
      if (current.status !== "succeeded") {
        setStatus(jobId, "failed", {
          error: "runner exited 0 without emitting a result event",
        });
      }
      return;
    }
    if (current.status !== "failed") {
      setStatus(jobId, "failed", {
        error: `runner exited code=${code} signal=${signal ?? "none"}`,
      });
    }
  });
}

function handleEvent(jobId, event) {
  if (event.type === "log") {
    addLog(jobId, event.level ?? "info", event.message ?? "");
    return;
  }
  if (event.type === "result") {
    setResult(jobId, {
      calculator_url: event.calculator_url,
      line_items: event.line_items,
      total_monthly: event.total_monthly,
      xlsx_path: event.xlsx_path,
    });
    setStatus(jobId, "succeeded");
    return;
  }
  if (event.type === "error") {
    setStatus(jobId, "failed", { error: event.message ?? "runner error" });
    addLog(jobId, "error", event.message ?? "runner error");
    return;
  }
}
