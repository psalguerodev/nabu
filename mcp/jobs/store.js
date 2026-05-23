import { db } from "./db.js";

const now = () => Date.now();

const insertJobStmt = db.prepare(
  `INSERT INTO jobs (id, service, name, params_json, options_json, status, created_at)
   VALUES (?, ?, ?, ?, ?, 'queued', ?)`,
);
const setStatusStmt = db.prepare(
  `UPDATE jobs SET status=?, started_at=COALESCE(started_at, ?), finished_at=?, error=? WHERE id=?`,
);
const addLogStmt = db.prepare(
  `INSERT INTO job_logs (job_id, ts, level, message) VALUES (?, ?, ?, ?)`,
);
const upsertResultStmt = db.prepare(
  `INSERT INTO job_results (job_id, calculator_url, line_items_json, total_monthly, xlsx_path)
   VALUES (?, ?, ?, ?, ?)
   ON CONFLICT(job_id) DO UPDATE SET
     calculator_url=excluded.calculator_url,
     line_items_json=excluded.line_items_json,
     total_monthly=excluded.total_monthly,
     xlsx_path=excluded.xlsx_path`,
);
const getJobStmt = db.prepare(`SELECT * FROM jobs WHERE id = ?`);
const getResultStmt = db.prepare(`SELECT * FROM job_results WHERE job_id = ?`);
const getLogsStmt = db.prepare(
  `SELECT ts, level, message FROM job_logs WHERE job_id = ? ORDER BY ts ASC, rowid ASC`,
);
const listJobsStmt = db.prepare(
  `SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?`,
);
const deleteJobStmt = db.prepare(`DELETE FROM jobs WHERE id = ?`);
const deleteJobLogsStmt = db.prepare(`DELETE FROM job_logs WHERE job_id = ?`);
const deleteJobResultStmt = db.prepare(`DELETE FROM job_results WHERE job_id = ?`);

export function createJob({ id, service, name, params, options }) {
  insertJobStmt.run(
    id,
    service,
    name ?? null,
    JSON.stringify(params),
    options ? JSON.stringify(options) : null,
    now(),
  );
}

export function setStatus(id, status, { error = null } = {}) {
  const t = now();
  const started = status === "running" ? t : null;
  const finished =
    status === "succeeded" || status === "failed" ? t : null;
  setStatusStmt.run(status, started, finished, error, id);
}

export function addLog(id, level, message) {
  addLogStmt.run(id, now(), level, message);
}

export function setResult(id, { calculator_url, line_items, total_monthly, xlsx_path }) {
  upsertResultStmt.run(
    id,
    calculator_url ?? null,
    line_items ? JSON.stringify(line_items) : null,
    total_monthly ?? null,
    xlsx_path ?? null,
  );
}

export function getJob(id) {
  const row = getJobStmt.get(id);
  if (!row) return null;
  return hydrate(row);
}

export function getJobDetail(id) {
  const job = getJob(id);
  if (!job) return null;
  const result = getResultStmt.get(id);
  const logs = getLogsStmt.all(id);
  return {
    ...job,
    logs,
    result: result
      ? {
          calculator_url: result.calculator_url,
          line_items: result.line_items_json
            ? JSON.parse(result.line_items_json)
            : null,
          total_monthly: result.total_monthly,
          xlsx_path: result.xlsx_path,
        }
      : null,
  };
}

export function listJobs(limit = 50) {
  return listJobsStmt.all(limit).map(hydrate);
}

export function deleteJob(id) {
  deleteJobLogsStmt.run(id);
  deleteJobResultStmt.run(id);
  return deleteJobStmt.run(id).changes;
}

export function deleteJobs(ids) {
  if (!ids.length) return 0;
  let n = 0;
  for (const id of ids) n += deleteJob(id);
  return n;
}

function hydrate(row) {
  return {
    id: row.id,
    service: row.service,
    name: row.name ?? null,
    params: JSON.parse(row.params_json),
    options: row.options_json ? JSON.parse(row.options_json) : null,
    status: row.status,
    created_at: row.created_at,
    started_at: row.started_at,
    finished_at: row.finished_at,
    error: row.error,
  };
}
