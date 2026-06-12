import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Calendar,
  Users,
  CheckCircle2,
  ChevronRight,
  Layers,
  Edit2,
  Trash2,
  Save,
  X,
  Plus,
  Clock,
  BarChart2,
  UserPlus,
  ListChecks,
  Flag,
  Target,
  Activity,
  Lock,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "./ProjectDetails.css";
import CreateTaskModal from "./CreateTaskModal";
import emptyTasksIllustration from "../../assets/images/undraw_check-boxes_x5fg.svg";
import {
  getHealthStyle,
  formatDueDate,
  formatStatusLabel,
  MILESTONE_STATUS_STYLES,
} from "./projectUtils";
import { getWorkloadStyle } from "./workloadUtils";

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

const TASK_STATUS_STYLES = {
  backlog: { bg: "#F8FAFC", color: "#475569" },
  todo: { bg: "#F8FAFC", color: "#475569" },
  pending: { bg: "#FEF3C7", color: "#D97706" },
  in_progress: { bg: "#EFF6FF", color: "#2563EB" },
  inprogress: { bg: "#EFF6FF", color: "#2563EB" },
  review: { bg: "#F5F3FF", color: "#7C3AED" },
  done: { bg: "#ECFDF5", color: "#059669" },
  completed: { bg: "#ECFDF5", color: "#059669" },
};

const TASK_PRIORITY_STYLES = {
  critical: { bg: "#FFF1F2", color: "#E11D48" },
  high: { bg: "#FEF3C7", color: "#D97706" },
  medium: { bg: "#EFF6FF", color: "#2563EB" },
  low: { bg: "#F8FAFC", color: "#475569" },
};

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

function taskBadgeStyle(map, key) {
  const k = String(key || "").toLowerCase().replace(/\s+/g, "_");
  return map[k] || { bg: "#f1f5f9", color: "#64748b" };
}

const EMPTY_MILESTONE = {
  title: "",
  description: "",
  target_date: "",
  status: "pending",
};

export default function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const canManage = user?.role === "admin" || user?.role === "manager" || (project && project.project_lead_data?.id === user?.id);
  const [tasks, setTasks] = useState([]);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskPage, setTaskPage] = useState(1);
  const [taskTotalCount, setTaskTotalCount] = useState(0);
  const [taskTotalPages, setTaskTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [projectLeadId, setProjectLeadId] = useState("");
  const [milestoneForm, setMilestoneForm] = useState(EMPTY_MILESTONE);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [teamWorkload, setTeamWorkload] = useState([]);

  const sortedMilestones = useMemo(() => {
    if (!project || !project.milestones) return [];
    return [...project.milestones].sort((a, b) => new Date(a.target_date) - new Date(b.target_date));
  }, [project]);

  const fetchTasks = async (page = taskPage) => {
    try {
      const tasksRes = await api.get(`/tasks/project/${projectId}/`, {
        params: { page }
      });
      const data = tasksRes.data;
      if (data && data.results !== undefined) {
        setTasks(data.results);
        setTaskTotalCount(data.count);
        setTaskTotalPages(Math.ceil(data.count / 10));
      } else {
        setTasks(data);
        setTaskTotalCount(data.length);
        setTaskTotalPages(1);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const fetchProject = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/`);
      setProject(res.data);
      setName(res.data.name);
      setDescription(res.data.description || "");
      setStatus(res.data.status);
      setPriority(res.data.priority);
      setProjectLeadId(res.data.project_lead || "");
      const [membersRes, workloadRes] = await Promise.all([
        api.get("/organizations/team/"),
        api.get(`/projects/${projectId}/team-workload/`),
      ]);
      setTeamMembers(membersRes.data);
      setTeamWorkload(workloadRes.data?.members || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTaskPage(1);
    fetchProject();
  }, [projectId]);

  useEffect(() => {
    fetchTasks(taskPage);
  }, [projectId, taskPage]);

  const handleSave = async () => {
    try {
      const payload = { name, description, status, priority };
      if (canManage) {
        payload.project_lead = projectLeadId || null;
      }
      await api.patch(`/projects/${projectId}/`, payload);
      await fetchProject();
      setEditMode(false);
    } catch (err) {
      console.log(err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await api.delete(`/projects/${projectId}/`);
      navigate(user?.role === "employee" ? "/workspace/projects" : "/dashboard/projects");
    } catch (err) {
      console.log(err);
    }
  };

  const addMembers = async () => {
    try {
      await api.post(`/projects/${projectId}/members/`, { members: selectedMembers });
      await fetchProject();
      setSelectedMembers([]);
    } catch (err) {
      console.log(err);
    }
  };

  const removeMember = async (userId) => {
    try {
      await api.delete(`/projects/${projectId}/members/`, { data: { user_id: userId } });
      await fetchProject();
    } catch (err) {
      console.log(err);
    }
  };

  const createMilestone = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/projects/${projectId}/milestones/`, milestoneForm);
      setMilestoneForm(EMPTY_MILESTONE);
      setShowMilestoneForm(false);
      await fetchProject();
    } catch (err) {
      console.log(err);
    }
  };

  const updateMilestoneStatus = async (milestoneId, newStatus) => {
    try {
      await api.patch(`/projects/${projectId}/milestones/${milestoneId}/`, {
        status: newStatus,
      });
      await fetchProject();
    } catch (err) {
      console.log(err);
    }
  };

  const deleteMilestone = async (milestoneId) => {
    if (!window.confirm("Delete this milestone?")) return;
    try {
      await api.delete(`/projects/${projectId}/milestones/${milestoneId}/`);
      await fetchProject();
    } catch (err) {
      console.log(err);
    }
  };

  if (loading) {
    return (
      <div className="project-details-page">
        <div className="pd-loading">
          <div className="pd-loading-spinner" />
          <span>Loading project...</span>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-details-page">
        <div className="pd-loading">
          <Layers size={32} className="pd-loading-icon" />
          <span>Project not found</span>
        </div>
      </div>
    );
  }

  const total = project.total_tasks || 0;
  const done = project.completed_tasks || 0;
  const progress = total ? Math.round((done / total) * 100) : 0;
  const isLocked = project.status === "archived" || project.status === "completed";
  const dueLabel = formatDueDate(project.due_date);
  const healthStyle = getHealthStyle(project.health);
  const lead = project.project_lead_data;
  const milestoneSummary = project.milestone_summary || {
    upcoming: [],
    completed: [],
    overdue: [],
    progress: project.milestone_progress ?? 100,
  };
  const milestoneProgress = milestoneSummary.progress ?? project.milestone_progress ?? 0;

  const statCards = [
    { icon: ListChecks, label: "Tasks completed", value: `${done}/${total}`, grad: ["#6354c4", "#9b7ff4"] },
    { icon: Users, label: "Team members", value: project.members_data?.length || 0, grad: ["#06b6d4", "#22d3ee"] },
    { icon: BarChart2, label: "Overall progress", value: `${progress}%`, grad: ["#3b82f6", "#60a5fa"] },
    { icon: Calendar, label: "Deadline", value: dueLabel || "No date", grad: ["#f97316", "#fb923c"], small: !dueLabel },
    {
      icon: Target,
      label: "Milestone progress",
      value: `${milestoneProgress}%`,
      grad: ["#8b5cf6", "#a78bfa"],
    },
  ];

  return (
    <div className="project-details-page">
      <nav className="pd-breadcrumb">
        <Link to={user?.role === "employee" ? "/workspace/projects" : "/dashboard/projects"}>Projects</Link>
        <ChevronRight size={13} className="pd-breadcrumb-sep" />
        <span className="pd-breadcrumb-current">{project.name}</span>
      </nav>

      <header className="pd-hero">
        <div className="pd-hero-main">
          {editMode ? (
            <div className="pd-edit-fields">
              <input
                className="pd-edit-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
              />
              <textarea
                className="pd-edit-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Project description..."
              />
            </div>
          ) : (
            <>
              <div className="pd-hero-tags">
                <span
                  className="pd-health-badge"
                  style={{ background: healthStyle.bg, color: healthStyle.color }}
                >
                  <Activity size={12} />
                  {project.health_label || healthStyle.label}
                </span>
                <span className="pd-status-badge">{formatStatusLabel(project.status)}</span>
                {project.priority && (
                  <span className="pd-priority-badge">
                    <Flag size={12} />
                    {formatStatusLabel(project.priority)}
                  </span>
                )}
              </div>
              <h1 className="pd-project-name">{project.name}</h1>
              <p className="pd-project-desc">
                {project.description || "No description provided."}
              </p>
              {lead && (
                <div className="pd-lead-card">
                  <span className="pd-lead-label">Project Lead</span>
                  <div
                    className="pd-avatar pd-lead-avatar"
                    style={{
                      background: `linear-gradient(135deg, ${avatarColor(lead.name)}, ${avatarColor(`${lead.name}2`)})`,
                    }}
                  >
                    {lead.initials || memberInitials(lead)}
                  </div>
                  <div>
                    <strong>{lead.name}</strong>
                    <small>{lead.email}</small>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="pd-actions">
          {editMode ? (
            <>
              {(user?.role === "admin" || user?.role === "manager") && (
                <select
                  className="pd-status-select"
                  value={projectLeadId}
                  onChange={(e) => setProjectLeadId(e.target.value)}
                  title="Project lead"
                >
                  <option value="">No project lead</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              )}
              <select
                className="pd-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
              <button type="button" className="pd-btn pd-btn--primary" onClick={handleSave}>
                <Save size={14} />
                Save
              </button>
              <button type="button" className="pd-btn" onClick={() => setEditMode(false)}>
                <X size={14} />
                Cancel
              </button>
            </>
          ) : (
            <>
              {canManage && (
                <button type="button" className="pd-btn" onClick={() => setEditMode(true)}>
                  <Edit2 size={14} />
                  Edit
                </button>
              )}
              {(user?.role === "admin" || user?.role === "manager") && (
                <button type="button" className="pd-btn pd-btn--danger" onClick={handleDelete}>
                  <Trash2 size={14} />
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {project.status === "archived" && (
        <div className="pd-banner pd-banner--archived">
          <X size={16} />
          This project is archived. You can still edit and reopen it.
        </div>
      )}
      {project.status === "completed" && (
        <div className="pd-banner pd-banner--completed">
          <CheckCircle2 size={16} />
          This project has been completed. Great work!
        </div>
      )}

      <section className="pd-stats">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="pd-stat-card">
              <div
                className="pd-stat-icon"
                style={{ background: `linear-gradient(135deg, ${card.grad[0]}, ${card.grad[1]})` }}
              >
                <Icon size={20} color="#fff" strokeWidth={2.25} />
              </div>
              <div className="pd-stat-body">
                <h3 className={card.small ? "pd-stat-value pd-stat-value--sm" : "pd-stat-value"}>
                  {card.value}
                </h3>
                <p>{card.label}</p>
              </div>
            </article>
          );
        })}
      </section>

      <div className="pd-main-layout">
        <div className="pd-main-content">
          <section className="pd-milestones-section">
            <div className="pd-task-header">
              <div className="pd-task-header-left">
                <h2 className="pd-section-title">Milestones Timeline</h2>
                <p className="pd-section-sub">
                  {milestoneProgress}% complete · {milestoneSummary.upcoming?.length || 0} upcoming
                </p>
              </div>
              {canManage && !isLocked && (
                <button
                  type="button"
                  className="pd-create-task-btn"
                  onClick={() => setShowMilestoneForm((v) => !v)}
                >
                  <Plus size={15} />
                  Add Milestone
                </button>
              )}
            </div>

            {showMilestoneForm && canManage && (
              <form className="pd-milestone-form pd-glass-card" onSubmit={createMilestone}>
                <input
                  className="pd-edit-input pd-milestone-input"
                  placeholder="Milestone title"
                  value={milestoneForm.title}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                  required
                />
                <textarea
                  className="pd-edit-textarea"
                  placeholder="Description (optional)"
                  value={milestoneForm.description}
                  onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                />
                <div className="pd-milestone-form-row">
                  <input
                    type="date"
                    className="pd-status-select"
                    value={milestoneForm.target_date}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, target_date: e.target.value })}
                    required
                  />
                  <select
                    className="pd-status-select"
                    value={milestoneForm.status}
                    onChange={(e) => setMilestoneForm({ ...milestoneForm, status: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button type="submit" className="pd-add-members-btn">Save Milestone</button>
                </div>
              </form>
            )}

            <div className="pd-timeline-wrap pd-glass-card">
              {sortedMilestones.length === 0 ? (
                <p className="pd-members-empty">No milestones added yet.</p>
              ) : (
                <div className="pd-timeline">
                  {sortedMilestones.map((milestone) => {
                    const isCompleted = milestone.status === "completed";
                    const isOverdue = !isCompleted && milestone.target_date && new Date(milestone.target_date) < new Date();
                    const msStyle = isCompleted
                      ? { color: "#3D9A5F", bg: "rgba(61, 154, 95, 0.12)", label: "Completed" }
                      : isOverdue
                      ? { color: "#C96442", bg: "rgba(201, 100, 66, 0.12)", label: "Overdue" }
                      : { color: "#5B8CB8", bg: "rgba(91, 140, 184, 0.12)", label: "Pending" };

                    return (
                      <div key={milestone.id} className={`pd-timeline-item ${isCompleted ? "completed" : isOverdue ? "overdue" : ""}`}>
                        <div className="pd-timeline-badge" style={{ backgroundColor: msStyle.color, boxShadow: `0 0 0 4px ${msStyle.bg}` }}>
                          {isCompleted ? <CheckCircle2 size={12} color="#fff" /> : <Clock size={12} color="#fff" />}
                        </div>
                        <div className="pd-timeline-content">
                          <div className="pd-timeline-header">
                            <h4 className="pd-timeline-title">{milestone.title}</h4>
                            <span className="pd-timeline-status-badge" style={{ background: msStyle.bg, color: msStyle.color }}>
                              {msStyle.label}
                            </span>
                          </div>
                          {milestone.description && <p className="pd-timeline-desc">{milestone.description}</p>}
                          <div className="pd-timeline-meta">
                            <Calendar size={11} />
                            <span>Target: {formatDueDate(milestone.target_date)}</span>
                          </div>
                          
                          {canManage && !isLocked && (
                            <div className="pd-timeline-actions">
                              {!isCompleted && (
                                <button
                                  type="button"
                                  className="pd-timeline-action-btn complete"
                                  onClick={() => updateMilestoneStatus(milestone.id, "completed")}
                                >
                                  Mark complete
                                </button>
                              )}
                              <button
                                type="button"
                                className="pd-timeline-action-btn delete"
                                onClick={() => deleteMilestone(milestone.id)}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="pd-tasks-section">
            <div className="pd-task-header">
              <div className="pd-task-header-left">
                <h2 className="pd-section-title">Project Tasks</h2>
                <p className="pd-section-sub">
                  {taskTotalCount} task{taskTotalCount !== 1 ? "s" : ""} total
                </p>
              </div>
              {canManage && !isLocked && (
                <button
                  type="button"
                  className="pd-create-task-btn"
                  onClick={() => setTaskModalOpen(true)}
                >
                  <Plus size={15} />
                  Create Task
                </button>
              )}
            </div>

            {tasks.length === 0 ? (
              <div className="pd-empty-tasks">
                <img src={emptyTasksIllustration} alt="No tasks" className="pd-empty-tasks-img" />
                <h3>No tasks yet</h3>
                <p>Create your first task to start tracking progress</p>
              </div>
            ) : (
              <div className="pd-task-grid">
                {tasks.map((task) => {
                  const tTotal = task.subtask_count || 0;
                  const tDone = task.completed_subtasks || 0;
                  const tProgress = tTotal ? Math.round((tDone / tTotal) * 100) : 0;
                  const statusStyle = taskBadgeStyle(TASK_STATUS_STYLES, task.status);
                  const priorityStyle = taskBadgeStyle(TASK_PRIORITY_STYLES, task.priority);
                  const taskDue = formatDueDate(task.due_date);

                  const isTaskBlocked = task.blocked_by_data?.some(d => d.status !== 'done');

                  return (
                    <Link to={`${user?.role === "employee" ? "/workspace/task" : "/dashboard/tasks"}/${task.id}`} key={task.id} className="pd-task-card-link">
                      <article className="pd-task-card">
                        <div className="pd-task-top">
                          <div className="pd-task-top-tags">
                            <span
                              className="pd-task-status"
                              style={{ background: statusStyle.bg, color: statusStyle.color }}
                            >
                              {formatStatusLabel(task.status)}
                            </span>
                            <span
                              className="pd-task-priority"
                              style={{ background: priorityStyle.bg, color: priorityStyle.color }}
                            >
                              {formatStatusLabel(task.priority)}
                            </span>
                          </div>
                          {isTaskBlocked && (
                            <span className="pd-task-blocked-lock" title="This task is blocked by unresolved blockers">
                              <Lock size={12} />
                            </span>
                          )}
                        </div>

                        <h3>{task.title}</h3>
                        <p>{task.description || "No description"}</p>

                        <div className="pd-task-progress-top">
                          <span>Subtasks</span>
                          <span className="pd-task-pct">{tProgress}%</span>
                        </div>
                        <div className="pd-task-progress-track">
                          <div className="pd-task-progress-bar" style={{ width: `${tProgress}%` }} />
                        </div>

                        <div className="pd-task-footer">
                          <span className="pd-task-subtasks">
                            {tDone}/{tTotal} subtasks
                          </span>
                          <span className="pd-task-due">
                            {taskDue ? (
                              <>
                                <Clock size={11} style={{ marginRight: 4 }} />
                                {taskDue}
                              </>
                            ) : (
                              "No due date"
                            )}
                          </span>
                        </div>
                      </article>
                    </Link>
                  );
                })}
              </div>
            )}

            {!loading && tasks.length > 0 && taskTotalPages > 1 && (
              <div className="pu-pagination" style={{ margin: "24px auto 0 auto" }}>
                <button
                  disabled={taskPage === 1}
                  onClick={() => setTaskPage(taskPage - 1)}
                  className="pu-pagination-btn"
                >
                  Previous
                </button>
                <span className="pu-pagination-info">
                  Page {taskPage} of {taskTotalPages} ({taskTotalCount} tasks)
                </span>
                <button
                  disabled={taskPage === taskTotalPages}
                  onClick={() => setTaskPage(taskPage + 1)}
                  className="pu-pagination-btn"
                >
                  Next
                </button>
              </div>
            )}
          </section>
        </div>

        <aside className="pd-sidebar">
          <div className="pd-glass-card pd-progress-card">
            <div className="pd-progress-top">
              <div className="pd-card-title">
                <div className="pd-card-title-icon">
                  <BarChart2 size={14} />
                </div>
                Project Progress
              </div>
              <div className="pd-progress-ring-wrap">
                <svg className="pd-progress-ring" viewBox="0 0 72 72" aria-hidden>
                  <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(23,25,28,0.06)" strokeWidth="6" />
                  <circle
                    cx="36"
                    cy="36"
                    r="30"
                    fill="none"
                    stroke="url(#pdProgressGrad)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 30}`}
                    strokeDashoffset={`${2 * Math.PI * 30 * (1 - progress / 100)}`}
                    transform="rotate(-90 36 36)"
                  />
                  <defs>
                    <linearGradient id="pdProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#17191c" />
                      <stop offset="100%" stopColor="#777b86" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="pd-progress-pct">{progress}%</span>
              </div>
            </div>
            <div className="pd-progress-track">
              <div className="pd-progress-bar" style={{ width: `${progress}%`, background: "var(--ink)" }} />
            </div>
            <div className="pd-progress-meta">
              <span>{done} tasks completed</span>
              <span>{total - done} remaining</span>
            </div>
          </div>

          <div className="pd-glass-card pd-members-card">
            <div className="pd-card-title">
              <div className="pd-card-title-icon">
                <Users size={14} />
              </div>
              Team Members
            </div>

            {lead && (
              <div className="pd-lead-inline">
                <span>Project Lead</span>
                <div className="pd-member">
                  <div
                    className="pd-avatar"
                    style={{
                      background: `linear-gradient(135deg, ${avatarColor(lead.name)}, ${avatarColor(`${lead.name}2`)})`,
                    }}
                  >
                    {lead.initials || memberInitials(lead)}
                  </div>
                  <span className="pd-member-name">{lead.name}</span>
                </div>
              </div>
            )}

            {project.members_data?.length === 0 ? (
              <p className="pd-members-empty">No members yet.</p>
            ) : (
              <div className="pd-members-list">
                {project.members_data?.map((member) => {
                  const workload = teamWorkload.find((row) => row.id === member.id);
                  const ws = getWorkloadStyle(workload?.workload_status);
                  const showWorkload = workload && (canManage || String(member.id) === String(user?.id));
                  return (
                    <div key={member.id} className="pd-member pd-member--workload">
                      <div
                        className="pd-avatar"
                        style={{
                          background: `linear-gradient(135deg, ${avatarColor(member.name)}, ${avatarColor(`${member.name}2`)})`,
                        }}
                      >
                        {memberInitials(member)}
                      </div>
                      <div className="pd-member-body">
                        <span className="pd-member-name">{member.name}</span>
                        {showWorkload && (
                          <div className="pd-member-workload">
                            <span>{workload.active_tasks} Active Tasks</span>
                            <span
                              className="pd-workload-status"
                              style={{ background: ws.bg, color: ws.color }}
                            >
                              {workload.workload_label}
                            </span>
                          </div>
                        )}
                      </div>
                      {canManage && !isLocked && (
                        <button
                          type="button"
                          className="remove-member-btn"
                          onClick={() => removeMember(member.id)}
                          title="Remove member"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!isLocked && canManage && (
              <div className="pd-manage-members">
                <div className="pd-manage-title">
                  <UserPlus size={12} />
                  Add Members
                </div>
                <div className="pd-member-select-list">
                  {teamMembers
                    .filter((tm) => !project.members_data?.some((pm) => pm.id === tm.id))
                    .map((member) => (
                      <button
                        type="button"
                        key={member.id}
                        className={`member-pill ${selectedMembers.includes(member.id) ? "active" : ""}`}
                        onClick={() => {
                          setSelectedMembers(
                            selectedMembers.includes(member.id)
                              ? selectedMembers.filter((id) => id !== member.id)
                              : [...selectedMembers, member.id]
                          );
                        }}
                      >
                        {member.name}
                      </button>
                    ))}
                </div>
                {selectedMembers.length > 0 && (
                  <button type="button" className="pd-add-members-btn" onClick={addMembers}>
                    <UserPlus size={14} />
                    Add {selectedMembers.length} Member{selectedMembers.length > 1 ? "s" : ""}
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      <CreateTaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSuccess={fetchTasks}
        projectId={projectId}
      />
    </div>
  );
}
