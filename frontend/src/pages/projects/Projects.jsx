import { useEffect, useState } from "react";
import { Plus, Search, SlidersHorizontal, Calendar, Users } from "lucide-react";
import api from "../../services/api";
import "./Projects.css";

const STATUS_COLORS = {
  "In Progress": { bg: "#eff6ff", color: "#2563eb" },
  "Review":      { bg: "#f5f3ff", color: "#7c3aed" },
  "Backlog":     { bg: "#f3f4f6", color: "#6b7280" },
  "Done":        { bg: "#f0fdf4", color: "#16a34a" },
};

const PRIORITY_COLORS = {
  Critical: { bg: "#fef2f2", color: "#dc2626" },
  High:     { bg: "#fffbeb", color: "#d97706" },
  Medium:   { bg: "#eff6ff", color: "#2563eb" },
  Low:      { bg: "#f3f4f6", color: "#6b7280" },
};

const PROGRESS_COLORS = {
  "In Progress": "#3b82f6",
  "Review":      "#8b5cf6",
  "Done":        "#22c55e",
  "Backlog":     "#9ca3af",
};

const FILTERS = ["All", "In Progress", "Review", "Backlog", "Done"];

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

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

  return (
    <div className="projects-page">
      {/* Header */}
      <div className="projects-header">
        <div>
          <h1 className="projects-title">Projects</h1>
          <p className="projects-subtitle">{projects.length} projects in your workspace</p>
        </div>
        <button className="projects-create-btn">
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* Search + Filter Bar */}
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

      {/* Content */}
      {loading ? (
        <p className="projects-loading">Loading projects...</p>
      ) : filtered.length === 0 ? (
        <div className="projects-empty">
          <h3>No projects found</h3>
          <p>Try a different filter or create a new project</p>
        </div>
      ) : (
        <div className="projects-grid">
          {filtered.map((project) => {
            const total = project.total_tasks || 0;
            const done  = project.completed_tasks || 0;
            const pct   = total ? Math.round((done / total) * 100) : 0;
            const statusStyle  = STATUS_COLORS[project.status]  || STATUS_COLORS["Backlog"];
            const priorityStyle = PRIORITY_COLORS[project.priority] || PRIORITY_COLORS["Low"];
            const barColor = PROGRESS_COLORS[project.status] || "#3b82f6";
            const members  = project.members || [];

            return (
              <div key={project.id} className="project-card">
                {/* Top row */}
                <div className="card-top">
                  <div className="card-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <div className="card-title-group">
                    <h3 className="card-name">{project.name}</h3>
                    <span className="card-status" style={{ background: statusStyle.bg, color: statusStyle.color }}>
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
                      <span className="card-tasks-frac">{done}/{total} tasks</span>{" "}
                      <span className="card-pct" style={{ color: barColor }}>{pct}%</span>
                    </span>
                  </div>
                  <div className="card-progress-track">
                    <div
                      className="card-progress-bar"
                      style={{ width: `${pct}%`, background: barColor }}
                    />
                  </div>
                </div>

                {/* Members + Due date */}
                <div className="card-meta">
                  <div className="card-avatars">
                    {members.slice(0, 3).map((m, i) => (
                      <div key={i} className="avatar" style={{ zIndex: 10 - i }}>
                        {m.initials || m.name?.charAt(0) || "?"}
                      </div>
                    ))}
                    {members.length > 3 && (
                      <div className="avatar avatar--more">+{members.length - 3}</div>
                    )}
                    <span className="card-member-count">
                      {members.length} {members.length === 1 ? "member" : "members"}
                    </span>
                  </div>
                  {project.due_date && (
                    <div className="card-due">
                      <Calendar size={13} />
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
                  <a href={`/projects/${project.id}`} className="card-open-link">
                    Open project ↗
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}