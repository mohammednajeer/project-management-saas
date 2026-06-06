import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./Homepage.css";

/* ─── ICONS ─────────────────────────────────────────────────────────────────── */
const Icon = {
  grid: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  arrow: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  arrowUpRight: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M7 17L17 7M7 7h10v10" />
    </svg>
  ),
  play: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  ),
  check: (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  zap: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  shield: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  chart: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  layers: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  plug: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15,3 21,3 21,9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
};

/* ─── DATA ──────────────────────────────────────────────────────────────────── */
const NAV_LINKS = [
  { label: "Product", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Integrations", href: "#integrations" },
  { label: "Docs", href: "#docs" },
];

const STATS = [
  { value: "3,000+", label: "Teams" },
  { value: "50M+",   label: "Tasks shipped" },
  { value: "99.9%",  label: "Uptime" },
  { value: "180+",   label: "Countries" },
];

const LOGOS = ["Acme Corp", "GreenLeaf", "Voltex", "Nexora", "Bluefield", "Orion Co", "Stratus", "Crestline"];

const FEATURES = [
  {
    icon: Icon.layers,
    tag: "Multi-tenancy",
    title: "True workspace isolation",
    desc: "Full data isolation per workspace. Custom branding, roles, and permissions — fully configurable per tenant without any cross-contamination.",
    accent: "apricot",
  },
  {
    icon: Icon.users,
    tag: "Collaboration",
    title: "Real-time, everywhere",
    desc: "Live presence, instant updates, and conflict-free editing across globally distributed teams. Everyone stays in sync, always.",
    accent: "sky",
  },
  {
    icon: Icon.zap,
    tag: "AI automation",
    title: "Intelligent task routing",
    desc: "Intelligent assignment, duration prediction, and blocker detection. Surface what matters before it becomes a problem.",
    accent: "apricot",
  },
  {
    icon: Icon.chart,
    tag: "Analytics",
    title: "Dashboards stakeholders love",
    desc: "Burndown charts, velocity graphs, and stakeholder-ready reports built into every workspace. No BI tool required.",
    accent: "sky",
  },
  {
    icon: Icon.plug,
    tag: "Integrations",
    title: "200+ tools, zero friction",
    desc: "Connect Slack, GitHub, Jira, Figma, Notion, and the tools your team already relies on — without duct tape or APIs.",
    accent: "apricot",
  },
  {
    icon: Icon.shield,
    tag: "Security",
    title: "Enterprise-grade from day one",
    desc: "SSO, SAML 2.0, SCIM provisioning, full audit logs, and end-to-end encryption. Compliance teams will thank you.",
    accent: "sky",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    desc: "For small teams just getting started.",
    features: ["Up to 3 members", "5 active projects", "1 GB storage", "Core Kanban boards", "Email support"],
    cta: "Get started",
    featured: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mo",
    desc: "For growing teams that need real power.",
    features: ["Unlimited members", "Unlimited projects", "50 GB storage", "AI automation", "Priority support", "Advanced analytics"],
    cta: "Start free trial",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "Dedicated infrastructure and compliance.",
    features: ["Custom SLA", "SSO / SAML / SCIM", "Unlimited storage", "Dedicated CSM", "Custom contracts"],
    cta: "Talk to sales",
    featured: false,
  },
];

const TESTIMONIALS = [
  {
    quote: "ProjectFlow cut our delivery time by 40%. The multi-tenant isolation is exactly what enterprise clients demand — clean, trustworthy, and fast to set up.",
    name: "Sarah Chen",
    role: "CTO, Streamline",
    initials: "SC",
  },
  {
    quote: "Finally a platform that doesn't feel bloated. Clean, fast, and our entire org adopted it within a week — no training required.",
    name: "Marcus Williams",
    role: "Product, Nexus Labs",
    initials: "MW",
  },
  {
    quote: "The workspace setup was seamless. Each client gets their own isolated environment. Genuinely brilliant product architecture.",
    name: "Priya Nair",
    role: "Founder, Orbit AI",
    initials: "PN",
  },
];

const KANBAN_COLS = [
  {
    id: "backlog", label: "Backlog", count: 4, color: "#a3a6af",
    cards: [
      { tag: "Design", title: "Redesign onboarding flow", due: "Jun 3", priority: "medium" },
      { tag: "Backend", title: "OAuth 2.0 endpoints", due: "Jun 7", priority: "high" },
    ],
  },
  {
    id: "progress", label: "In progress", count: 3, color: "#17191c",
    cards: [
      { tag: "Frontend", title: "Tenant switcher component", due: "Jun 1", priority: "high", active: true },
      { tag: "Core", title: "Multi-tenant data isolation", due: "Jun 4", priority: "urgent", active: true },
    ],
  },
  {
    id: "done", label: "Done", count: 12, color: "#4c4c4c",
    cards: [
      { tag: "Done", title: "Project schema design", done: true },
      { tag: "Done", title: "CI/CD pipeline setup", done: true },
    ],
  },
];

/* ─── APP PREVIEW ────────────────────────────────────────────────────────────── */
function AppPreview() {
  return (
    <div className="app-frame">
      <div className="app-chrome">
        <div className="chrome-dots">
          <span className="dot dot-r" /><span className="dot dot-y" /><span className="dot dot-g" />
        </div>
        <div className="chrome-url">app.projectflow.io/workspace/acme-corp</div>
        <div className="chrome-avatars">
          {["SC", "MW", "PN"].map(a => <div key={a} className="chrome-av">{a}</div>)}
          <span className="chrome-live">● Live</span>
        </div>
      </div>

      <div className="app-body">
        <div className="app-sidebar">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">{Icon.grid}</div>
            <span>ProjectFlow</span>
          </div>
          <nav className="sidebar-nav">
            {[["Dashboard","▣"],["Projects","◫"],["Tasks","☑"],["Team","◎"],["Reports","▥"]].map(([l, ic], i) => (
              <div key={l} className={`sidebar-item${i===2?" active":""}`}>
                <span className="si-icon">{ic}</span>{l}
              </div>
            ))}
          </nav>
          <div className="sidebar-label">Workspaces</div>
          {[
            {abbr:"AC",name:"Acme Corp",color:"#17191c"},
            {abbr:"GL",name:"GreenLeaf",color:"#4c4c4c"},
            {abbr:"VX",name:"Voltex",color:"#777b86"},
          ].map(w => (
            <div key={w.name} className="sidebar-ws">
              <div className="sidebar-ws-dot" style={{background:w.color}} />
              <span>{w.name}</span>
            </div>
          ))}
        </div>

        <div className="app-main">
          <div className="main-header">
            <div>
              <div className="main-title">Q4 Product Launch</div>
              <div className="main-breadcrumb">Acme Corp · Engineering</div>
            </div>
            <div className="main-pills">
              <span className="pill pill-active">In progress</span>
              <span className="pill pill-done">12 done</span>
              <span className="pill pill-blocked">3 blocked</span>
            </div>
          </div>

          <div className="main-progress">
            <div className="prog-bar"><div className="prog-fill" style={{width:"62%"}} /></div>
            <span className="prog-label">62%</span>
          </div>

          <div className="kanban">
            {KANBAN_COLS.map(col => (
              <div key={col.id} className="k-col">
                <div className="k-col-head">
                  <span className="k-dot" style={{background:col.color}} />
                  <span className="k-col-label">{col.label}</span>
                  <span className="k-count">{col.count}</span>
                </div>
                {col.cards.map(c => (
                  <div key={c.title} className={`k-card${c.active?" k-active":""}${c.done?" k-done":""}`}>
                    <div className="k-card-top">
                      <span className="k-tag">{c.tag}</span>
                      {c.priority && <span className={`k-pri k-pri-${c.priority}`}>{c.priority}</span>}
                    </div>
                    <p className="k-title">{c.title}</p>
                    {c.due && <div className="k-meta"><span className="k-due">Due {c.due}</span><div className="k-avs">{["A","B"].map(a=><div key={a} className="k-av">{a}</div>)}</div></div>}
                  </div>
                ))}
                <button className="k-add">+ Add task</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── HOMEPAGE ──────────────────────────────────────────────────────────────── */
export default function Homepage() {
  const [scrolled, setScrolled] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div className="pf">

      {/* ── NAV ──────────────────────────────────────────────────────────────── */}
      <header className={`pf-nav${scrolled ? " pf-nav-up" : ""}`}>
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
            <Link to="/signin" className="nav-signin hide-sm">Sign in</Link>
            <Link to="/signup" className="btn btn-ink btn-sm">Get started</Link>
          </div>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-eyebrow">
            <span className="eyebrow-dot" />
            Now with AI-powered task automation
          </div>

          <h1 className="hero-h1">
            Ship faster.<br />
            <span className="hero-h1-muted">Without the chaos.</span>
          </h1>

          <p className="hero-sub">
            Orchestrate clients, workspaces, and teams with enterprise-grade isolation,
            real-time collaboration, and analytics that stakeholders actually understand.
          </p>

          <div className="hero-actions">
            <Link to="/signup" className="btn btn-ink btn-lg">
              Start for free
              <span className="btn-icon">{Icon.arrow}</span>
            </Link>
            <a href="#demo" className="btn btn-ghost btn-lg">
              <span className="btn-play">{Icon.play}</span>
              Watch demo
            </a>
          </div>

          <div className="hero-trust">
            <div className="hero-avatars">
              {["#17191c","#4c4c4c","#777b86","#a3a6af","#4c4c4c"].map((c, i) => (
                <div key={i} className="hero-av" style={{ background: c }}>{String.fromCharCode(65 + i)}</div>
              ))}
            </div>
            <span className="hero-trust-text">Trusted by <strong>3,000+</strong> teams</span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-visual-bg" />
          <AppPreview />
        </div>

        <div className="hero-stats">
          {STATS.map((s, i) => (
            <div key={s.label} className="hero-stat">
              {i > 0 && <div className="stat-divider" />}
              <div className="stat-val">{s.value}</div>
              <div className="stat-lbl">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── LOGOS ────────────────────────────────────────────────────────────── */}
      <div className="logos-strip">
        <p className="logos-label">Trusted by teams at</p>
        <div className="logos-row">
          {LOGOS.map(n => <span key={n} className="logo-item">{n}</span>)}
        </div>
      </div>

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
      <section id="features" className="section">
        <div className="section-inner">
          <div className="section-head">
            <span className="section-tag">Platform</span>
            <h2 className="section-h2">Built for teams<br />that run other teams</h2>
            <p className="section-p">
              Every feature is purpose-built for managing multiple clients,
              workspaces, and stakeholders simultaneously.
            </p>
          </div>

          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`feature-card feature-${f.accent}${activeFeature === i ? " feature-active" : ""}`}
                onMouseEnter={() => setActiveFeature(i)}
              >
                <div className="feature-icon-wrap">
                  {f.icon}
                </div>
                <div className="feature-tag">{f.tag}</div>
                <h3 className="feature-h3">{f.title}</h3>
                <p className="feature-p">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CALLOUT ──────────────────────────────────────────────────────────── */}
      <section className="callout-section">
        <div className="callout-inner">
          <div className="callout-copy">
            <span className="section-tag section-tag-light">Workspace management</span>
            <h2 className="callout-h2">Every client in their own secure world</h2>
            <p className="callout-p">
              ProjectFlow isolates data, branding, and permissions per tenant — so you can run
              operations for dozens of clients from a single admin panel, without ever
              mixing signals.
            </p>
            <ul className="callout-list">
              {[
                "Per-tenant role & permission management",
                "Custom domain & branding per workspace",
                "Audit logs and compliance reporting",
                "One-click workspace provisioning",
              ].map(item => (
                <li key={item} className="callout-item">
                  <span className="callout-check">{Icon.check}</span>
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/signup" className="btn btn-white btn-lg">
              Start for free
              <span className="btn-icon">{Icon.arrow}</span>
            </Link>
          </div>

          <div className="callout-visual">
            {[
              {abbr:"AC", name:"Acme Corp", projects:12, status:"Active"},
              {abbr:"GL", name:"GreenLeaf", projects:8,  status:"Active"},
              {abbr:"VX", name:"Voltex Inc", projects:5, status:"Active"},
              {abbr:"NX", name:"Nexora",    projects:2,  status:"Trial"},
            ].map(t => (
              <div key={t.name} className="tenant-card">
                <div className="tenant-abbr">{t.abbr}</div>
                <div className="tenant-body">
                  <div className="tenant-name">{t.name}</div>
                  <div className="tenant-meta">{t.projects} projects · {t.status}</div>
                </div>
                <div className={`tenant-dot${t.status==="Active"?" dot-active":" dot-trial"}`} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────────── */}
      <section id="pricing" className="section">
        <div className="section-inner">
          <div className="section-head">
            <span className="section-tag">Pricing</span>
            <h2 className="section-h2">Simple, honest pricing</h2>
            <p className="section-p">Per workspace, not per seat. Scale without watching a meter spin.</p>
          </div>

          <div className="plans-grid">
            {PLANS.map(plan => (
              <div key={plan.name} className={`plan-card${plan.featured ? " plan-featured" : ""}`}>
                {plan.featured && <div className="plan-badge">Most popular</div>}
                <div className="plan-name">{plan.name}</div>
                <div className="plan-price-row">
                  <span className="plan-price">{plan.price}</span>
                  {plan.period && <span className="plan-period">{plan.period}</span>}
                </div>
                <p className="plan-desc">{plan.desc}</p>
                <div className="plan-divider" />
                <ul className="plan-features">
                  {plan.features.map(f => (
                    <li key={f} className="plan-feature">
                      <span className="plan-check">{Icon.check}</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className={`plan-cta${plan.featured ? " plan-cta-ink" : ""}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="plans-note">All plans include a 14-day free trial · No credit card required</p>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────────── */}
      <section className="testimonials-section">
        <div className="section-inner">
          <div className="section-head section-head-center">
            <h2 className="section-h2">Loved by teams<br />across the world</h2>
          </div>
          <div className="testimonials-grid">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="testimonial-card">
                <div className="testimonial-stars">★★★★★</div>
                <p className="testimonial-quote">{t.quote}</p>
                <div className="testimonial-person">
                  <div className="testimonial-av">{t.initials}</div>
                  <div>
                    <div className="testimonial-name">{t.name}</div>
                    <div className="testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="cta-section">
        <div className="section-inner">
          <div className="cta-card">
            <span className="section-tag section-tag-light">Get started today</span>
            <h2 className="cta-h2">Your team deserves<br />a better workflow</h2>
            <p className="cta-p">Join 3,000+ teams shipping faster with ProjectFlow. No credit card required.</p>
            <div className="cta-actions">
              <Link to="/signup" className="btn btn-white btn-lg">
                Start for free
                <span className="btn-icon">{Icon.arrow}</span>
              </Link>
              <a href="#demo" className="cta-link">Schedule a demo →</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="pf-footer">
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <a href="/" className="nav-logo footer-logo-link">
                <div className="nav-logo-mark">{Icon.grid}</div>
                <span className="nav-logo-name">ProjectFlow</span>
              </a>
              <p className="footer-desc">
                The multi-tenant project workspace for teams that need clean delivery,
                secure collaboration, and reporting everyone understands.
              </p>
              <a href="mailto:hello@projectflow.io" className="footer-email">hello@projectflow.io</a>
            </div>

            <div className="footer-links">
              {[
                { title: "Product",   links: ["Features", "Pricing", "Integrations", "Security", "Changelog"] },
                { title: "Company",   links: ["About", "Blog", "Careers", "Partners", "Press"] },
                { title: "Resources", links: ["Docs", "API Reference", "Help Center", "Status", "Community"] },
              ].map(g => (
                <div key={g.title} className="footer-group">
                  <div className="footer-group-title">{g.title}</div>
                  {g.links.map(l => <a key={l} href="#" className="footer-link">{l}</a>)}
                </div>
              ))}
            </div>
          </div>

          <div className="footer-bottom">
            <div className="footer-copy">© {new Date().getFullYear()} ProjectFlow Inc. All rights reserved.</div>
            <div className="footer-bottom-links">
              {["Privacy", "Terms", "Status", "Security"].map(l => (
                <a key={l} href="#" className="footer-bottom-link">{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}