import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { loadSettings, saveSetting, type Settings } from "./settings";

const TABS = ["Dashboard", "Jobs", "Services", "Updates", "Settings"] as const;
type Tab = (typeof TABS)[number];

const EYEBROW: Record<Tab, string> = {
  Dashboard: "Overview",
  Jobs: "Estimate queue",
  Services: "AWS handlers",
  Updates: "Catalog distribution",
  Settings: "Configuration",
};

const MCP_BASE = "http://127.0.0.1:7531";
const HEALTH_URL = `${MCP_BASE}/health`;
const SERVICES_URL = `${MCP_BASE}/services`;
const JOBS_URL = `${MCP_BASE}/jobs`;
const RELOAD_URL = `${MCP_BASE}/reload`;
const INSTALL_URL = `${MCP_BASE}/install`;
const CHECK_UPDATES_URL = `${MCP_BASE}/check-updates`;
const DEFAULT_RELEASE_URL =
  "https://github.com/psalguerodev/nabu/releases/latest/download/";
const POLL_INTERVAL_MS = 2000;

type McpStatus =
  | { state: "checking" }
  | { state: "up"; name: string; version: string; catalogVersion?: string }
  | { state: "down"; reason: string };

type UpdateCheck = {
  installed_version: string | null;
  available_version: string;
  is_newer: boolean;
  same: boolean;
  total_remote_services: number;
  adds: { name: string; handler_version: string }[];
  updates: { name: string; from: string; to: string }[];
};

type CatalogService = {
  name: string;
  handler_version: string;
  status: string;
  tags?: string[];
  schema_ref?: string;
  source?: "embedded" | "remote";
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
        <div className="page">
          <header className="page-header">
            <div>
              <div className="eyebrow">{EYEBROW[tab]}</div>
              <h1>{tab}</h1>
            </div>
          </header>
          <TabContent tab={tab} status={status} />
        </div>
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
  if (tab === "Updates") return <UpdatesPanel mcpUp={status.state === "up"} />;
  return (
    <section className="card">
      <p className="placeholder">No content yet.</p>
    </section>
  );
}

function UpdatesPanel({ mcpUp }: { mcpUp: boolean }) {
  const [services, setServices] = useState<CatalogService[] | null>(null);
  const [catalogVersion, setCatalogVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  const [lastReload, setLastReload] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);
  const [checking, setChecking] = useState(false);
  const releaseUrl = DEFAULT_RELEASE_URL;
  const [installResult, setInstallResult] = useState<{
    services: number;
    version: string;
  } | null>(null);
  const [updateCheck, setUpdateCheck] = useState<UpdateCheck | null>(null);

  const refetch = async () => {
    try {
      const res = await fetch(SERVICES_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setServices(body.services);
      setCatalogVersion(body.catalog_version);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    if (mcpUp) refetch();
  }, [mcpUp]);

  const reload = async () => {
    setReloading(true);
    try {
      const res = await fetch(RELOAD_URL, { method: "POST" });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.error ?? `HTTP ${res.status}`);
      } else {
        setLastReload(new Date().toLocaleTimeString());
        await refetch();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReloading(false);
    }
  };

  const checkForUpdates = async () => {
    setChecking(true);
    setUpdateCheck(null);
    setError(null);
    try {
      const res = await fetch(CHECK_UPDATES_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_url: releaseUrl }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.error ?? `HTTP ${res.status}`);
      } else {
        setUpdateCheck(body);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setChecking(false);
    }
  };

  const installFromRemote = async () => {
    setInstalling(true);
    setInstallResult(null);
    setError(null);
    try {
      const res = await fetch(INSTALL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base_url: releaseUrl }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.error ?? `HTTP ${res.status}`);
      } else {
        setInstallResult({
          services: body.installed_services,
          version: body.catalog_version,
        });
        setUpdateCheck(null);
        await refetch();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setInstalling(false);
    }
  };

  if (!mcpUp) {
    return (
      <section className="card">
        <p className="placeholder">MCP offline — cannot inspect catalog.</p>
      </section>
    );
  }
  if (error && !services) {
    return (
      <section className="card">
        <p className="error-text">Failed to load: {error}</p>
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

  const remote = services.filter((s) => s.source === "remote");
  const embedded = services.filter((s) => s.source === "embedded");

  return (
    <>
      <div className="services-toolbar">
        <div>
          <div className="eyebrow">Active catalog</div>
          <div className="updates-version">
            {formatCatalogVersion(catalogVersion)}
          </div>
        </div>
        <div className="updates-actions">
          {lastReload && (
            <span className="catalog-meta">last reload {lastReload}</span>
          )}
          <button className="btn" onClick={reload} disabled={reloading}>
            {reloading ? "Reloading…" : "Reload catalog from disk"}
          </button>
        </div>
      </div>

      <section className="card updates-summary">
        <div>
          <div className="eyebrow">Remote overlay</div>
          <p className="updates-stat">
            <strong>{remote.length}</strong> service
            {remote.length === 1 ? "" : "s"}
          </p>
        </div>
        <div>
          <div className="eyebrow">Embedded</div>
          <p className="updates-stat">
            <strong>{embedded.length}</strong> service
            {embedded.length === 1 ? "" : "s"}
          </p>
        </div>
        <div>
          <div className="eyebrow">Total active</div>
          <p className="updates-stat">
            <strong>{services.length}</strong>
          </p>
        </div>
      </section>

      <section className="card updates-install">
        <div className="eyebrow">Install from remote</div>
        <div className="updates-install__row updates-install__row--readonly">
          <span className="setting-label">Release base URL</span>
          <code className="updates-install__url">{releaseUrl}</code>
        </div>

        {updateCheck && (
          <div className="updates-check">
            <div className="updates-check__row">
              <span className="catalog-meta">Installed</span>
              <strong>
                {formatCatalogVersion(updateCheck.installed_version)}
              </strong>
            </div>
            <div className="updates-check__row">
              <span className="catalog-meta">Available</span>
              <strong>
                {formatCatalogVersion(updateCheck.available_version)}
              </strong>
            </div>
            {updateCheck.is_newer && (
              <p className="updates-check__verdict updates-check__verdict--newer">
                A newer release is available.
              </p>
            )}
            {updateCheck.same && (
              <p className="updates-check__verdict">
                You're already on the latest release.
              </p>
            )}
            {!updateCheck.is_newer && !updateCheck.same && (
              <p className="updates-check__verdict">
                Installed catalog is newer than the remote — nothing to do.
              </p>
            )}
            {(updateCheck.updates.length > 0 ||
              updateCheck.adds.length > 0) && (
              <>
                {updateCheck.updates.length > 0 && (
                  <div>
                    <div className="eyebrow">
                      {updateCheck.updates.length} updated
                    </div>
                    <ul className="updates-check__list">
                      {updateCheck.updates.map((u) => (
                        <li key={u.name}>
                          <code>{u.name}</code> · {u.from} → {u.to}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {updateCheck.adds.length > 0 && (
                  <div>
                    <div className="eyebrow">
                      {updateCheck.adds.length} new
                    </div>
                    <ul className="updates-check__list">
                      {updateCheck.adds.map((a) => (
                        <li key={a.name}>
                          <code>{a.name}</code> · {a.handler_version}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="updates-install__actions">
          {installResult && (
            <span className="catalog-meta">
              Installed {installResult.services} service(s) at{" "}
              {formatCatalogVersion(installResult.version)}
            </span>
          )}
          {error && <span className="error-text">{error}</span>}
          <button
            className="btn"
            onClick={checkForUpdates}
            disabled={checking || !releaseUrl}
          >
            {checking ? "Checking…" : "Check for updates"}
          </button>
          <button
            className="btn btn--primary"
            onClick={installFromRemote}
            disabled={
              installing ||
              !releaseUrl ||
              !updateCheck ||
              !updateCheck.is_newer
            }
            title={
              !updateCheck
                ? "Check for updates first to see what would change"
                : updateCheck.same
                  ? "Already up to date"
                  : !updateCheck.is_newer
                    ? "Installed catalog is newer than the remote"
                    : "Download and install the latest release"
            }
          >
            {installing
              ? "Installing…"
              : updateCheck?.is_newer
                ? `Update to ${formatCatalogVersion(updateCheck.available_version)}`
                : "Install"}
          </button>
        </div>
      </section>

      <section className="card">
        <div className="eyebrow">Installed services</div>
        <ul className="updates-list">
          {services.map((s) => (
            <li key={s.name}>
              <span className="updates-list__name">{s.name}</span>
              <span className="catalog-meta">
                v{s.handler_version ?? "?"}
              </span>
              <span
                className={`badge ${s.source === "remote" ? "badge--succeeded" : ""}`}
              >
                {s.source ?? "embedded"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

type JobSummary = {
  id: string;
  service: string;
  name: string | null;
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
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<
    null | { ids: string[]; label: string }
  >(null);
  const [busy, setBusy] = useState(false);

  const refetch = async () => {
    try {
      const res = await fetch(JOBS_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setJobs(body.jobs);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

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

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allChecked =
    jobs != null && jobs.length > 0 && checked.size === jobs.length;
  const someChecked = checked.size > 0;

  const toggleAll = () => {
    if (!jobs) return;
    if (allChecked) setChecked(new Set());
    else setChecked(new Set(jobs.map((j) => j.id)));
  };

  const askDeleteSelected = () => {
    const ids = [...checked];
    if (!ids.length) return;
    setConfirm({
      ids,
      label: `${ids.length} job${ids.length === 1 ? "" : "s"}`,
    });
  };

  const askDeleteOne = (id: string, name: string) => {
    setConfirm({ ids: [id], label: name });
  };

  const performDelete = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.ids.length === 1) {
        await fetch(`${JOBS_URL}/${confirm.ids[0]}`, { method: "DELETE" });
      } else {
        await fetch(JOBS_URL, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: confirm.ids }),
        });
      }
      if (confirm.ids.includes(selectedId ?? "")) setSelectedId(null);
      setChecked((prev) => {
        const next = new Set(prev);
        for (const id of confirm.ids) next.delete(id);
        return next;
      });
      setConfirm(null);
      await refetch();
    } finally {
      setBusy(false);
    }
  };

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
    <>
      <div className="jobs-toolbar">
        <label className="jobs-toolbar__select-all">
          <input type="checkbox" checked={allChecked} onChange={toggleAll} />
          {someChecked
            ? `${checked.size} selected`
            : `Select all (${jobs.length})`}
        </label>
        <button
          className="btn btn--danger"
          disabled={!someChecked || busy}
          onClick={askDeleteSelected}
        >
          Delete selected
        </button>
      </div>

      <div className="jobs-layout">
        <ul className="jobs-list">
          {jobs.map((j) => (
            <li
              key={j.id}
              className={`jobs-item ${j.id === selectedId ? "jobs-item--active" : ""}`}
            >
              <input
                type="checkbox"
                className="jobs-item__check"
                checked={checked.has(j.id)}
                onChange={() => toggle(j.id)}
                onClick={(e) => e.stopPropagation()}
              />
              <div
                className="jobs-item__body"
                onClick={() => setSelectedId(j.id)}
              >
                <div className="jobs-item__top">
                  <span className="jobs-item__service">
                    {j.name ?? serviceLabel(j.service)}
                  </span>
                  <StatusBadge status={j.status} />
                </div>
                <div className="jobs-item__id">
                  {j.name ? `${serviceLabel(j.service)} · ` : ""}
                  {j.id.slice(0, 8)} · {formatJobTiming(j)}
                </div>
              </div>
              <button
                className="jobs-item__delete"
                title="Delete this job"
                onClick={(e) => {
                  e.stopPropagation();
                  askDeleteOne(j.id, j.name ?? j.service);
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <JobDetailView
          detail={detail}
          placeholder={!selectedId}
          onRetry={(newId) => {
            setSelectedId(newId);
            refetch();
          }}
        />
      </div>

      {confirm && (
        <ConfirmDialog
          message={`Delete ${confirm.label}? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          busy={busy}
          onConfirm={performDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}

function ConfirmDialog({
  message,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <p className="modal__message">{message}</p>
        <div className="modal__actions">
          <button className="btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            className={`btn ${danger ? "btn--danger" : "btn--primary"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge--${status}`}>{status}</span>;
}

function JobDetailView({
  detail,
  placeholder,
  onRetry,
}: {
  detail: JobDetail | null;
  placeholder: boolean;
  onRetry?: (jobId: string) => void;
}) {
  const [showInput, setShowInput] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const retry = async () => {
    if (!detail) return;
    setRetrying(true);
    try {
      const res = await fetch(`${JOBS_URL}/${detail.id}/retry`, {
        method: "POST",
      });
      const body = await res.json();
      if (res.ok && body.ok && onRetry) onRetry(body.job_id);
    } finally {
      setRetrying(false);
    }
  };

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
          <div className="eyebrow">{serviceLabel(detail.service)}</div>
          <h2>{detail.name ?? detail.id.slice(0, 8)}</h2>
        </div>
        <div className="jobs-detail__header-actions">
          <StatusBadge status={detail.status} />
          {detail.status === "failed" && (
            <button
              className="btn btn--primary"
              onClick={retry}
              disabled={retrying}
              title="Re-enqueue this job with the same payload"
            >
              {retrying ? "Retrying…" : "Retry"}
            </button>
          )}
        </div>
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

      <div>
        <button className="btn" onClick={() => setShowInput((v) => !v)}>
          {showInput ? "Hide" : "Show"} input JSON
        </button>
        {showInput && (
          <pre className="jobs-input">
            {JSON.stringify(detail.params, null, 2)}
          </pre>
        )}
      </div>

      {detail.result?.calculator_url && (
        <div className="jobs-result">
          <div className="eyebrow">Result</div>
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

      <div className="eyebrow">Logs</div>
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

function formatCatalogVersion(raw: string | null | undefined): string {
  if (!raw) return "—";
  const plus = raw.indexOf("+");
  if (plus === -1) return raw;
  const base = raw.slice(0, plus);
  const suffix = raw.slice(plus + 1);
  const date = new Date(suffix);
  if (Number.isNaN(date.getTime())) return raw;
  const fmt = date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${base} · ${fmt}`;
}

function formatRelative(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m}m ${rem}s` : `${m}m`;
}

function formatJobTiming(job: {
  status: string;
  created_at: number;
  started_at: number | null;
  finished_at: number | null;
}): string {
  if (job.finished_at && job.started_at) {
    return `took ${formatDuration(job.finished_at - job.started_at)}`;
  }
  return formatRelative(job.created_at);
}

function serviceLabel(service: string): string {
  const parts = service.split("+").filter(Boolean);
  if (parts.length === 1) return parts[0];
  return `${parts.length} services`;
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
    <>
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

        <McpRestartRow />
      </section>

      <ClaudeDesktopSetupCard />
    </>
  );
}

function McpRestartRow() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function restart() {
    setBusy(true);
    setMessage(null);
    try {
      await invoke<boolean>("restart_mcp");
      // Probe the new sidecar so the user sees confirmation when it's back.
      const deadline = Date.now() + 8000;
      let ready = false;
      while (Date.now() < deadline) {
        try {
          const r = await fetch("http://127.0.0.1:7531/health");
          if (r.ok) {
            ready = true;
            break;
          }
        } catch {
          /* still booting */
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      setMessage(ready ? "MCP restarted." : "Restart issued; sidecar not responding yet.");
    } catch (e) {
      setMessage(`Failed: ${(e as Error).message ?? e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="setting-row">
      <span className="setting-label">MCP sidecar</span>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {message && <span className="setting-value">{message}</span>}
        <button className="btn" onClick={restart} disabled={busy}>
          {busy ? "Restarting…" : "Restart connection"}
        </button>
      </div>
    </div>
  );
}

type ClaudeStatus = {
  os: string;
  config_path: string;
  config_exists: boolean;
  bridge_path: string;
  installed: boolean;
  current_entry: unknown | null;
};

function ClaudeDesktopSetupCard() {
  const [status, setStatus] = useState<ClaudeStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmInstall, setConfirmInstall] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const refresh = async () => {
    try {
      const s = await invoke<ClaudeStatus>("claude_config_status");
      setStatus(s);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const install = async () => {
    setBusy(true);
    try {
      const s = await invoke<ClaudeStatus>("claude_install");
      setStatus(s);
      setError(null);
      setConfirmInstall(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const uninstall = async () => {
    setBusy(true);
    try {
      const s = await invoke<ClaudeStatus>("claude_uninstall");
      setStatus(s);
      setError(null);
      setConfirmRemove(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!status) {
    return (
      <section className="card">
        <div className="eyebrow">Claude Desktop integration</div>
        <p className="placeholder">
          {error ? `Failed: ${error}` : "Loading…"}
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="card claude-setup">
        <header className="claude-setup__header">
          <div>
            <div className="eyebrow">Claude Desktop integration</div>
            <h3 className="claude-setup__title">
              {status.installed
                ? "Nabu is wired into Claude Desktop"
                : "Connect Claude Desktop to Nabu"}
            </h3>
          </div>
          <span
            className={`badge ${status.installed ? "badge--succeeded" : "badge--queued"}`}
          >
            {status.installed ? "installed" : "not installed"}
          </span>
        </header>

        <p className="claude-setup__intro">
          Nabu exposes its MCP tools to Claude Desktop through the local
          stdio↔HTTP bridge. The button below merges a <code>nabu</code>{" "}
          entry into Claude Desktop&apos;s{" "}
          <code>mcpServers</code> config so you don&apos;t have to edit
          the file by hand. Restart Claude Desktop after installing.
        </p>

        <dl className="claude-setup__meta">
          <div>
            <dt>operating system</dt>
            <dd>{status.os}</dd>
          </div>
          <div>
            <dt>config file</dt>
            <dd className="claude-setup__path">
              {status.config_path}
              {!status.config_exists && (
                <span className="catalog-meta"> · will be created</span>
              )}
            </dd>
          </div>
          <div>
            <dt>bridge entry point</dt>
            <dd className="claude-setup__path">{status.bridge_path}</dd>
          </div>
        </dl>

        <div className="claude-setup__actions">
          {error && <span className="error-text">{error}</span>}
          {status.installed ? (
            <button
              className="btn btn--danger"
              onClick={() => setConfirmRemove(true)}
              disabled={busy}
            >
              Remove from Claude Desktop
            </button>
          ) : (
            <button
              className="btn btn--primary"
              onClick={() => setConfirmInstall(true)}
              disabled={busy}
            >
              {busy ? "Working…" : "Install into Claude Desktop"}
            </button>
          )}
        </div>
      </section>

      {confirmInstall && (
        <ConfirmDialog
          message={`This will add a "nabu" entry under mcpServers in ${status.config_path}. The existing file (if any) is backed up to <name>.bak.<timestamp>.json before writing.`}
          confirmLabel="Install"
          busy={busy}
          onConfirm={install}
          onCancel={() => setConfirmInstall(false)}
        />
      )}
      {confirmRemove && (
        <ConfirmDialog
          message="Remove the nabu entry from Claude Desktop's config?"
          confirmLabel="Remove"
          danger
          busy={busy}
          onConfirm={uninstall}
          onCancel={() => setConfirmRemove(false)}
        />
      )}
    </>
  );
}

type JsonSchemaProperty = {
  type?: string | string[];
  description?: string;
  default?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
};

type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
};

type ServiceDetail = {
  name: string;
  meta: { status?: string; tags?: string[]; handler_version?: string };
  schema: JsonSchema;
};

function ServicesPanel({ mcpUp }: { mcpUp: boolean }) {
  const [services, setServices] = useState<CatalogService[] | null>(null);
  const [catalogVersion, setCatalogVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [detail, setDetail] = useState<ServiceDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!selectedName) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetail(null);
    setDetailError(null);
    (async () => {
      try {
        const res = await fetch(`${SERVICES_URL}/${selectedName}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as ServiceDetail;
        if (!cancelled) setDetail(body);
      } catch (err) {
        if (!cancelled) setDetailError((err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedName]);

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

  const q = query.trim().toLowerCase();
  const filtered = q
    ? services.filter(
        (s) =>
          s.name.includes(q) ||
          (s.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      )
    : services;

  return (
    <>
      <div className="services-toolbar">
        <input
          type="search"
          className="services-search"
          placeholder={`Search ${services.length} services…`}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
        />
        <span className="catalog-meta">
          catalog <strong>{formatCatalogVersion(catalogVersion)}</strong> · showing {filtered.length}
          /{services.length}
        </span>
      </div>

      <div className="services-layout">
        <ul className="services-list">
          {filtered.length === 0 && (
            <li className="placeholder services-empty">No matches.</li>
          )}
          {filtered.map((s) => (
            <li
              key={s.name}
              className={`services-list__item ${s.name === selectedName ? "services-list__item--active" : ""}`}
              onClick={() => setSelectedName(s.name)}
            >
              <div className="services-list__head">
                <span className="services-list__name">{s.name}</span>
                <span className="services-list__status">{s.status}</span>
              </div>
              <div className="services-list__tags">
                {(s.tags ?? []).map((t) => (
                  <span key={t} className="tag">
                    {t}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>

        <ServiceDetailView
          detail={detail}
          error={detailError}
          placeholder={!selectedName}
        />
      </div>
    </>
  );
}

function ServiceDetailView({
  detail,
  error,
  placeholder,
}: {
  detail: ServiceDetail | null;
  error: string | null;
  placeholder: boolean;
}) {
  const [showRaw, setShowRaw] = useState(false);

  if (placeholder) {
    return (
      <section className="card services-detail">
        <p className="placeholder">
          Select a service to see the parameters it accepts.
        </p>
      </section>
    );
  }
  if (error) {
    return (
      <section className="card services-detail">
        <p className="error-text">Failed: {error}</p>
      </section>
    );
  }
  if (!detail) {
    return (
      <section className="card services-detail">
        <p className="placeholder">Loading…</p>
      </section>
    );
  }

  const requiredSet = new Set(detail.schema.required ?? []);
  const allProps = Object.entries(detail.schema.properties ?? {});
  const requiredProps = allProps.filter(([k]) => requiredSet.has(k));
  const optionalProps = allProps.filter(([k]) => !requiredSet.has(k));

  return (
    <section className="card services-detail">
      <header className="services-detail__header">
        <div>
          <div className="eyebrow">{detail.meta.status ?? "schema"}</div>
          <h2>{detail.name}</h2>
        </div>
        <div className="service-row__tags">
          {(detail.meta.tags ?? []).map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
      </header>

      {requiredProps.length > 0 && (
        <PropsTable label="Required" entries={requiredProps} required />
      )}
      {optionalProps.length > 0 && (
        <PropsTable label="Optional" entries={optionalProps} />
      )}

      <button
        className="btn services-detail__raw-toggle"
        onClick={() => setShowRaw((v) => !v)}
      >
        {showRaw ? "Hide" : "Show"} raw JSON Schema
      </button>
      {showRaw && (
        <pre className="services-detail__raw">
          {JSON.stringify(detail.schema, null, 2)}
        </pre>
      )}
    </section>
  );
}

function PropsTable({
  label,
  entries,
  required,
}: {
  label: string;
  entries: [string, JsonSchemaProperty][];
  required?: boolean;
}) {
  return (
    <div className="props-block">
      <div className="eyebrow">{label}</div>
      <table className="props-table">
        <thead>
          <tr>
            <th>field</th>
            <th>type</th>
            <th>{required ? "" : "default"}</th>
            <th>description</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([name, prop]) => (
            <tr key={name}>
              <td className="props-table__name">{name}</td>
              <td className="props-table__type">{formatType(prop)}</td>
              <td className="props-table__default">
                {required
                  ? null
                  : prop.default !== undefined
                    ? String(prop.default)
                    : "—"}
              </td>
              <td className="props-table__desc">{prop.description ?? null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatType(prop: JsonSchemaProperty): string {
  if (prop.enum) return prop.enum.map((v) => String(v)).join(" | ");
  if (Array.isArray(prop.type)) return prop.type.join(" | ");
  const t = prop.type ?? "any";
  const bounds: string[] = [];
  if (prop.minimum != null) bounds.push(`≥ ${prop.minimum}`);
  if (prop.maximum != null) bounds.push(`≤ ${prop.maximum}`);
  if (prop.minLength != null) bounds.push(`len ≥ ${prop.minLength}`);
  return bounds.length ? `${t} (${bounds.join(", ")})` : t;
}

function renderStatus(s: McpStatus): string {
  if (s.state === "checking") return "MCP · checking…";
  if (s.state === "up") {
    const cat = s.catalogVersion
      ? ` · catalog ${formatCatalogVersion(s.catalogVersion)}`
      : "";
    return `MCP · ${s.name} v${s.version}${cat} · :7531`;
  }
  return `MCP · offline (${s.reason})`;
}
