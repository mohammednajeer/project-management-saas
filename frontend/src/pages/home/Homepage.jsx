import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Homepage.css";

/* ─── ICONS ─────────────────────────────────────────────────────────────────── */
const Icon = {
  grid: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  arrow: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  play: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  ),
  check: (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  tenancy: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  collab: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  ai: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  chart: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
    </svg>
  ),
  plug: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15,3 21,3 21,9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  shield: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
};

/* ─── DATA ──────────────────────────────────────────────────────────────────── */
const NAV_LINKS = ["Features", "Pricing", "Integrations", "Docs"];

const STATS = [
  { value: "3,000+", label: "Active Tenants" },
  { value: "50M+",   label: "Tasks Completed" },
  { value: "99.9%",  label: "Uptime SLA" },
  { value: "180+",   label: "Countries Served" },
];

const COMPANIES = ["Acme Corp", "GreenLeaf", "Voltex Inc", "Nexora", "Bluefield", "Orion Co", "Stratus", "Crestline"];

const FEATURES = [
  { icon: Icon.tenancy, title: "True Multi-Tenancy",        desc: "Full data isolation per workspace. Custom branding, roles, and permissions — fully configurable per tenant.",       color: "#6C53B3", bg: "#F2EFFE" },
  { icon: Icon.collab,  title: "Real-time Collaboration",   desc: "Live presence, instant updates, and conflict-free editing across globally distributed teams.",                       color: "#3B82F6", bg: "#EFF6FF" },
  { icon: Icon.ai,      title: "AI Task Automation",        desc: "Intelligent assignment, duration prediction, and blocker detection — surface what matters before it becomes a problem.", color: "#8B5CF6", bg: "#F5F3FF" },
  { icon: Icon.chart,   title: "Advanced Analytics",        desc: "Burndown charts, velocity graphs, and stakeholder-ready dashboards built right into every workspace.",               color: "#0891B2", bg: "#ECFEFF" },
  { icon: Icon.plug,    title: "200+ Integrations",         desc: "Connect Slack, GitHub, Jira, Figma, Notion, and the tools your team already relies on — without friction.",          color: "#059669", bg: "#ECFDF5" },
  { icon: Icon.shield,  title: "Enterprise Security",       desc: "SSO, SAML 2.0, SCIM provisioning, full audit logs, and end-to-end encryption for compliance-first teams.",          color: "#DC2626", bg: "#FEF2F2" },
];

const PLANS = [
  {
    name: "Starter",
    price: "$0",
    period: "/month",
    desc: "For small teams getting started.",
    features: ["Up to 3 team members", "5 active projects", "1 GB storage", "Core Kanban boards", "Email support"],
    cta: "Get Started Free",
    featured: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    desc: "For growing teams that need power.",
    features: ["Unlimited members", "Unlimited projects", "50 GB storage", "AI automation", "Priority support", "Advanced analytics"],
    cta: "Start Free Trial",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "Dedicated infrastructure & compliance.",
    features: ["Custom tenant SLA", "SSO / SAML / SCIM", "Unlimited storage", "Dedicated success manager", "Custom contracts & billing"],
    cta: "Contact Sales",
    featured: false,
  },
];

const TESTIMONIALS = [
  {
    quote: "ProjectFlow cut our delivery time by 40%. The multi-tenant isolation is exactly what enterprise clients demand — clean, trustworthy, and fast to set up.",
    name: "Sarah Chen",
    role: "CTO at Streamline",
    initials: "SC",
    color: "#6C53B3",
  },
  {
    quote: "Finally a platform that doesn't feel bloated. Clean, fast, and our entire org adopted it within a week — no training required.",
    name: "Marcus Williams",
    role: "PM at Nexus Labs",
    initials: "MW",
    color: "#3B82F6",
  },
  {
    quote: "The workspace setup was seamless. Each client gets their own isolated environment. Genuinely brilliant product architecture.",
    name: "Priya Nair",
    role: "Founder at Orbit AI",
    initials: "PN",
    color: "#8B5CF6",
  },
];

const KANBAN = [
  {
    id: "backlog", label: "Backlog", count: 4, dot: "#94A3B8",
    cards: [
      { tag: "Design",  tagColor: "#6C53B3", tagBg: "#F2EFFE", title: "Redesign onboarding flow",     due: "Jun 3",  priority: "medium" },
      { tag: "Backend", tagColor: "#0891B2", tagBg: "#ECFEFF", title: "Set up OAuth 2.0 endpoints",   due: "Jun 7",  priority: "high"   },
    ],
  },
  {
    id: "inprogress", label: "In Progress", count: 3, dot: "#3B82F6",
    cards: [
      { tag: "Frontend", tagColor: "#059669", tagBg: "#ECFDF5", title: "Tenant switcher component",   due: "Jun 1",  priority: "high",   active: true },
      { tag: "Core",     tagColor: "#8B5CF6", tagBg: "#F5F3FF", title: "Multi-tenant data isolation", due: "Jun 4",  priority: "urgent", active: true },
    ],
  },
  {
    id: "done", label: "Done", count: 12, dot: "#10B981",
    cards: [
      { tag: "Done", tagColor: "#10B981", tagBg: "#ECFDF5", title: "Project schema design",         done: true },
      { tag: "Done", tagColor: "#10B981", tagBg: "#ECFDF5", title: "CI/CD pipeline setup",          done: true },
    ],
  },
];

const PRIORITY_COLORS = { high: "#F59E0B", urgent: "#EF4444", medium: "#6C53B3" };

/* ─── MINI APP PREVIEW ──────────────────────────────────────────────────────── */
function AppPreview() {
  return (
    <div className="app-frame">
      {/* Browser chrome */}
      <div className="app-chrome">
        <div className="chrome-dots">
          <span className="dot dot-r" /><span className="dot dot-y" /><span className="dot dot-g" />
        </div>
        <div className="chrome-url">app.projectflow.io/workspace/acme-corp</div>
        <div className="chrome-badges">
          {["AC","GL","VX"].map(a => <div key={a} className="chrome-badge">{a}</div>)}
        </div>
      </div>

      {/* App body */}
      <div className="app-body">
        {/* Sidebar */}
        <div className="app-sidebar">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">{Icon.grid}</div>
            <span>ProjectFlow</span>
          </div>
          <nav className="sidebar-nav">
            {[
              ["Dashboard", "▣"],
              ["Projects",  "◫"],
              ["Tasks",     "☑"],
              ["Team",      "◎"],
              ["Reports",   "▥"],
            ].map(([label, ic], i) => (
              <div key={label} className={`sidebar-item${i === 2 ? " active" : ""}`}>
                <span className="sidebar-item-ic">{ic}</span>
                {label}
              </div>
            ))}
          </nav>

          <div className="sidebar-section-label">Workspaces</div>
          {[
            { abbr: "AC", name: "Acme Corp",  dot: "#6C53B3" },
            { abbr: "GL", name: "GreenLeaf",  dot: "#059669" },
            { abbr: "VX", name: "Voltex Inc", dot: "#3B82F6" },
          ].map(ws => (
            <div key={ws.name} className="sidebar-ws">
              <div className="sidebar-ws-dot" style={{ background: ws.dot }} />
              <span>{ws.name}</span>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="app-main">
          {/* Project header */}
          <div className="main-header">
            <div className="main-header-left">
              <h3 className="main-project-title">Q4 Product Launch</h3>
              <div className="main-breadcrumb">Acme Corp / Engineering</div>
            </div>
            <div className="main-header-right">
              <div className="status-pill status-active">In Progress</div>
              <div className="status-pill status-done">12 done</div>
              <div className="status-pill status-blocked">3 blocked</div>
            </div>
          </div>

          {/* Progress */}
          <div className="main-progress-row">
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{ width: "62%" }} />
            </div>
            <span className="progress-label">62% complete</span>
          </div>

          {/* Kanban */}
          <div className="kanban-grid">
            {KANBAN.map(col => (
              <div key={col.id} className="kanban-col">
                <div className="kanban-col-header">
                  <span className="kanban-col-dot" style={{ background: col.dot }} />
                  <span className="kanban-col-label">{col.label}</span>
                  <span className="kanban-col-count">{col.count}</span>
                </div>
                {col.cards.map(card => (
                  <div key={card.title} className={`kcard${card.active ? " kcard-active" : ""}${card.done ? " kcard-done" : ""}`}>
                    <div className="kcard-top">
                      <span className="kcard-tag" style={{ color: card.tagColor, background: card.tagBg }}>{card.tag}</span>
                      {card.priority && (
                        <span className="kcard-priority" style={{ color: PRIORITY_COLORS[card.priority] }}>
                          {card.priority === "urgent" ? "●" : "◉"} {card.priority}
                        </span>
                      )}
                    </div>
                    <p className="kcard-title">{card.title}</p>
                    {card.due && (
                      <div className="kcard-meta">
                        <span className="kcard-due">Due {card.due}</span>
                        <div className="kcard-avatars">
                          {["A","B"].map(a => <div key={a} className="kcard-av">{a}</div>)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <button className="kanban-add-btn">+ Add task</button>
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

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div className="pf">

      {/* ── NAV ──────────────────────────────────────────────────────────────── */}
      <header className={`pf-nav${scrolled ? " pf-nav-scrolled" : ""}`}>
        <div className="pf-nav-inner">
          <a href="/" className="pf-logo">
            <div className="pf-logo-mark">{Icon.grid}</div>
            <span className="pf-logo-name">ProjectFlow</span>
          </a>

          <nav className="pf-nav-links">
            {NAV_LINKS.map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} className="pf-nav-link">{l}</a>
            ))}
          </nav>

          <div className="pf-nav-actions">
            <Link to="/signin" className="pf-nav-signin hide-mobile">Sign in</Link>
            <Link to="/signup" className="pf-btn-primary pf-btn-sm">Get Started Free</Link>
          </div>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="pf-hero">
        <div className="pf-hero-inner">

          {/* Left: Copy */}
          <div className="hero-copy">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              Now with AI-powered task automation
            </div>

            <h1 className="hero-h1">
              One platform for <span className="hero-h1-accent">every team</span>
              {" "}you serve
            </h1>

            <p className="hero-sub">
              Orchestrate clients, workspaces, and teams with enterprise-grade isolation,
              real-time collaboration, and analytics that stakeholders actually understand.
            </p>

            <div className="hero-actions">
              <Link to="/signup" className="pf-btn-primary pf-btn-lg">
                Start for Free
                {Icon.arrow}
              </Link>
              <a href="#demo" className="pf-btn-ghost pf-btn-lg">
                {Icon.play}
                Watch Demo
              </a>
            </div>

            {/* Inline stats strip */}
            <div className="hero-stats">
              {STATS.map(s => (
                <div key={s.label} className="hero-stat">
                  <div className="hero-stat-value">{s.value}</div>
                  <div className="hero-stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="hero-trust">
              <div className="hero-avatars">
                {["#6C53B3","#3B82F6","#059669","#DC2626","#F59E0B"].map((c, i) => (
                  <div key={i} className="hero-av" style={{ background: c }}>{String.fromCharCode(65 + i)}</div>
                ))}
              </div>
              <span className="hero-trust-text">
                Trusted by <strong>3,000+ teams</strong> across 180 countries
              </span>
            </div>
          </div>

          {/* Right: App Preview */}
          <div className="hero-visual">
            <div className="hero-visual-glow" />
            <AppPreview />
          </div>

        </div>
      </section>

      {/* ── COMPANY LOGOS ────────────────────────────────────────────────────── */}
      <div className="pf-logos-strip">
        <p className="logos-label">Trusted by teams at</p>
        <div className="logos-row">
          {COMPANIES.map(name => (
            <div key={name} className="logo-item">{name}</div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
      <section id="features" className="pf-section">
        <div className="pf-inner">
          <div className="section-head">
            <div className="section-eyebrow">Platform capabilities</div>
            <h2 className="section-title">Built for enterprise scale, designed for daily use</h2>
            <p className="section-sub">
              Every feature in ProjectFlow is purpose-built for teams managing multiple clients,
              workspaces, and stakeholders simultaneously.
            </p>
          </div>

          <div className="features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon" style={{ background: f.bg, color: f.color }}>
                  {f.icon}
                </div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCT CALLOUT ──────────────────────────────────────────────────── */}
      <section className="pf-callout">
        <div className="pf-inner">
          <div className="callout-inner">
            <div className="callout-copy">
              <div className="section-eyebrow" style={{ color: "#fff", opacity: 0.7 }}>Workspace management</div>
              <h2 className="callout-title">Every client in their own secure workspace</h2>
              <p className="callout-sub">
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
                  <li key={item} className="callout-list-item">
                    <span className="callout-check">{Icon.check}</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="pf-btn-white pf-btn-lg">Start for Free {Icon.arrow}</Link>
            </div>

            <div className="callout-visual">
              <div className="tenant-cards">
                {[
                  { abbr: "AC", name: "Acme Corp",  status: "Active", projects: 12, color: "#6C53B3" },
                  { abbr: "GL", name: "GreenLeaf",  status: "Active", projects: 8,  color: "#059669" },
                  { abbr: "VX", name: "Voltex Inc", status: "Active", projects: 5,  color: "#3B82F6" },
                  { abbr: "NX", name: "Nexora",     status: "Trial",  projects: 2,  color: "#F59E0B" },
                ].map(t => (
                  <div key={t.name} className="tenant-card">
                    <div className="tenant-card-icon" style={{ background: t.color + "20", color: t.color }}>
                      {t.abbr}
                    </div>
                    <div className="tenant-card-body">
                      <div className="tenant-card-name">{t.name}</div>
                      <div className="tenant-card-meta">{t.projects} projects · {t.status}</div>
                    </div>
                    <div className={`tenant-status-dot ${t.status === "Active" ? "active" : "trial"}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────────── */}
      <section id="pricing" className="pf-section">
        <div className="pf-inner">
          <div className="section-head">
            <div className="section-eyebrow">Pricing</div>
            <h2 className="section-title">Simple, honest pricing</h2>
            <p className="section-sub">
              Per workspace, not per seat. Scale without watching a meter spin.
            </p>
          </div>

          <div className="plans-grid">
            {PLANS.map(plan => (
              <div key={plan.name} className={`plan-card${plan.featured ? " plan-featured" : ""}`}>
                {plan.featured && <div className="plan-badge">Most Popular</div>}
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
                      <span className={`plan-check${plan.featured ? " plan-check-featured" : ""}`}>{Icon.check}</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className={`plan-cta${plan.featured ? " plan-cta-featured" : ""}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="plans-note">
            All plans include a 14-day free trial. No credit card required to start.
          </p>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────────── */}
      <section className="pf-testimonials">
        <div className="pf-inner">
          <div className="section-head section-head-center">
            <div className="stars-row">{"★★★★★"}</div>
            <h2 className="section-title">Loved by teams worldwide</h2>
          </div>

          <div className="testimonials-grid">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="testimonial-card">
                <div className="testimonial-stars">{"★★★★★"}</div>
                <p className="testimonial-quote">"{t.quote}"</p>
                <div className="testimonial-person">
                  <div className="testimonial-av" style={{ background: t.color + "22", color: t.color, border: `1.5px solid ${t.color}44` }}>
                    {t.initials}
                  </div>
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
      <section className="pf-cta">
        <div className="pf-inner">
          <div className="cta-card">
            <div className="cta-eyebrow">Get started today</div>
            <h2 className="cta-title">Your team deserves a better workflow.</h2>
            <p className="cta-sub">
              Join 3,000+ teams already shipping faster with ProjectFlow.
              No credit card required.
            </p>
            <div className="cta-actions">
              <Link to="/signup" className="pf-btn-white pf-btn-lg">Start for Free {Icon.arrow}</Link>
              <a href="#demo" className="cta-link">Schedule a demo →</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <footer className="pf-footer">
        <div className="pf-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <a href="/" className="pf-logo footer-logo">
                <div className="pf-logo-mark">{Icon.grid}</div>
                <span className="pf-logo-name">ProjectFlow</span>
              </a>
              <p className="footer-desc">
                The multi-tenant project workspace for teams that need clean delivery,
                secure collaboration, and reporting everyone understands.
              </p>
              <a href="mailto:hello@projectflow.io" className="footer-email">
                hello@projectflow.io
              </a>
            </div>

            <div className="footer-links">
              {[
                { title: "Product",   links: ["Features", "Pricing", "Integrations", "Security", "Changelog"] },
                { title: "Company",   links: ["About", "Blog", "Careers", "Partners", "Press"] },
                { title: "Resources", links: ["Docs", "API Reference", "Help Center", "Status", "Community"] },
              ].map(group => (
                <div key={group.title} className="footer-group">
                  <div className="footer-group-title">{group.title}</div>
                  {group.links.map(l => (
                    <a key={l} href={`#${l.toLowerCase().replace(" ", "-")}`} className="footer-link">{l}</a>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="footer-bottom">
            <div className="footer-copy">
              © {new Date().getFullYear()} ProjectFlow Inc. All rights reserved.
            </div>
            <div className="footer-bottom-links">
              {["Privacy Policy", "Terms of Service", "Status", "Security"].map(l => (
                <a key={l} href="#" className="footer-bottom-link">{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}