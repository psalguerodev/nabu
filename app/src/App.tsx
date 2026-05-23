import { useEffect, useState } from "react";
import "./App.css";
import { loadSettings, saveSetting, type Settings } from "./settings";

const TABS = ["Dashboard", "Jobs", "Services", "Settings"] as const;
type Tab = (typeof TABS)[number];

const EYEBROW: Record<Tab, string> = {
  Dashboard: "Overview",
  Jobs: "Estimate queue",
  Services: "AWS handlers",
  Settings: "Configuration",
};

const MCP_BASE = "http://127.0.0.1:7531";
const HEALTH_URL = `${MCP_BASE}/health`;
const SERVICES_URL = `${MCP_BASE}/services`;
const JOBS_URL = `${MCP_BASE}/jobs`;
const POLL_INTERVAL_MS = 2000;

type McpStatus =
  | { state: "checking" }
  | { state: "up"; name: string; version: string; catalogVersion?: string }
  | { state: "down"; reason: string };

type CatalogService = {
  name: string;
  handler_version: string;
  status: string;
  tags?: string[];
  schema_ref?: string;
};

function useMcpStatus(): McpStatus {
  const [status, setStatus] = useState<McpStatus>({ state: "checking" });

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 1500);
        const res = await fetch(HEALTH_URL, { signal: ctrl.signal });
        clearTimeout(t);
        if (cancelled) return;
        if (!res.ok) {
          setStatus({ state: "down", reason: `HTTP ${res.status}` });
          return;
        }
        const body = await res.json();
        setStatus({
          state: "up",
          name: body.name,
          version: body.version,
          catalogVersion: body.catalog_version,
        });
      } catch (err) {
        if (cancelled) return;
        setStatus({ state: "down", reason: (err as Error).name });
      }
    };
    tick();
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return status;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("Dashboard");
  const status = useMcpStatus();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden />
          <div className="brand-name">
            Nabu<em>· ARKHO</em>
          </div>
        </div>
        <nav>
          {TABS.map((t) => (
            <button
              key={t}
              className={t === tab ? "nav active" : "nav"}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </nav>
      </aside>

      <main className="content">
        <header className="content-header">
          <div>
            <div className="content-eyebrow">{EYEBROW[tab]}</div>
            <h1>{tab}</h1>
          </div>
        </header>
        <TabContent tab={tab} status={status} />
      </main>

      <footer className="statusbar">
        <span
          className={`status-dot ${status.state === "up" ? "" : "status-dot--off"}`}
          aria-hidden
        />
        <span>{renderStatus(status)}</span>
      </footer>
    </div>
  );
}

function TabContent({ tab, status }: { tab: Tab; status: McpStatus }) {
  if (tab === "Services") return <ServicesPanel mcpUp={status.state === "up"} />;
  if (tab === "Settings") return <SettingsPanel />;
  if (tab === "Jobs") return <JobsPanel mcpUp={status.state === "up"} />;
  return (
    <section className="card">
      <p className="placeholder">No content yet.</p>
    </section>
  );
}

type JobSummary = {
  id: string;
  service: string;
  status: string;
  created_at: number;
  started_at: number | null;
  finished_at: number | null;
  error: string | null;
};

type JobLog = { ts: number; level: string; message: string };

type JobDetail = JobSummary & {
  params: Record<string, unknown>;
  options: Record<string, unknown> | null;
  logs: JobLog[];
  result: {
    calculator_url: string | null;
    line_items: Array<Record<string, unknown>> | null;
    total_monthly: number | null;
    xlsx_path: string | null;
  } | null;
};

function JobsPanel({ mcpUp }: { mcpUp: boolean }) {
  const [jobs, setJobs] = useState<JobSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mcpUp) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(JOBS_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        if (!cancelled) {
          setJobs(body.jobs);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };
    tick();
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [mcpUp]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(`${JOBS_URL}/${selectedId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as JobDetail;
        if (!cancelled) setDetail(body);
      } catch {
        // swallow; outer error display handled by list
      }
    };
    tick();
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [selectedId]);

  if (!mcpUp) {
    return (
      <section className="card">
        <p className="placeholder">MCP offline — cannot load jobs.</p>
      </section>
    );
  }
  if (error && !jobs) {
    return (
      <section className="card">
        <p className="placeholder">Failed to load: {error}</p>
      </section>
    );
  }
  if (!jobs) {
    return (
      <section className="card">
        <p className="placeholder">Loading…</p>
      </section>
    );
  }
  if (jobs.length === 0) {
    return (
      <section className="card">
        <p className="placeholder">
          No jobs yet. Enqueue one via Claude using{" "}
          <code>enqueue_estimate_job</code>.
        </p>
      </section>
    );
  }
  return (
    <div className="jobs-layout">
      <ul className="jobs-list">
        {jobs.map((j) => (
          <li
            key={j.id}
            className={`jobs-item ${j.id === selectedId ? "jobs-item--active" : ""}`}
            onClick={() => setSelectedId(j.id)}
          >
            <div className="jobs-item__top">
              <span className="jobs-item__service">{j.service}</span>
              <StatusBadge status={j.status} />
            </div>
            <div className="jobs-item__id">
              {j.id.slice(0, 8)} · {formatRelative(j.created_at)}
            </div>
          </li>
        ))}
      </ul>
      <JobDetailView detail={detail} placeholder={!selectedId} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge--${status}`}>{status}</span>;
}

function JobDetailView({
  detail,
  placeholder,
}: {
  detail: JobDetail | null;
  placeholder: boolean;
}) {
  if (placeholder) {
    return (
      <section className="card jobs-detail">
        <p className="placeholder">Select a job to see logs and result.</p>
      </section>
    );
  }
  if (!detail) {
    return (
      <section className="card jobs-detail">
        <p className="placeholder">Loading…</p>
      </section>
    );
  }
  return (
    <section className="card jobs-detail">
      <header className="jobs-detail__header">
        <div>
          <div className="content-eyebrow">{detail.service}</div>
          <h2>{detail.id.slice(0, 8)}</h2>
        </div>
        <StatusBadge status={detail.status} />
      </header>

      <dl className="jobs-detail__meta">
        <div>
          <dt>created</dt>
          <dd>{formatAbs(detail.created_at)}</dd>
        </div>
        {detail.started_at && (
          <div>
            <dt>started</dt>
            <dd>{formatAbs(detail.started_at)}</dd>
          </div>
        )}
        {detail.finished_at && (
          <div>
            <dt>finished</dt>
            <dd>{formatAbs(detail.finished_at)}</dd>
          </div>
        )}
      </dl>

      {detail.error && <pre className="jobs-error">{detail.error}</pre>}

      {detail.result?.calculator_url && (
        <div className="jobs-result">
          <div className="content-eyebrow">Result</div>
          <p>
            <a
              href={detail.result.calculator_url}
              target="_blank"
              rel="noreferrer"
            >
              {detail.result.calculator_url}
            </a>
          </p>
          {detail.result.total_monthly != null && (
            <p className="jobs-result__total">
              Total monthly: <strong>${detail.result.total_monthly}</strong>
            </p>
          )}
        </div>
      )}

      <div className="content-eyebrow jobs-logs-label">Logs</div>
      <ol className="jobs-logs">
        {detail.logs.map((l, i) => (
          <li key={i}>
            <span className="jobs-log__ts">{formatTime(l.ts)}</span>
            <span className={`jobs-log__level jobs-log__level--${l.level}`}>
              {l.level}
            </span>
            <span>{l.message}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function formatRelative(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function formatAbs(ts: number): string {
  return new Date(ts).toLocaleString();
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

function SettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSettings()
      .then((s) => {
        if (!cancelled) setSettings(s);
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    try {
      await saveSetting(key, value);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (error) {
    return (
      <section className="card">
        <p className="placeholder">Failed: {error}</p>
      </section>
    );
  }
  if (!settings) {
    return (
      <section className="card">
        <p className="placeholder">Loading…</p>
      </section>
    );
  }

  return (
    <section className="card settings">
      <label className="setting-row">
        <span className="setting-label">Headless Playwright</span>
        <input
          type="checkbox"
          checked={settings.headless}
          onChange={(e) => update("headless", e.currentTarget.checked)}
        />
      </label>

      <label className="setting-row">
        <span className="setting-label">Default AWS region</span>
        <input
          type="text"
          value={settings.default_region}
          onChange={(e) => update("default_region", e.currentTarget.value)}
        />
      </label>

      <div className="setting-row setting-row--readonly">
        <span className="setting-label">MCP port</span>
        <span className="setting-value">7531 (fixed in this milestone)</span>
      </div>
    </section>
  );
}

function ServicesPanel({ mcpUp }: { mcpUp: boolean }) {
  const [services, setServices] = useState<CatalogService[] | null>(null);
  const [catalogVersion, setCatalogVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mcpUp) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(SERVICES_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        if (cancelled) return;
        setServices(body.services);
        setCatalogVersion(body.catalog_version);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mcpUp]);

  if (!mcpUp) {
    return (
      <section className="card">
        <p className="placeholder">MCP offline — cannot load catalog.</p>
      </section>
    );
  }
  if (error) {
    return (
      <section className="card">
        <p className="placeholder">Failed to load: {error}</p>
      </section>
    );
  }
  if (!services) {
    return (
      <section className="card">
        <p className="placeholder">Loading…</p>
      </section>
    );
  }
  return (
    <>
      <p className="catalog-meta">
        Catalog version <strong>{catalogVersion}</strong> · {services.length}{" "}
        services
      </p>
      <ul className="service-list">
        {services.map((s) => (
          <li key={s.name} className="service-row">
            <div className="service-row__main">
              <span className="service-row__name">{s.name}</span>
              <span className="service-row__status">{s.status}</span>
            </div>
            <div className="service-row__tags">
              {(s.tags ?? []).map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function renderStatus(s: McpStatus): string {
  if (s.state === "checking") return "MCP · checking…";
  if (s.state === "up") {
    const cat = s.catalogVersion ? ` · catalog ${s.catalogVersion}` : "";
    return `MCP · ${s.name} v${s.version}${cat} · :7531`;
  }
  return `MCP · offline (${s.reason})`;
}
