import Database from "@tauri-apps/plugin-sql";

const DB = "sqlite:nabu.db";

export type Settings = {
  headless: boolean;
  default_region: string;
};

const DEFAULTS: Settings = {
  headless: true,
  default_region: "us-east-1",
};

let dbPromise: Promise<Database> | null = null;
function getDb() {
  if (!dbPromise) dbPromise = Database.load(DB);
  return dbPromise;
}

type Row = { key: string; value: string };

export async function loadSettings(): Promise<Settings> {
  const db = await getDb();
  const rows = await db.select<Row[]>("SELECT key, value FROM settings");
  const stored: Partial<Record<keyof Settings, string>> = {};
  for (const r of rows) {
    if (r.key in DEFAULTS) stored[r.key as keyof Settings] = r.value;
  }
  return {
    headless: stored.headless ? stored.headless === "true" : DEFAULTS.headless,
    default_region: stored.default_region ?? DEFAULTS.default_region,
  };
}

export async function saveSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K],
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO settings(key, value) VALUES($1, $2) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    [key, String(value)],
  );
}
