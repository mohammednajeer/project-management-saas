import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./Homepage.css";

/* ─── ICONS ─────────────────────────────────────────────────────────────────── */
const Icon = {
  grid: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  arrow: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  arrowUpRight: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M7 17L17 7M7 7h10v10" />
    </svg>
  ),
  play: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="6,4 20,12 6,20" />
    </svg>
  ),
  check: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  zap: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  shield: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  chart: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  layers: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  plug: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15,3 21,3 21,9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  keyboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="2" y="4" width="20" height="16" rx="2" /><line x1="6" y1="8" x2="6" y2="8" /><line x1="10" y1="8" x2="10" y2="8" />
      <line x1="14" y1="8" x2="14" y2="8" /><line x1="18" y1="8" x2="18" y2="8" /><line x1="6" y1="12" x2="6" y2="12" />
      <line x1="10" y1="12" x2="10" y2="12" /><line x1="14" y1="12" x2="14" y2="12" /><line x1="18" y1="12" x2="18" y2="12" />
      <line x1="7" y1="16" x2="17" y2="16" />
    </svg>
  ),
  database: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </svg>
  ),
  terminal: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  ),
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  slack: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523 2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.043a2.528 2.528 0 0 1-2.522 2.52H8.823a2.528 2.528 0 0 1-2.52-2.52v-5.043zm2.52-6.342a2.528 2.528 0 0 1-2.52-2.52 2.528 2.528 0 0 1 2.52-2.522 2.528 2.528 0 0 1 2.522 2.522v2.52H8.823zm0 1.261a2.528 2.528 0 0 1 2.522 2.52v5.043a2.528 2.528 0 0 1-2.522 2.52H3.78a2.528 2.528 0 0 1-2.52-2.52v-5.043a2.528 2.528 0 0 1 2.52-2.52h5.043zm6.356-3.782a2.528 2.528 0 0 1 2.52-2.523 2.528 2.528 0 0 1 2.522 2.523 2.528 2.528 0 0 1-2.522 2.52h-2.52v-2.52zm-1.26 0a2.528 2.528 0 0 1-2.522 2.52H6.3a2.528 2.528 0 0 1-2.52-2.52V1.261A2.528 2.528 0 0 1 6.3 0h5.043a2.528 2.528 0 0 1 2.522 2.52v5.043zm-2.52 6.342a2.528 2.528 0 0 1 2.52 2.52 2.528 2.528 0 0 1-2.52 2.522 2.528 2.528 0 0 1-2.522-2.522v-2.52h2.522zm0-1.261a2.528 2.528 0 0 1-2.522-2.52V3.78a2.528 2.528 0 0 1 2.522-2.52H20.22a2.528 2.528 0 0 1 2.52 2.52v5.043a2.528 2.528 0 0 1-2.52 2.52h-5.043z" />
    </svg>
  ),
  github: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
    </svg>
  ),
  bell: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
};

/* ─── DATA ──────────────────────────────────────────────────────────────────── */
const NAV_LINKS = [
  { label: "Product", href: "#features" },
  { label: "Workflow", href: "#workflow" },
  { label: "Pricing", href: "#pricing" },
  { label: "Integrations", href: "#integrations" },
];

const LOGOS = ["Acme Corp", "GreenLeaf", "Voltex", "Nexora", "Bluefield", "Orion Co", "Stratus", "Crestline"];

/* ─── APP PREVIEW ────────────────────────────────────────────────────────────── */
function AppPreview() {
  return (
    <div className="app-frame mock-frame shadow-large hover-lift">
      <div className="app-chrome">
        <div className="chrome-dots">
          <span className="dot dot-r" /><span className="dot dot-y" /><span className="dot dot-g" />
        </div>
        <div className="chrome-url">app.projectflow.io/workspace/acme-corp</div>
        <div className="chrome-avatars">
          {["SC", "MW", "PN"].map((a, i) => (
            <div key={a} className="chrome-av" style={{ animationDelay: `${i * 0.25}s` }}>{a}</div>
          ))}
          <span className="chrome-live-indicator">● Presence</span>
        </div>
      </div>

      <div className="app-body">
        <div className="app-sidebar">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">{Icon.grid}</div>
            <span>ProjectFlow</span>
          </div>
          <nav className="sidebar-nav">
            {[
              { label: "Dashboard", icon: "▣" },
              { label: "Board View", icon: "◫" },
              { label: "Team Space", icon: "◎" },
              { label: "AI RAG Search", icon: "✦" }
            ].map((item, i) => (
              <div key={item.label} className={`sidebar-item${i === 1 ? " active" : ""}`}>
                <span className="si-icon">{item.icon}</span>
                {item.label}
              </div>
            ))}
          </nav>
          <div className="sidebar-label">Active Tenants</div>
          {[
            { name: "Acme Corp", color: "var(--brand, #c084fc)" },
            { name: "GreenLeaf Co", color: "var(--brand-2, #38bdf8)" },
            { name: "Voltex Inc", color: "var(--brand-3, #f472b6)" },
          ].map(w => (
            <div key={w.name} className="sidebar-ws">
              <div className="sidebar-ws-dot" style={{ background: w.color }} />
              <span>{w.name}</span>
            </div>
          ))}
        </div>

        <div className="app-main">
          <div className="main-header">
            <div>
              <div className="main-title">Q4 Product Release</div>
              <div className="main-breadcrumb">Acme Corp · Sprint 18</div>
            </div>
            <div className="main-pills">
              <span className="pill pill-active">In progress</span>
              <span className="pill pill-done">12 completed</span>
              <span className="pill pill-blocked">1 blocker</span>
            </div>
          </div>

          <div className="main-progress">
            <div className="prog-bar">
              <div className="prog-fill" style={{ width: "80%" }} />
            </div>
            <span className="prog-label">80%</span>
          </div>

          <div className="kanban">
            {[
              {
                id: "backlog", label: "Backlog", color: "#a3a6af",
                cards: [
                  { tag: "Backend", title: "OAuth 2.0 Auth Provider", due: "Jun 26", priority: "high" },
                  { tag: "Marketing", title: "Verify email signup flow templates", due: "Jun 28", priority: "low" },
                  { tag: "Database", title: "RAG vector indices optimize query", due: "Jun 30", priority: "medium" }
                ],
              },
              {
                id: "progress", label: "In progress", color: "var(--brand, #c084fc)",
                cards: [
                  { tag: "Frontend", title: "Tenant Switcher Component", due: "Jun 24", priority: "medium", active: true },
                  { tag: "Security", title: "pgvector similarity check security audit", due: "Jun 25", priority: "high", active: true }
                ],
              },
              {
                id: "done", label: "Completed", color: "var(--brand-2, #38bdf8)",
                cards: [
                  { tag: "Security", title: "Multi-tenant Isolation Layer", done: true },
                  { tag: "Core", title: "Redis cache manager backend driver", done: true },
                  { tag: "DevOps", title: "Setup Docker Compose container stack", done: true }
                ],
              },
            ].map(col => (
              <div key={col.id} className="k-col">
                <div className="k-col-head">
                  <span className="k-dot" style={{ background: col.color }} />
                  <span className="k-col-label">{col.label}</span>
                </div>
                {col.cards.map(c => (
                  <div key={c.title} className={`k-card${c.active ? " k-active" : ""}${c.done ? " k-done" : ""}`}>
                    <div className="k-card-top">
                      <span className="k-tag">{c.tag}</span>
                      {c.priority && <span className="k-pri">{c.priority}</span>}
                    </div>
                    <p className="k-title">{c.title}</p>
                    {c.due && (
                      <div className="k-meta">
                        <span className="k-due">Due {c.due}</span>
                        <div className="k-avs">
                          <div className="k-av">SC</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN HOMEPAGE ──────────────────────────────────────────────────────────── */
export default function Homepage() {
  const [scrolled, setScrolled] = useState(false);
  const [expandedTask, setExpandedTask] = useState(true);
  const [activeTab, setActiveTab] = useState("activity");
  const [lightModePreview, setLightModePreview] = useState(false);
  const [systemLogs, setSystemLogs] = useState([
    "INFO: [Worker] Initializing Celery connection to Redis...",
    "SUCCESS: Connected to redis://redis:6379/0",
    "INFO: [RAG Engine] Syncing Project: 'Acme Corp Q4 Launch'...",
    "SUCCESS: Embedded 5 documents using SentenceTransformers.",
    "INFO: [WebSocket] Socket client handshaking /ws/chat/acme-corp...",
    "SUCCESS: Authorized socket connection for SC (Sarah Chen)"
  ]);

  useEffect(() => {
    // 1. Scroll check for header navigation
    const handleScroll = () => {
      setScrolled(window.scrollY > 32);
    };
    window.addEventListener("scroll", handleScroll);

    // 2. IntersectionObserver for scroll-reveal animations
    const observerOptions = {
      root: null,
      rootMargin: "0px",
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    }, observerOptions);

    const revealElements = document.querySelectorAll(".scroll-reveal");
    revealElements.forEach((el) => observer.observe(el));

    // 3. Dynamic mock log updater
    const logInterval = setInterval(() => {
      const msgs = [
        "INFO: [AI Engine] Scanning workloads for overloading...",
        "SUCCESS: Calculated workload index; no members overloaded.",
        "INFO: [Cron Job] Starting daily deadline review...",
        "SUCCESS: Verified 14 milestones, sent 2 system alerts.",
        "INFO: [Backup System] Starting daily Postgres dump...",
        "SUCCESS: Generated backup: 'backup_2026-06-19.sql' (14.8MB)",
        "INFO: [WebSocket] Room chat update broadcast to /ws/chat/..."
      ];
      const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
      setSystemLogs(prev => [...prev.slice(1), `INFO: [${new Date().toLocaleTimeString()}] ${randomMsg}`]);
    }, 4000);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
      clearInterval(logInterval);
    };
  }, []);

  return (
    <div className="pf light-theme">
      
      {/* ── NAVBAR ───────────────────────────────────────────────────────────── */}
      <header className={`pf-nav${scrolled ? " pf-nav-scrolled" : ""}`}>
        <div className="nav-inner">
          <a href="/" className="nav-logo">
            <div className="nav-logo-mark">{Icon.grid}</div>
            <span className="nav-logo-name">ProjectFlow</span>
          </a>
          <nav className="nav-links">
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} className="nav-link">{l.label}</a>
            ))}
          </nav>
          <div className="nav-actions">
            <Link to="/signin" className="nav-signin">Sign in</Link>
            <Link to="/signup" className="btn btn-primary btn-sm">Get started</Link>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ──────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-badge scroll-reveal">
            <span className="badge-glow-dot" />
            AI-Powered Multi-Tenant Workspace
          </div>

          <h1 className="hero-title scroll-reveal reveal-delay-1">
            Ship faster.<br />
            <span className="gradient-text">Without the chaos.</span>
          </h1>

          <p className="hero-subtitle scroll-reveal reveal-delay-2">
            Orchestrate clients, coordinate teams, and automate task breakdowns with an elegant, RAG-powered database and real-time multiplayer boards.
          </p>

          <div className="hero-actions scroll-reveal reveal-delay-3">
            <Link to="/signup" className="btn btn-primary btn-lg hover-lift">
              Start Free Trial
              <span className="btn-icon">{Icon.arrow}</span>
            </Link>
            <a href="#demo" className="btn btn-secondary btn-lg hover-lift">
              <span className="btn-play">{Icon.play}</span>
              Watch Demo
            </a>
          </div>

          {/* Floating multiplayer cursors */}
          <div className="floating-cursor cursor-purple" style={{ top: "35%", left: "8%" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.5 3v15.25l4.5-4.5 3.5 8 3-1.25-3.5-8 5.75-.25L4.5 3z" />
            </svg>
            <span>Marcus (Manager)</span>
          </div>
          <div className="floating-cursor cursor-green" style={{ top: "72%", right: "12%" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.5 3v15.25l4.5-4.5 3.5 8 3-1.25-3.5-8 5.75-.25L4.5 3z" />
            </svg>
            <span>Sarah (Dev)</span>
          </div>
          <div className="floating-cursor cursor-pink" style={{ top: "48%", right: "4%" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4.5 3v15.25l4.5-4.5 3.5 8 3-1.25-3.5-8 5.75-.25L4.5 3z" />
            </svg>
            <span>Febby (AI)</span>
          </div>
        </div>

        <div className="hero-preview-container scroll-reveal reveal-delay-4">
          <AppPreview />
        </div>
      </section>

      {/* ── CLIENT STRIP ──────────────────────────────────────────────────────── */}
      <div className="logos-strip scroll-reveal">
        <p className="logos-label">Powering engineering teams at</p>
        <div className="logos-row">
          {LOGOS.map(n => <span key={n} className="logo-item">{n}</span>)}
        </div>
      </div>

      {/* ── SECTION 2: THE DETAILED TASK WORKSPACE ─────────────────────────────── */}
      <section id="workflow" className="section task-detail-section">
        <div className="section-inner split-layout">
          <div className="layout-content scroll-reveal">
            <span className="section-tag-badge">High Fidelity Flow</span>
            <h2 className="section-heading">A collaborative workspace inside every task</h2>
            <p className="section-desc">
              Tapping on any card expands it into a fully-equipped operational workspace. Run threads, generate subtask check-lists with AI, and query the codebase database dynamically.
            </p>
            <ul className="bullet-features">
              <li>
                <span className="bullet-check">{Icon.check}</span>
                <strong>AI Task Breakdown:</strong> Convert high-level summaries into concrete execution steps instantly.
              </li>
              <li>
                <span className="bullet-check">{Icon.check}</span>
                <strong>Contextual Database RAG:</strong> Directly query task metadata, user logs, and project parameters via inline AI chat.
              </li>
              <li>
                <span className="bullet-check">{Icon.check}</span>
                <strong>Threaded Discussions:</strong> Consolidate code reviews, feedback, and attachments side-by-side with your code tasks.
              </li>
            </ul>
            <button 
              className="btn btn-secondary btn-md inline-toggle-btn hover-lift"
              onClick={() => setExpandedTask(!expandedTask)}
            >
              {expandedTask ? "Collapse Task Preview" : "Expand Task Workspace"}
            </button>
          </div>

          <div className="layout-preview-box scroll-reveal reveal-delay-1">
            <div className={`mock-task-card mock-frame shadow-medium hover-lift ${expandedTask ? "is-expanded" : "is-collapsed"}`}>
              <div className="task-header-preview" onClick={() => setExpandedTask(!expandedTask)}>
                <div className="task-breadcrumb">Acme Corp / Task-1024</div>
                <h3 className="task-main-title">Configure Stripe Billing & Invoice Hooks</h3>
                <div className="task-tags-row">
                  <span className="tag tag-prio">High Priority</span>
                  <span className="tag tag-area">Billing</span>
                  <span className="tag tag-assignee">Sarah C.</span>
                </div>
              </div>

              {expandedTask && (
                <div className="task-expanded-content">
                  <div className="task-split-pane">
                    <div className="pane-left">
                      <div className="pane-section">
                        <div className="pane-section-title">Description</div>
                        <p className="pane-desc-text">Setup secure multi-tenant webhooks to listen to billing events from Stripe API and decrement leave credits/balances accordingly.</p>
                      </div>

                      <div className="pane-section">
                        <div className="pane-section-title flex-between">
                          <span>AI Subtasks Checklist</span>
                          <span className="ai-badge-label"><span className="mini-zap-icon">⚡</span> AI Generated</span>
                        </div>
                        <ul className="mock-checklist">
                          <li className="checked">
                            <input type="checkbox" checked readOnly />
                            <span>Create PostgreSQL database schema changes</span>
                          </li>
                          <li className="checked">
                            <input type="checkbox" checked readOnly />
                            <span>Integrate Stripe API verification keys</span>
                          </li>
                          <li className="loading-step">
                            <span className="spinner" />
                            <span>Generative AI: Creating webhook validation script...</span>
                          </li>
                          <li>
                            <input type="checkbox" disabled />
                            <span>Write unit tests for checkout callbacks</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="pane-right border-left">
                      <div className="pane-section">
                        <div className="pane-section-title">Collaboration Chat Thread</div>
                        <div className="thread-bubbles">
                          <div className="bubble bubble-user">
                            <div className="bubble-meta">Marcus (Manager) · 10:14 AM</div>
                            <p>@Sarah make sure webhook signatures are validated using raw bodies, not parsed JSON parameters.</p>
                          </div>
                          <div className="bubble bubble-ai">
                            <div className="bubble-meta"><span className="sparkle-icon">✦</span> Febby (AI Companion)</div>
                            <p>I verified the checkout callbacks. Stripe raw validation is active on lines 44-58. No security issues detected.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3 & 4: FEATURE CARDS GRID ──────────────────────────────────── */}
      <section id="features" className="section feature-grid-section">
        <div className="section-inner text-center">
          <span className="section-tag-badge scroll-reveal">Core Engine</span>
          <h2 className="section-heading scroll-reveal reveal-delay-1">Project management, upgraded</h2>
          <p className="section-desc max-w-600 scroll-reveal reveal-delay-2">
            A single multi-tenant codebase engineered with real-time WebSockets, robust security boundaries, and local vector search.
          </p>

          <div className="features-grid">
            {/* Card 1: AI Breakdown */}
            <div className="feature-card mock-frame shadow-small hover-lift card-purple scroll-reveal">
              <div className="f-card-icon-wrap">{Icon.zap}</div>
              <h3 className="f-card-title">AI Subtask Breakdown</h3>
              <p className="f-card-desc">Instantly convert large descriptions into task hierarchies. Uses Gemini 2.0 Flash JSON Mode with a local fallback engine.</p>
              <div className="f-card-illustration list-illustration">
                <div className="ill-row done"><span>Configure backend caching</span><span className="ill-check">✓</span></div>
                <div className="ill-row active"><span className="dots-bounce">Generating tasks</span></div>
              </div>
            </div>

            {/* Card 2: Real-time Presence */}
            <div className="feature-card mock-frame shadow-small hover-lift card-blue scroll-reveal reveal-delay-1">
              <div className="f-card-icon-wrap">{Icon.users}</div>
              <h3 className="f-card-title">Real-time Multiplayer</h3>
              <p className="f-card-desc">Conflict-free editing, instant state updates, and live workspace presence powered by Django ASGI Channels and Daphne.</p>
              <div className="f-card-illustration avatar-illustration">
                <div className="active-avatars-row">
                  <div className="ill-av av-pink">SC<span className="av-dot" /></div>
                  <div className="ill-av av-blue">MW<span className="av-dot" /></div>
                  <div className="ill-av av-green">PN<span className="av-dot" /></div>
                </div>
                <span className="ill-label-subtitle">3 developers active on this board</span>
              </div>
            </div>

            {/* Card 3: RAG Knowledge Assistant */}
            <div className="feature-card mock-frame shadow-small hover-lift card-pink scroll-reveal reveal-delay-2">
              <div className="f-card-icon-wrap">{Icon.shield}</div>
              <h3 className="f-card-title">Semantic RAG Assistant</h3>
              <p className="f-card-desc">Query issues, project structures, and code logic. Integrates SentenceTransformers vectors with PostgreSQL `pgvector` distance algorithms.</p>
              <div className="f-card-illustration search-illustration">
                <div className="ill-search-bar">
                  <span>{Icon.search} Who is working on security?</span>
                </div>
                <div className="ill-search-response">
                  <span>Answer: Sarah Chen is currently assigned to the Isolation Layer.</span>
                </div>
              </div>
            </div>

            {/* Card 4: True Multi-Tenancy */}
            <div className="feature-card mock-frame shadow-small hover-lift card-blue scroll-reveal">
              <div className="f-card-icon-wrap">{Icon.layers}</div>
              <h3 className="f-card-title">Tenant-level Isolation</h3>
              <p className="f-card-desc">Strict security boundaries. Every database table query checks the tenant identifier to ensure absolute database privacy.</p>
              <div className="f-card-illustration tenant-illustration">
                <div className="tenant-box box-1">Acme Workspace</div>
                <div className="tenant-divider-arrow">↔</div>
                <div className="tenant-box box-2">Voltex Workspace</div>
              </div>
            </div>

            {/* Card 5: Automated Alerts */}
            <div className="feature-card mock-frame shadow-small hover-lift card-pink scroll-reveal reveal-delay-1">
              <div className="f-card-icon-wrap">{Icon.bell}</div>
              <h3 className="f-card-title">Automated Risk Reminders</h3>
              <p className="f-card-desc">Celery-scheduled jobs run periodically to flag overdue issues, overloaded developers, and impending project milestones.</p>
              <div className="f-card-illustration notification-illustration">
                <div className="ill-notif notif-warn">
                  <span className="notif-dot" />
                  <span>Alert: Task-402 is approaching deadline.</span>
                </div>
              </div>
            </div>

            {/* Card 6: Velocity Dashboards */}
            <div className="feature-card mock-frame shadow-small hover-lift card-purple scroll-reveal reveal-delay-2">
              <div className="f-card-icon-wrap">{Icon.chart}</div>
              <h3 className="f-card-title">Velocity Analytics</h3>
              <p className="f-card-desc">Beautiful, stakeholder-ready charts tracking completion metrics, milestones, and employee capacity profiles.</p>
              <div className="f-card-illustration graph-illustration">
                <svg className="mock-graph" viewBox="0 0 100 40">
                  <path d="M0,35 Q15,20 30,28 T60,10 T90,5 T100,2" fill="none" stroke="var(--brand, #c084fc)" strokeWidth="2.5" />
                  <path d="M0,35 Q15,20 30,28 T60,10 T90,5 T100,2 L100,40 L0,40 Z" fill="url(#graph-grad)" opacity="0.1" />
                  <defs>
                    <linearGradient id="graph-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--brand, #c084fc)" />
                      <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: INTERACTIVE TAB SHOWCASE ────────────────────────────────── */}
      <section className="section tab-showcase-section">
        <div className="section-inner split-layout">
          <div className="layout-content scroll-reveal">
            <span className="section-tag-badge">Productivity Focus</span>
            <h2 className="section-heading">Engineered for absolute workspace organization</h2>
            <p className="section-desc">
              Manage notifications, inspect employee actions, and trace project history from one integrated hub. Flip through these panels to see the system dynamics.
            </p>

            <div className="showcase-tabs-list">
              <button 
                className={`tab-toggle-btn hover-lift ${activeTab === "activity" ? "active" : ""}`}
                onClick={() => setActiveTab("activity")}
              >
                <strong>Time Travel Logs</strong>
                <span>Track developer action history</span>
              </button>
              <button 
                className={`tab-toggle-btn hover-lift ${activeTab === "checklist" ? "active" : ""}`}
                onClick={() => setActiveTab("checklist")}
              >
                <strong>Workspace Checklist</strong>
                <span>Actionable personal sidebars</span>
              </button>
              <button 
                className={`tab-toggle-btn hover-lift ${activeTab === "threads" ? "active" : ""}`}
                onClick={() => setActiveTab("threads")}
              >
                <strong>Nested Live Threads</strong>
                <span>Integrated comment streams</span>
              </button>
            </div>
          </div>

          <div className="layout-preview-box scroll-reveal reveal-delay-1">
            <div className="tab-preview-frame mock-frame shadow-medium hover-lift">
              {activeTab === "activity" && (
                <div className="tab-content-activity fade-in">
                  <div className="frame-header-label">Activity Feed Timeline</div>
                  <div className="activity-timeline">
                    <div className="timeline-item">
                      <div className="time-lbl">09:42 AM</div>
                      <div className="event-details">
                        <strong>Sarah Chen</strong> moved card <code>Task-1024</code> to <span>In Progress</span>
                      </div>
                    </div>
                    <div className="timeline-item">
                      <div className="time-lbl">10:02 AM</div>
                      <div className="event-details">
                        <strong>AI System</strong> generated 4 subtasks for <code>Task-1024</code>
                      </div>
                    </div>
                    <div className="timeline-item">
                      <div className="time-lbl">10:14 AM</div>
                      <div className="event-details">
                        <strong>Marcus Williams</strong> commented: <i>"@Sarah review raw validation bodies..."</i>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "checklist" && (
                <div className="tab-content-checklist fade-in">
                  <div className="frame-header-label">My Workspace Checklist</div>
                  <ul className="checklist-items-preview">
                    <li>
                      <span className="checkbox-custom active">✓</span>
                      <span>Review team capacity report for Sprint 18</span>
                    </li>
                    <li>
                      <span className="checkbox-custom active">✓</span>
                      <span>Verify Postgres container database logs</span>
                    </li>
                    <li>
                      <span className="checkbox-custom idle"></span>
                      <span>Approve pending leave requests for developer group</span>
                    </li>
                    <li>
                      <span className="checkbox-custom idle"></span>
                      <span>Confirm weekly digest newsletter broadcasts</span>
                    </li>
                  </ul>
                </div>
              )}

              {activeTab === "threads" && (
                <div className="tab-content-threads fade-in">
                  <div className="frame-header-label">Live In-Task Thread Chat</div>
                  <div className="threads-preview-chat">
                    <div className="thread-chat-line">
                      <div className="user-icon">MW</div>
                      <div className="chat-body">
                        <strong>Marcus:</strong> Can we confirm pgvector performs within acceptable latency constraints?
                      </div>
                    </div>
                    <div className="thread-chat-line">
                      <div className="user-icon av-blue">SC</div>
                      <div className="chat-body">
                        <strong>Sarah:</strong> Yes. Cosine distance queries executing on 10,000+ entries resolve in under 4ms.
                      </div>
                    </div>
                    <div className="thread-chat-line chat-system">
                      <div className="user-icon av-spark">✦</div>
                      <div className="chat-body">
                        <strong>AI Assistant:</strong> Verified. Optimization parameters have been applied to PostgreSQL config.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: PLATFORM FEATURES & JOY ───────────────────────────────── */}
      <section className="section utilities-grid-section">
        <div className="section-inner text-center">
          <span className="section-tag-badge scroll-reveal">Developer Tooling</span>
          <h2 className="section-heading scroll-reveal reveal-delay-1">A workspace that's a joy to build in</h2>
          <p className="section-desc max-w-600 scroll-reveal reveal-delay-2">
            Engineered with deep utilities that accelerate workflows for supervisors and engineering teams alike.
          </p>

          <div className="utilities-grid">
            {/* Keyboard Shortcuts */}
            <div className="util-card mock-frame shadow-small hover-lift scroll-reveal">
              <div className="util-icon-wrap">{Icon.keyboard}</div>
              <h3 className="util-title">Keyboard Shortcuts</h3>
              <p className="util-desc">Navigate workspaces rapidly. Hit `Cmd+K` anywhere to search files, switch channels, or command the AI chatbot.</p>
              <div className="keyboard-keys-row">
                <kbd className="key-cap">⌘</kbd>
                <kbd className="key-cap">K</kbd>
                <span className="keys-divider">or</span>
                <kbd className="key-cap">G</kbd>
                <kbd className="key-cap">B</kbd>
              </div>
            </div>

            {/* Dark & Light mode toggle */}
            <div className="util-card mock-frame shadow-small hover-lift scroll-reveal reveal-delay-1">
              <div className="util-icon-wrap">{Icon.layers}</div>
              <h3 className="util-title">Interchangeable Themes</h3>
              <p className="util-desc">Select between a crisp light mode or deep neon dark mode. Test the theme interface layout below.</p>
              <div className="theme-toggle-simulator">
                <button 
                  className={`sim-toggle ${!lightModePreview ? "active" : ""}`}
                  onClick={() => setLightModePreview(false)}
                >
                  Dark Mode
                </button>
                <button 
                  className={`sim-toggle ${lightModePreview ? "active" : ""}`}
                  onClick={() => setLightModePreview(true)}
                >
                  Light Mode
                </button>
                <div className={`simulator-preview-badge theme-${lightModePreview ? "light" : "dark"}`}>
                  {lightModePreview ? "White Background" : "Deep Charcoal"}
                </div>
              </div>
            </div>

            {/* Integrations */}
            <div id="integrations" className="util-card mock-frame shadow-small hover-lift scroll-reveal reveal-delay-2">
              <div className="util-icon-wrap">{Icon.plug}</div>
              <h3 className="util-title">Third-party Connectivity</h3>
              <p className="util-desc">Synchronize Slack alerts, pull-request hooks, and team alerts with zero configuration.</p>
              <div className="integration-icons-row">
                <div className="int-logo-box">{Icon.slack}</div>
                <div className="int-logo-box">{Icon.github}</div>
                <div className="int-connector">✓ Linked</div>
              </div>
            </div>

            {/* SQL Backups */}
            <div className="util-card mock-frame shadow-small hover-lift scroll-reveal">
              <div className="util-icon-wrap">{Icon.database}</div>
              <h3 className="util-title">Automated SQL Backups</h3>
              <p className="util-desc">Super admins can download snapshots and database backups directly from the platform controller.</p>
              <div className="backup-download-box">
                <span className="file-name-tag">backup_latest.sql</span>
                <span className="file-size-lbl">14.8 MB</span>
                <span className="download-btn-symbol">↓</span>
              </div>
            </div>

            {/* Live Log Tailing */}
            <div className="util-card mock-frame shadow-small hover-lift col-span-2 scroll-reveal reveal-delay-1">
              <div className="util-icon-wrap">{Icon.terminal}</div>
              <h3 className="util-title">Platform Live Log Streaming</h3>
              <p className="util-desc">Get transparent operational debugging details. View real-time database query outputs and task executions directly.</p>
              <div className="terminal-shell">
                <div className="terminal-header">
                  <span className="dot dot-r" /><span className="dot dot-y" /><span className="dot dot-g" />
                  <span className="terminal-title-lbl">postgres_logs_worker.stdout</span>
                </div>
                <div className="terminal-body-text">
                  {systemLogs.map((log, i) => (
                    <div key={i} className="log-line">{log}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION ────────────────────────────────────────────────────── */}
      <section className="section cta-section scroll-reveal">
        <div className="section-inner">
          <div className="cta-card mock-frame shadow-large hover-lift">
            <h2 className="cta-heading">Your engineering team<br />deserves a better workflow</h2>
            <p className="cta-desc">
              Join thousands of developers shipping high-impact software with ProjectFlow. Start building for free.
            </p>
            <div className="cta-actions-row">
              <Link to="/signup" className="btn btn-primary btn-lg hover-lift">
                Get Started Free
                <span className="btn-icon">{Icon.arrow}</span>
              </Link>
              <a href="#demo" className="btn btn-secondary btn-lg hover-lift">
                Schedule Enterprise Demo →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="pf-footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <a href="/" className="nav-logo">
                <div className="nav-logo-mark">{Icon.grid}</div>
                <span className="nav-logo-name">ProjectFlow</span>
              </a>
              <p className="footer-brand-desc">
                Secure multi-tenant workspace with real-time kanban boards, automated task breakdowns, and local vector RAG engines.
              </p>
              <a href="mailto:hello@projectflow.io" className="footer-email">hello@projectflow.io</a>
            </div>

            <div className="footer-links">
              {[
                { title: "Product", links: ["Features", "Security Matrix", "Integrations", "Pricing Options"] },
                { title: "Company", links: ["About Us", "Engineering Blog", "Careers", "Super Admin Panel"] },
                { title: "Resources", links: ["API Docs", "SentenceTransformers RAG", "Daphne ASGI Settings", "Status"] }
              ].map(group => (
                <div key={group.title} className="footer-links-group">
                  <div className="footer-links-group-title">{group.title}</div>
                  {group.links.map(l => (
                    <a key={l} href="#" className="footer-link-item">{l}</a>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="footer-bottom">
            <div className="footer-copy">
              © {new Date().getFullYear()} ProjectFlow SaaS Inc. All rights reserved.
            </div>
            <div className="footer-policy-links">
              <a href="#" className="footer-policy-link">Privacy Policy</a>
              <a href="#" className="footer-policy-link">Terms of Service</a>
              <a href="#" className="footer-policy-link">Security Disclosures</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}