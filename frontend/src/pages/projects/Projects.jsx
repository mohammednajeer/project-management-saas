import { useEffect, useState } from "react";
import { Plus, Search, SlidersHorizontal, Calendar, Layers, TrendingUp } from "lucide-react";
import api from "../../services/api";
import "./Projects.css";
import CreateProjectModal from "./CreateProjectModal";
import { Link } from "react-router-dom";

const STATUS_STYLES = {
  "In Progress": { bg: "var(--status-progress-bg)", color: "var(--status-progress-c)" },
  "Review":      { bg: "var(--status-review-bg)",   color: "var(--status-review-c)"   },
  "Backlog":     { bg: "var(--status-backlog-bg)",   color: "var(--status-backlog-c)"  },
  "Done":        { bg: "var(--status-done-bg)",      color: "var(--status-done-c)"     },
};

const PRIORITY_STYLES = {
  Critical: { bg: "var(--priority-critical-bg)", color: "var(--priority-critical-c)" },
  High:     { bg: "var(--priority-high-bg)",     color: "var(--priority-high-c)"     },
  Medium:   { bg: "var(--priority-medium-bg)",   color: "var(--priority-medium-c)"   },
  Low:      { bg: "var(--priority-low-bg)",       color: "var(--priority-low-c)"      },
};

const PROGRESS_COLORS = {
  "In Progress": "#60A5FA",
  "Review":      "#A78BFA",
  "Done":        "#4ADE80",
  "Backlog":     "#6B7280",
};

const FILTERS = ["All", "In Progress", "Review", "Backlog", "Done"];

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

  useEffect(() => { fetchProjects(); }, []);

  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = activeFilter === "All" || p.status === activeFilter;
    return matchSearch && matchFilter;
  });

  /* Stats */
  const inProgressCount = projects.filter(p => p.status === "In Progress").length;
  const doneCount       = projects.filter(p => p.status === "Done").length;
  const totalTasks      = projects.reduce((a, p) => a + (p.total_tasks || 0), 0);

  return (
    <div className="projects-page">

      {/* ── HEADER ── */}
      <div className="projects-header">
        <div className="projects-header-left">
          <div className="projects-eyebrow">
            <span className="projects-eyebrow-dot" />
            Workspace
          </div>
          <h1 className="projects-title">Projects</h1>
          <p className="projects-subtitle">{projects.length} projects across your workspace</p>
        </div>
        <button className="projects-create-btn" onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* ── STATS BAR ── */}
      <div className="projects-stats-bar">
        <div className="stat-item">
          <div className="stat-item-value">{projects.length}</div>
          <div className="stat-item-label">Total Projects</div>
        </div>
        <div className="stat-item">
          <div className="stat-item-value">{inProgressCount}</div>
          <div className="stat-item-label">In Progress</div>
        </div>
        <div className="stat-item">
          <div className="stat-item-value">{doneCount}</div>
          <div className="stat-item-label">Completed</div>
        </div>
        <div className="stat-item">
          <div className="stat-item-value">{totalTasks}</div>
          <div className="stat-item-label">Total Tasks</div>
        </div>
      </div>

      {/* ── TOOLBAR ── */}
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
              className={`filter-btn ${activeFilter === f ? "filter-btn--active" : ""}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
          <button className="filter-icon-btn">
            <SlidersHorizontal size={15} />
          </button>
        </div>
      </div>

      {/* ── CONTENT ── */}
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
          <button className="projects-create-btn" onClick={() => setModalOpen(true)}>
            <Plus size={15} />
            Create Project
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {filtered.map((project) => {
            const total   = project.total_tasks || 0;
            const done    = project.completed_tasks || 0;
            const pct     = total ? Math.round((done / total) * 100) : 0;
            const statusStyle   = STATUS_STYLES[project.status]   || STATUS_STYLES["Backlog"];
            const priorityStyle = PRIORITY_STYLES[project.priority] || PRIORITY_STYLES["Low"];
            const barColor      = PROGRESS_COLORS[project.status] || "#6B7280";
            const members       = project.members_data || [];

            return (
              <div key={project.id} className="project-card">

                {/* Top */}
                <div className="card-top">
                  <div className="card-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <div className="card-title-group">
                    <h3 className="card-name">{project.name}</h3>
                    <span
                      className="card-status"
                      style={{ background: statusStyle.bg, color: statusStyle.color }}
                    >
                      {project.status}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="card-desc">{project.description || "No description provided."}</p>

                {/* Progress */}
                <div className="card-progress-section">
                  <div className="card-progress-label">
                    <span>Progress</span>
                    <span>
                      <span className="card-tasks-frac">{done}/{total} tasks</span>
                      {" "}
                      <span className="card-pct" style={{ color: barColor }}>{pct}%</span>
                    </span>
                  </div>
                  <div className="card-progress-track">
                    <div
                      className="card-progress-bar"
                      style={{ width: `${pct}%`, background: barColor, color: barColor }}
                    />
                  </div>
                </div>

                {/* Meta */}
                <div className="card-meta">
                  <div className="card-avatars">
                    {members.slice(0, 4).map((m, i) => (
                      <div key={i} className="avatar" style={{ zIndex: 10 - i }}>
                        {m.initials || m.name?.charAt(0) || "?"}
                      </div>
                    ))}
                    {members.length > 4 && (
                      <div className="avatar avatar--more">+{members.length - 4}</div>
                    )}
                    <span className="card-member-count">
                      {members.length} {members.length === 1 ? "member" : "members"}
                    </span>
                  </div>
                  {project.due_date && (
                    <div className="card-due">
                      <Calendar size={11} />
                      {project.due_date}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="card-footer">
                  {project.priority && (
                    <span
                      className="card-priority"
                      style={{ background: priorityStyle.bg, color: priorityStyle.color }}
                    >
                      {project.priority}
                    </span>
                  )}
                  <Link to={`/dashboard/projects/${project.id}`} className="card-open-link">
                    Open project →
                  </Link>
                </div>
              </div>
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