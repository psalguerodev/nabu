import { useEffect, useState } from "react";
import "./App.css";

const TABS = ["Dashboard", "Jobs", "Services", "Settings"] as const;
type Tab = (typeof TABS)[number];

const EYEBROW: Record<Tab, string> = {
  Dashboard: "Overview",
  Jobs: "Estimate queue",
  Services: "AWS handlers",
  Settings: "Configuration",
};

const HEALTH_URL = "http://127.0.0.1:7531/health";
const POLL_INTERVAL_MS = 2000;

type McpStatus =
  | { state: "checking" }
  | { state: "up"; name: string; version: string }
  | { state: "down"; reason: string };

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
        const body = (await res.json()) as { name: string; version: string };
        setStatus({ state: "up", name: body.name, version: body.version });
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

        <section className="card">
          <p className="placeholder">No content yet.</p>
        </section>
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

function renderStatus(s: McpStatus): string {
  if (s.state === "checking") return "MCP · checking…";
  if (s.state === "up")
    return `MCP · ${s.name} v${s.version} · listening on :7531`;
  return `MCP · offline (${s.reason})`;
}
