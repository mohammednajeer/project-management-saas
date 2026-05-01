import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  Check,
  KanbanSquare,
  Link2,
  Lock,
  Mail,
  Play,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import "./Homepage.css";

const tenants = ["Acme Corp", "GreenLeaf", "Voltex", "Nexora", "Bluefield", "Orion Co"];

const stats = [
  { value: "3K+", label: "Active Tenants" },
  { value: "50M+", label: "Tasks Completed" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "180+", label: "Countries" },
];

const ratings = [
  {
    quote: "ProjectFlow cut our project delivery time by 40%. The Kanban boards and role management are exactly what we needed.",
    author: "Sarah Chen",
    role: "CTO at Streamline",
    initials: "SC",
  },
  {
    quote: "Finally a tool that doesn't feel bloated. Clean, fast, and our whole team adopted it in a week.",
    author: "Marcus Williams",
    role: "PM at Nexus Labs",
    initials: "MW",
  },
  {
    quote: "The multi-tenant workspace setup was seamless. Each client gets their own isolated space. Brilliant.",
    author: "Priya Nair",
    role: "Founder at Orbit AI",
    initials: "PN",
  },
];

const features = [
  {
    icon: Building2,
    title: "True Multi-Tenancy",
    desc: "Complete data isolation between workspaces. Each tenant gets custom branding, roles, and permissions.",
    tone: "blue",
  },
  {
    icon: Zap,
    title: "Real-time Collaboration",
    desc: "Live updates, clear ownership, and conflict-free teamwork for local or distributed teams.",
    tone: "green",
  },
  {
    icon: Bot,
    title: "AI Task Automation",
    desc: "Auto-assign tasks, estimate durations, detect blockers, and surface what needs attention.",
    tone: "amber",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    desc: "Beautiful dashboards for velocity, burndown, and team health that stakeholders can understand quickly.",
    tone: "violet",
  },
  {
    icon: Link2,
    title: "200+ Integrations",
    desc: "Connect Slack, GitHub, Jira, Figma, Notion, and the rest of the stack your team already uses.",
    tone: "cyan",
  },
  {
    icon: Lock,
    title: "Enterprise Security",
    desc: "SSO, SAML, SCIM provisioning, audit logs, and encryption controls for serious teams.",
    tone: "mint",
  },
];

const plans = [
  {
    name: "Starter",
    price: "$0",
    suffix: "/mo",
    desc: "Perfect to get started with up to 3 users.",
    features: ["3 team members", "5 active projects", "1 GB storage", "Basic boards and lists"],
    cta: "Start Free",
  },
  {
    name: "Pro",
    price: "$29",
    suffix: "/mo",
    desc: "For growing teams who need more power.",
    features: ["Unlimited members", "Unlimited projects", "50 GB storage", "AI automation included"],
    cta: "Start Free Trial",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "Dedicated infrastructure and compliance controls.",
    features: ["Custom tenants and SLA", "SSO / SAML / SCIM", "Unlimited storage and AI", "Dedicated success manager"],
    cta: "Contact Sales",
  },
];

const previewColumns = [
  {
    title: "Backlog",
    count: 4,
    cards: [
      { tag: "Design", title: "Redesign onboarding screens", date: "Nov 18", initials: ["A", "B"], tone: "blue" },
      { tag: "API", title: "Set up OAuth endpoints", date: "Nov 20", initials: ["C"], tone: "amber" },
    ],
  },
  {
    title: "In Progress",
    count: 3,
    cards: [
      { tag: "Frontend", title: "Build tenant switcher component", date: "Nov 22", initials: ["D", "E"], tone: "green" },
      { tag: "Core", title: "Multi-tenancy data isolation", date: "Nov 25", initials: ["F"], tone: "blue", active: true },
    ],
  },
  {
    title: "Done",
    count: 12,
    cards: [
      { tag: "Done", title: "Project schema design", date: "Nov 10", initials: ["A"], tone: "green", done: true },
      { tag: "Done", title: "CI/CD pipeline setup", date: "Nov 12", initials: ["G"], tone: "green", done: true },
    ],
  },
];

const footerGroups = [
  {
    title: "Product",
    links: ["Features", "Pricing", "Integrations", "Security"],
  },
  {
    title: "Company",
    links: ["About", "Blog", "Careers", "Partners"],
  },
  {
    title: "Resources",
    links: ["Docs", "API", "Help Center", "Status"],
  },
];

export default function Homepage() {
  return (
    <main className="home-page">
      <header className="home-nav">
        <div className="home-nav-inner">
          <a href="/" className="logo">
            <span className="logo-icon">
              <KanbanSquare size={18} />
            </span>
            <span>ProjectFlow</span>
          </a>

          <nav className="nav-links">
            <a className="nav-link" href="#features">Features</a>
            <a className="nav-link" href="#pricing">Pricing</a>
            <a className="nav-link" href="#docs">Docs</a>
            <a className="nav-link" href="#blog">Blog</a>
          </nav>

          <div className="nav-cta">
            <a className="btn-ghost" href="/signin">Sign In</a>
            <a className="btn-primary" href="/signup">Get Started Free</a>
          </div>
        </div>
      </header>

      <div className="hero">
        <div className="hero-badge">
          <span className="badge-dot" />
          <span>Now with AI-powered task automation</span>
        </div>

        <h1>
          Manage Projects Across
          <br />
          <em>Every Team & Tenant</em>
        </h1>

        <p className="hero-sub">
          One platform to orchestrate teams, workspaces, and clients with real-time collaboration,
          smart boards, and beautiful reporting built in.
        </p>

        <div className="hero-actions">
          <a className="btn-xl p" href="/signup">
            Start for Free - No card needed <ArrowRight size={18} />
          </a>
          <a className="btn-xl s" href="#demo">
            <Play size={17} /> Watch Demo
          </a>
        </div>

        <div className="hero-preview" id="demo">
          <div className="preview-wrap">
            <div className="preview-bar">
              <div className="pdots">
                <span className="pdot red" />
                <span className="pdot yellow" />
                <span className="pdot green" />
              </div>
              <div className="purl">app.projectflow.io/workspace/acme-corp</div>
            </div>

            <div className="preview-body">
              <aside className="psidebar">
                <div className="psidebar-logo">ProjectFlow</div>
                {["Dashboard", "Projects", "Tasks", "Team", "Reports"].map((item, index) => (
                  <div className={`psi ${index === 0 ? "a" : ""}`} key={item}>
                    <span className={`psi-dot tone-${index}`} />
                    {item}
                  </div>
                ))}

                <div className="tenant-mini">
                  <div className="tenant-mini-label">Tenants</div>
                  {["Acme Corp", "GreenLeaf Inc", "Voltex Labs"].map((tenant) => (
                    <div className="psi small" key={tenant}>{tenant}</div>
                  ))}
                </div>
              </aside>

              <section className="pmain">
                <div className="pmh">
                  <div className="pmh-title">Q4 Product Launch</div>
                  <div className="ppills">
                    <span className="pp blue">In Progress</span>
                    <span className="pp green">12 done</span>
                    <span className="pp amber">3 blocked</span>
                  </div>
                </div>

                <div className="kanban">
                  {previewColumns.map((column) => (
                    <div className="kcol" key={column.title}>
                      <div className="kch">{column.title} ({column.count})</div>
                      {column.cards.map((card) => (
                        <div className={`kcard ${card.active ? "active" : ""} ${card.done ? "done" : ""}`} key={card.title}>
                          <span className={`ktag ${card.tone}`}>{card.tag}</span>
                          <div className="ktitle">{card.title}</div>
                          <div className="kfoot">
                            <div className="kavs">
                              {card.initials.map((initial) => (
                                <span className={`kav ${card.tone}`} key={initial}>{initial}</span>
                              ))}
                            </div>
                            <div className="kdate">{card.date}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      <div className="tenant-strip reveal visible">
        <div className="tlabel">Trusted by 3,000+ teams worldwide</div>
        <div className="tlogos">
          {tenants.map((tenant) => (
            <div className="tlogo" key={tenant}>{tenant}</div>
          ))}
        </div>
      </div>

      <div className="stats-row reveal visible">
        {stats.map((stat) => (
          <div className="sitem" key={stat.label}>
            <div className="snum">{stat.value}</div>
            <div className="slbl">{stat.label}</div>
          </div>
        ))}
      </div>

      <div id="features" className="section reveal visible">
        <div className="slabel">Why ProjectFlow</div>
        <div className="stitle">Everything your team needs</div>
        <p className="ssub">
          Built from the ground up for multi-tenant SaaS with enterprise-grade isolation
          and a delightful daily workflow.
        </p>

        <div className="features-grid">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div className="fcard" key={feature.title}>
                <div className={`ficon ${feature.tone}`}>
                  <Icon size={22} />
                </div>
                <div className="ftitle">{feature.title}</div>
                <p className="fdesc">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div id="pricing" className="section reveal visible" style={{ paddingTop: 0 }}>
        <div className="slabel">Pricing</div>
        <div className="stitle">Simple, honest pricing</div>
        <p className="ssub">Pay per workspace. No per-seat tricks. Scale freely without watching a meter spin.</p>

        <div className="pricing-grid">
          {plans.map((plan) => (
            <div className={`pcard ${plan.featured ? "feat" : ""}`} key={plan.name}>
              {plan.featured && <div className="pbadge">Most Popular</div>}
              <div className="pname">{plan.name}</div>
              <div className="pprice">
                {plan.price}
                {plan.suffix && <span>{plan.suffix}</span>}
              </div>
              <p className="pdesc">{plan.desc}</p>
              <div className="pdiv" />
              {plan.features.map((item) => (
                <div className="pfeat" key={item}>
                  <Check size={14} />
                  <span>{item}</span>
                </div>
              ))}
              <a className={plan.name === "Enterprise" ? "plan-secondary" : "form-submit"} href="/signup">
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>

      <section className="ratings-section reveal visible" aria-labelledby="ratings-title">
        <div className="ratings-heading">
          <div className="stars rating-main-stars" aria-label="5 out of 5 stars">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star size={18} fill="currentColor" key={index} />
            ))}
          </div>
          <h2 className="ratings-title" id="ratings-title">Loved by thousands of teams</h2>
        </div>

        <div className="ratings-grid">
          {ratings.map((rating) => (
            <article className="rating-card" key={rating.author}>
              <div className="stars rating-card-stars" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star size={13} fill="currentColor" key={index} />
                ))}
              </div>
              <p className="rating-quote">{rating.quote}</p>
              <div className="rating-person">
                <div className="rating-avatar">{rating.initials}</div>
                <div>
                  <span>{rating.author}</span>
                  <small>{rating.role}</small>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="cta-section reveal visible">
        <Sparkles size={26} className="cta-spark" />
        <div className="cta-title">Your team deserves better tools.</div>
        <p className="cta-sub">Join 3,000+ teams already shipping faster with ProjectFlow.</p>
        <a className="cta-btn" href="/signup">Get Started - It is Free</a>
      </div>

      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <a href="/" className="logo">
              <span className="logo-icon">
                <KanbanSquare size={18} />
              </span>
              <span>ProjectFlow</span>
            </a>
            <p>
              The multi-tenant project workspace for teams that need clean delivery,
              secure collaboration, and reporting everyone can read.
            </p>
            <a className="footer-contact" href="mailto:hello@projectflow.io">
              <Mail size={15} />
              hello@projectflow.io
            </a>
          </div>

          <div className="footer-links-grid">
            {footerGroups.map((group) => (
              <div className="footer-group" key={group.title}>
                <div className="footer-group-title">{group.title}</div>
                {group.links.map((link) => (
                  <a className="flink" href={`#${link.toLowerCase().replaceAll(" ", "-")}`} key={link}>
                    {link}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="footer-bottom">
          <div className="fcopy">(c) {new Date().getFullYear()} ProjectFlow Inc. All rights reserved.</div>
          <div className="flinks">
            <a className="flink" href="#privacy">Privacy</a>
            <a className="flink" href="#terms">Terms</a>
            <a className="flink" href="#status">Status</a>
            <a className="flink" href="#help">Help</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
