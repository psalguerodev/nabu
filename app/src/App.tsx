import { useState } from "react";
import "./App.css";

const TABS = ["Dashboard", "Jobs", "Services", "Settings"] as const;
type Tab = (typeof TABS)[number];

const EYEBROW: Record<Tab, string> = {
  Dashboard: "Overview",
  Jobs: "Estimate queue",
  Services: "AWS handlers",
  Settings: "Configuration",
};

export default function App() {
  const [tab, setTab] = useState<Tab>("Dashboard");

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
        <span className="status-dot" aria-hidden />
        <span>Nabu · idle</span>
      </footer>
    </div>
  );
}
