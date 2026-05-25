// Cross-runtime SQLite: prefer Bun's bun:sqlite when running inside a
// Bun-compiled binary, otherwise use Node's node:sqlite (Node 22.5+).
// Both expose the same prepare(sql).run/get/all + exec() shape we use.
const isBun = typeof globalThis.Bun !== "undefined";
let DatabaseImpl;
if (isBun) {
  ({ Database: DatabaseImpl } = await import("bun:sqlite"));
} else {
  ({ DatabaseSync: DatabaseImpl } = await import("node:sqlite"));
}

const DB_PATH = process.env.NABU_DB_PATH || ":memory:";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  service TEXT NOT NULL,
  name TEXT,
  params_json TEXT NOT NULL,
  options_json TEXT,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  started_at INTEGER,
  finished_at INTEGER,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);

CREATE TABLE IF NOT EXISTS job_logs (
  job_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_logs_job ON job_logs(job_id, ts);

CREATE TABLE IF NOT EXISTS job_results (
  job_id TEXT PRIMARY KEY,
  calculator_url TEXT,
  line_items_json TEXT,
  total_monthly REAL,
  xlsx_path TEXT
);
`;

export const db = new DatabaseImpl(DB_PATH);
db.exec(SCHEMA);
try {
  db.exec("ALTER TABLE jobs ADD COLUMN name TEXT");
} catch {
  // column already exists in the upgraded schema; ignore
}
export const dbPath = DB_PATH;
