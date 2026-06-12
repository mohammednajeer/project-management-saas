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
  LayoutGrid,
  List,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "./Projects.css";
import CreateProjectModal from "./CreateProjectModal";
import { Link } from "react-router-dom";
import { getHealthStyle, formatDueDate, formatStatusLabel } from "./projectUtils";
import processIllustration from "../../assets/images/undraw_process_0wew.svg";
import emptyIllustration from "../../assets/images/undraw_teamwork_zplp.svg";

const STATUS_STYLES = {
  "In Progress": { bg: "rgba(91, 140, 184, 0.12)", color: "#5B8CB8" },
  Review: { bg: "rgba(139, 123, 168, 0.12)", color: "#8B7BA8" },
  Backlog: { bg: "rgba(119, 123, 134, 0.12)", color: "#777b86" },
  Done: { bg: "rgba(61, 154, 95, 0.12)", color: "#3D9A5F" },
};

const PRIORITY_STYLES = {
  Critical: { bg: "rgba(201, 100, 66, 0.12)", color: "#C96442" },
  High: { bg: "rgba(212, 131, 94, 0.12)", color: "#D4835E" },
  Medium: { bg: "rgba(91, 140, 184, 0.12)", color: "#5B8CB8" },
  Low: { bg: "rgba(119, 123, 134, 0.12)", color: "#777b86" },
};

const PROGRESS_COLORS = {
  "In Progress": "#5B8CB8",
  Review: "#8B7BA8",
  Done: "#3D9A5F",
  Backlog: "#777b86",
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
  { key: "active", label: "Active Projects", icon: Zap, from: "#5B8CB8", to: "#a8c8f8" },
  { key: "completed", label: "Completed Projects", icon: CheckCircle2, from: "#3D9A5F", to: "#a3dfb2" },
  { key: "tasks", label: "Total Tasks", icon: ListChecks, from: "#D4835E", to: "#fbe1d1" },
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
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState("grid");

  const projectBasePath = user?.role === "employee" ? "/workspace/projects" : "/dashboard/projects";

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [allProjects, setAllProjects] = useState([]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await api.get("/projects/", {
        params: {
          page: page,
          status: activeFilter,
          search: search,
        }
      });
      const data = res.data;
      if (data && data.results !== undefined) {
        setProjects(data.results);
        setTotalCount(data.count);
        setTotalPages(Math.ceil(data.count / 10));
      } else {
        setProjects(data);
        setTotalCount(data.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProjectsForKPIs = async () => {
    try {
      const res = await api.get("/projects/?pagination=false");
      setAllProjects(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [page, search, activeFilter]);

  useEffect(() => {
    fetchAllProjectsForKPIs();
  }, [projects]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    setPage(1);
  };

  const filtered = projects;

  const kpis = useMemo(() => {
    const activeCount = allProjects.filter((p) => p.status === "In Progress" || p.status === "active").length;
    const completedCount = allProjects.filter((p) => p.status === "Done" || p.status === "completed").length;
    const totalTasks = allProjects.reduce((a, p) => a + (p.total_tasks || 0), 0);
    return {
      total: allProjects.length,
      active: activeCount,
      completed: completedCount,
      tasks: totalTasks,
    };
  }, [allProjects]);

  return (
    <div className="projects-page">
      <section className="projects-hero">
        <div className="projects-hero-left">
          <div className="projects-eyebrow">
            <span className="projects-eyebrow-dot" />
            Project Hub
          </div>
          <h1 className="projects-title">Workspace Projects</h1>
          <p className="projects-subtitle">
            Manage, track, and collaborate on your team's initiatives. Organize tasks, monitor project health, and coordinate milestones in real time.
          </p>
          {user?.role !== "employee" && (
            <button type="button" className="projects-create-btn" onClick={() => setModalOpen(true)}>
              <Plus size={16} />
              Create Project
            </button>
          )}
        </div>
        <div className="projects-hero-illustration">
          <img src={processIllustration} alt="Project Process" />
        </div>
      </section>

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
            onChange={handleSearchChange}
          />
        </div>
        <div className="toolbar-divider" />
        <div className="projects-filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`filter-btn ${activeFilter === f ? "filter-btn--active" : ""}`}
              onClick={() => handleFilterChange(f)}
            >
              {f}
            </button>
          ))}
          <button type="button" className="filter-icon-btn" aria-label="Filters">
            <SlidersHorizontal size={15} />
          </button>
        </div>

        <div className="toolbar-divider" />
        <div className="projects-view-toggle">
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
            title="Grid View"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
            onClick={() => setViewMode("list")}
            title="List View"
          >
            <List size={15} />
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
          <img src={emptyIllustration} alt="No projects" className="projects-empty-img" />
          <h3>No projects found</h3>
          <p>Try a different filter or create your first project</p>
          {user?.role !== "employee" && (
            <button type="button" className="projects-create-btn" onClick={() => setModalOpen(true)}>
              <Plus size={15} />
              Create Project
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
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
                    {project.project_lead_data?.id === user?.id && (
                      <span className="card-lead-badge" style={{
                        background: "linear-gradient(135deg, #4f46e5, #3b82f6)",
                        color: "#fff",
                        fontSize: "10px",
                        fontWeight: "600",
                        padding: "2px 8px",
                        borderRadius: "20px",
                        boxShadow: "0 2px 4px rgba(79, 70, 229, 0.2)"
                      }}>
                        Project Lead
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
                  <Link to={`${projectBasePath}/${project.id}`} className="card-open-link">
                    Open project
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="projects-list-wrap">
          <table className="projects-list-table">
            <thead>
              <tr>
                <th>Project Details</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Health</th>
                <th>Progress</th>
                <th>Project Lead</th>
                <th>Team Members</th>
                <th>Due Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => {
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
                  <tr key={project.id} className="project-list-row">
                    <td className="project-td-name">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Link to={`${projectBasePath}/${project.id}`} className="project-link-title">
                          {project.name}
                        </Link>
                        {project.project_lead_data?.id === user?.id && (
                          <span className="project-lead-badge-table" style={{
                            background: "linear-gradient(135deg, #4f46e5, #3b82f6)",
                            color: "#fff",
                            fontSize: "10px",
                            fontWeight: "600",
                            padding: "2px 6px",
                            borderRadius: "20px"
                          }}>
                            Lead
                          </span>
                        )}
                      </div>
                      <p className="project-list-desc" title={project.description}>
                        {project.description || "No description provided."}
                      </p>
                    </td>
                    <td>
                      <span
                        className="card-status"
                        style={{ background: statusStyle.bg, color: statusStyle.color }}
                      >
                        {formatStatusLabel(project.status)}
                      </span>
                    </td>
                    <td>
                      {project.priority ? (
                        <span
                          className="card-priority-tag"
                          style={{ background: priorityStyle.bg, color: priorityStyle.color }}
                        >
                          {project.priority}
                        </span>
                      ) : (
                        <span className="empty-dash">—</span>
                      )}
                    </td>
                    <td>
                      <span
                        className="card-health"
                        style={{ background: healthStyle.bg, color: healthStyle.color }}
                      >
                        {project.health_label || healthStyle.label}
                      </span>
                    </td>
                    <td>
                      <div className="table-progress-cell">
                        <div className="table-progress-labels">
                          <span className="table-pct" style={{ color: barColor }}>{pct}%</span>
                          <span className="table-tasks-count">{done}/{total} tasks</span>
                        </div>
                        <div className="table-progress-bar-bg">
                          <div
                            className="table-progress-bar-fill"
                            style={{ width: `${pct}%`, backgroundColor: barColor }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      {lead ? (
                        <div className="table-lead-cell">
                          <span
                            className="table-lead-avatar"
                            style={{
                              background: `linear-gradient(135deg, ${avatarColor(lead.name)}, ${avatarColor(`${lead.name}2`)})`,
                            }}
                          >
                            {lead.initials || memberInitials(lead)}
                          </span>
                          <span className="table-lead-name" title={lead.name}>{lead.name}</span>
                        </div>
                      ) : (
                        <span className="empty-dash">—</span>
                      )}
                    </td>
                    <td>
                      <div className="table-members-cell">
                        <div className="card-avatar-stack">
                          {members.slice(0, 3).map((m, i) => (
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
                          {members.length > 3 && (
                            <div className="avatar avatar--more">+{members.length - 3}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {dueLabel ? (
                        <span className="table-due-lbl">
                          <Calendar size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                          {dueLabel}
                        </span>
                      ) : (
                        <span className="empty-dash">—</span>
                      )}
                    </td>
                    <td>
                      <Link to={`${projectBasePath}/${project.id}`} className="table-open-btn">
                        Open <ArrowUpRight size={13} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && projects.length > 0 && totalPages > 1 && (
        <div className="pu-pagination" style={{ margin: "24px auto 0 auto" }}>
          <button 
            disabled={page === 1} 
            onClick={() => setPage(page - 1)}
            className="pu-pagination-btn"
          >
            Previous
          </button>
          <span className="pu-pagination-info">
            Page {page} of {totalPages} ({totalCount} projects)
          </span>
          <button 
            disabled={page === totalPages} 
            onClick={() => setPage(page + 1)}
            className="pu-pagination-btn"
          >
            Next
          </button>
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
