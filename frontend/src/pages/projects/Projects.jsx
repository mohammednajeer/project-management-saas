import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  SlidersHorizontal,
  Calendar,
  Layers,
  FolderKanban,
  Zap,
  CheckCircle2,
  ListChecks,
  ArrowUpRight,
} from "lucide-react";
import api from "../../services/api";
import "./Projects.css";
import CreateProjectModal from "./CreateProjectModal";
import { Link } from "react-router-dom";
import { getHealthStyle, formatDueDate, formatStatusLabel } from "./projectUtils";

const STATUS_STYLES = {
  "In Progress": { bg: "#dbeafe", color: "#1d4ed8" },
  Review: { bg: "#ede9fe", color: "#6d28d9" },
  Backlog: { bg: "#f1f5f9", color: "#64748b" },
  Done: { bg: "#dcfce7", color: "#15803d" },
};

const PRIORITY_STYLES = {
  Critical: { bg: "#fee2e2", color: "#b91c1c" },
  High: { bg: "#ffedd5", color: "#c2410c" },
  Medium: { bg: "#dbeafe", color: "#1d4ed8" },
  Low: { bg: "#f1f5f9", color: "#64748b" },
};

const PROGRESS_COLORS = {
  "In Progress": "#3b82f6",
  Review: "#8b5cf6",
  Done: "#22c55e",
  Backlog: "#94a3b8",
};

const AVATAR_COLORS = [
  "#6354c4",
  "#3b82f6",
  "#f97316",
  "#22c55e",
  "#06b6d4",
  "#ef4444",
  "#8b5cf6",
  "#f59e0b",
];

const FILTERS = ["All", "In Progress", "Review", "Backlog", "Done"];

const KPI_CONFIG = [
  { key: "total", label: "Total Projects", icon: FolderKanban, from: "#6354c4", to: "#9b7ff4" },
  { key: "active", label: "Active Projects", icon: Zap, from: "#3b82f6", to: "#60a5fa" },
  { key: "completed", label: "Completed Projects", icon: CheckCircle2, from: "#22c55e", to: "#4ade80" },
  { key: "tasks", label: "Total Tasks", icon: ListChecks, from: "#f97316", to: "#fb923c" },
];

function avatarColor(seed = "") {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function memberInitials(member) {
  if (member.initials) return member.initials;
  const parts = (member.name || "?").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.[0] || "?").toUpperCase();
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await api.get("/projects/");
      setProjects(res.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilter === "All" || p.status === activeFilter;
    return matchSearch && matchFilter;
  });

  const kpis = useMemo(() => {
    const activeCount = projects.filter((p) => p.status === "active").length;
    const completedCount = projects.filter((p) => p.status === "completed").length;
    const totalTasks = projects.reduce((a, p) => a + (p.total_tasks || 0), 0);
    return {
      total: projects.length,
      active: activeCount,
      completed: completedCount,
      tasks: totalTasks,
    };
  }, [projects]);

  return (
    <div className="projects-page">
      <header className="projects-header">
        <div className="projects-header-left">
          <div className="projects-eyebrow">
            <span className="projects-eyebrow-dot" />
            Workspace
          </div>
          <h1 className="projects-title">Projects</h1>
          <p className="projects-subtitle">
            {projects.length} project{projects.length !== 1 ? "s" : ""} across your workspace
          </p>
        </div>
        <button type="button" className="projects-create-btn" onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          New Project
        </button>
      </header>

      <section className="projects-kpi-grid" aria-label="Project statistics">
        {KPI_CONFIG.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <article key={kpi.key} className="projects-kpi-card">
              <div
                className="projects-kpi-icon"
                style={{ background: `linear-gradient(135deg, ${kpi.from}, ${kpi.to})` }}
              >
                <Icon size={20} color="#fff" strokeWidth={2.25} />
              </div>
              <div className="projects-kpi-body">
                <span className="projects-kpi-value">{loading ? "—" : kpis[kpi.key]}</span>
                <span className="projects-kpi-label">{kpi.label}</span>
              </div>
            </article>
          );
        })}
      </section>

      <div className="projects-toolbar">
        <div className="projects-search-wrap">
          <Search size={15} className="search-icon" />
          <input
            className="projects-search"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="toolbar-divider" />
        <div className="projects-filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`filter-btn ${activeFilter === f ? "filter-btn--active" : ""}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
          <button type="button" className="filter-icon-btn" aria-label="Filters">
            <SlidersHorizontal size={15} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="projects-loading">
          <div className="loading-spinner" />
          Loading projects...
        </div>
      ) : filtered.length === 0 ? (
        <div className="projects-empty">
          <div className="projects-empty-icon">
            <Layers size={28} />
          </div>
          <h3>No projects found</h3>
          <p>Try a different filter or create your first project</p>
          <button type="button" className="projects-create-btn" onClick={() => setModalOpen(true)}>
            <Plus size={15} />
            Create Project
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {filtered.map((project, index) => {
            const total = project.total_tasks || 0;
            const done = project.completed_tasks || 0;
            const pct = total ? Math.round((done / total) * 100) : 0;
            const statusStyle = STATUS_STYLES[project.status] || STATUS_STYLES.Backlog;
            const priorityStyle = PRIORITY_STYLES[project.priority] || PRIORITY_STYLES.Low;
            const barColor = PROGRESS_COLORS[project.status] || "#94a3b8";
            const members = project.members_data || [];
            const dueLabel = formatDueDate(project.due_date);
            const healthStyle = getHealthStyle(project.health);
            const lead = project.project_lead_data;

            return (
              <article
                key={project.id}
                className="project-card"
                style={{ animationDelay: `${Math.min(index, 8) * 0.05}s` }}
              >
                <div className="card-head">
                  <div className="card-icon-wrap">
                    <FolderKanban size={20} strokeWidth={2} />
                  </div>
                  <div className="card-badges">
                    <span
                      className="card-health"
                      style={{ background: healthStyle.bg, color: healthStyle.color }}
                    >
                      {project.health_label || healthStyle.label}
                    </span>
                    <span
                      className="card-status"
                      style={{ background: statusStyle.bg, color: statusStyle.color }}
                    >
                      {formatStatusLabel(project.status)}
                    </span>
                    {project.priority && (
                      <span
                        className="card-priority-tag"
                        style={{ background: priorityStyle.bg, color: priorityStyle.color }}
                      >
                        {project.priority}
                      </span>
                    )}
                  </div>
                </div>

                <div className="card-title-block">
                  <h3 className="card-name">{project.name}</h3>
                  <p className="card-desc">{project.description || "No description provided."}</p>
                  {lead && (
                    <div className="card-lead">
                      <span className="card-lead-label">Lead</span>
                      <span
                        className="card-lead-avatar"
                        style={{
                          background: `linear-gradient(135deg, ${avatarColor(lead.name)}, ${avatarColor(`${lead.name}2`)})`,
                        }}
                      >
                        {lead.initials || memberInitials(lead)}
                      </span>
                      <span className="card-lead-name">{lead.name}</span>
                    </div>
                  )}
                </div>

                <div className="card-progress-section">
                  <div className="card-progress-ring-wrap">
                    <svg className="card-progress-ring" viewBox="0 0 44 44" aria-hidden>
                      <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(99,84,196,0.1)" strokeWidth="4" />
                      <circle
                        cx="22"
                        cy="22"
                        r="18"
                        fill="none"
                        stroke={barColor}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 18}`}
                        strokeDashoffset={`${2 * Math.PI * 18 * (1 - pct / 100)}`}
                        transform="rotate(-90 22 22)"
                      />
                    </svg>
                    <span className="card-progress-ring-val" style={{ color: barColor }}>
                      {pct}%
                    </span>
                  </div>
                  <div className="card-progress-details">
                    <div className="card-progress-label">
                      <span>Progress</span>
                      <span className="card-tasks-frac">
                        {done}/{total} tasks
                      </span>
                    </div>
                    <div className="card-progress-track">
                      <div
                        className="card-progress-bar"
                        style={{ width: `${pct}%`, background: barColor }}
                      />
                    </div>
                  </div>
                </div>

                <div className="card-meta">
                  <div className="card-avatars">
                    <div className="card-avatar-stack">
                      {members.slice(0, 4).map((m, i) => (
                        <div
                          key={m.id ?? i}
                          className="avatar"
                          style={{
                            zIndex: 10 - i,
                            background: `linear-gradient(135deg, ${avatarColor(m.name)}, ${avatarColor(`${m.name}2`)})`,
                          }}
                          title={m.name}
                        >
                          {memberInitials(m)}
                        </div>
                      ))}
                      {members.length > 4 && (
                        <div className="avatar avatar--more">+{members.length - 4}</div>
                      )}
                    </div>
                    <span className="card-member-count">
                      {members.length} {members.length === 1 ? "member" : "members"}
                    </span>
                  </div>
                  {dueLabel && (
                    <div className="card-due">
                      <Calendar size={12} />
                      {dueLabel}
                    </div>
                  )}
                </div>

                <div className="card-footer">
                  <Link to={`/dashboard/projects/${project.id}`} className="card-open-link">
                    Open project
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <CreateProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchProjects}
      />
    </div>
  );
}
