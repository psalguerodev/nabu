import { db } from "./db.js";

const BASE_OVERHEAD_MS = 12_000;
const DEFAULT_PER_SERVICE_MS = 12_000;
const HISTORY_WINDOW = 20;

const historyStmt = db.prepare(
  `SELECT (finished_at - started_at) AS dur
   FROM jobs
   WHERE service = ?
     AND status = 'succeeded'
     AND started_at IS NOT NULL
     AND finished_at IS NOT NULL
   ORDER BY created_at DESC
   LIMIT ${HISTORY_WINDOW}`,
);

function p50(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function historicalP50Ms(service) {
  const rows = historyStmt.all(service);
  return p50(rows.map((r) => r.dur));
}

export function estimateDurationSec(services) {
  let totalMs = BASE_OVERHEAD_MS;
  for (const svc of services) {
    totalMs += historicalP50Ms(svc) ?? DEFAULT_PER_SERVICE_MS;
  }
  return Math.round(totalMs / 1000);
}
