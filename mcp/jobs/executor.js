import { addLog, setResult, setStatus, getJob } from "./store.js";

const STUB_DURATION_MS = Number(process.env.NABU_STUB_DURATION_MS ?? 5000);

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
    finalize(jobId);
  };
  setTimeout(tick, stepDelay);
}

function finalize(jobId) {
  const job = getJob(jobId);
  if (!job) return;
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
}
