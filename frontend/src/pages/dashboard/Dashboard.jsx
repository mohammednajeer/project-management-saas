import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  Search,
  TrendingUp,
  TrendingDown,
  FolderOpen,
  CheckSquare,
  Users,
  Sparkles,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "./Dashboard.css";

/* ─── STATIC DATA ────────────────────────────────────────────────────────── */
// TODO: replace with richer real-time timeline later

const DEFAULT_CHART_DATA = [
  { day: "Mon", tasks: 0 },
  { day: "Tue", tasks: 0 },
  { day: "Wed", tasks: 0 },
  { day: "Thu", tasks: 0 },
  { day: "Fri", tasks: 0 },
  { day: "Sat", tasks: 0 },
  { day: "Sun", tasks: 0 },
];

const PRIORITY_COLORS = {
  critical: "#EF4444",
  high: "#F59E0B",
  medium: "#8B5CF6",
  low: "#8A87A0",
};

const STATUS_STYLES = {
  backlog: { label: "Backlog", bg: "#F2F0F8", color: "#4B4963" },
  todo: { label: "Backlog", bg: "#F2F0F8", color: "#4B4963" },
  pending: { label: "Pending", bg: "#FFFBEB", color: "#D97706" },
  in_progress: { label: "In Progress", bg: "#EFF6FF", color: "#3B82F6" },
  inprogress: { label: "In Progress", bg: "#EFF6FF", color: "#3B82F6" },
  review: { label: "Review", bg: "#F5F3FF", color: "#8B5CF6" },
  done: { label: "Done", bg: "#F0FDF4", color: "#16A34A" },
  completed: { label: "Completed", bg: "#F0FDF4", color: "#16A34A" },
};

const ASSIGNEE_COLORS = ["#6C53B3", "#8B5CF6", "#EC4899", "#16A34A", "#F59E0B"];

const ACTIVITY_COLORS = {
  task_created: "#16A34A",
  subtask_created: "#8B5CF6",
  comment_added: "#F59E0B",
  task_updated: "#3B82F6",
  subtask_updated: "#3B82F6",
  default: "#8A87A0",
};

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
const formatLabel = (value) => {
  if (!value) return "None";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDueDate = (value) => {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatRelativeTime = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const extractQuotedText = (message) => {
  const match = String(message || "").match(/'([^']+)'|"([^"]+)"/);
  return match?.[1] || match?.[2] || "";
};

const buildActivityText = (activity) => {
  const userName = activity.user_data?.name || "Someone";
  const action = activity.action || "";
  const itemName = extractQuotedText(activity.message);
  const quotedName = itemName ? ` "${itemName}"` : "";

  if (action === "task_created") return `${userName} created task${quotedName}`;
  if (action === "subtask_created") return `${userName} created subtask${quotedName}`;
  if (action === "subtask_updated") return `${userName} updated subtask${quotedName}`;
  if (action === "task_updated") return `${userName} updated task${quotedName}`;
  if (action === "comment_added") return `${userName} added a comment`;

  return activity.message ? `${userName} ${activity.message}` : `${userName} recorded activity`;
};

const getProjectName = (task) => {
  const project = task.project || task.project_name;
  if (!project) return "No project";
  if (typeof project === "string") return project;
  return project.name || project.title || "No project";
};

const getAssigneeName = (task) => {
  const assignee = task.assigned_users || task.assignee || task.assignee_name || task.user || task.user_data;
  if (!assignee) return "Unassigned";
  if (Array.isArray(assignee)) {
    if (assignee.length === 0) return "Unassigned";
    return assignee.map((user) => user.name || user.email).filter(Boolean).join(", ") || "Unassigned";
  }
  if (typeof assignee === "string") return assignee;
  return assignee.name || assignee.email || "Unassigned";
};

const normalizeStatusKey = (status) => {
  const key = String(status || "").toLowerCase().replace(/\s+/g, "_");
  if (key === "backlog" || key === "todo") return "backlog";
  if (key === "inprogress" || key === "in_progress") return "in_progress";
  if (key === "completed" || key === "done") return "done";
  if (key === "review") return "review";
  return key || "backlog";
};

const isCompletedTask = (task) => {
  return normalizeStatusKey(task.status) === "done";
};

const buildInitials = (task) => {
  const source = getAssigneeName(task) || getProjectName(task) || task.title || "?";
  return String(source)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
};

const mapRecentTask = (task, index) => {
  const priorityKey = String(task.priority || "").toLowerCase();
  const statusKey = normalizeStatusKey(task.status);
  const statusStyle = STATUS_STYLES[statusKey] || {
    label: formatLabel(task.status),
    bg: "#F2F0F8",
    color: "#4B4963",
  };
  return {
    id: task.id || `${task.title}-${index}`,
    task: task.title || task.task || "Untitled task",
    project: getProjectName(task),
    priority: formatLabel(task.priority),
    priorityColor: PRIORITY_COLORS[priorityKey] || "#8A87A0",
    status: statusStyle.label,
    statusBg: statusStyle.bg,
    statusColor: statusStyle.color,
    assignee: buildInitials(task),
    assigneeBg: ASSIGNEE_COLORS[index % ASSIGNEE_COLORS.length],
    due: formatDueDate(task.due_date || task.due),
  };
};

const mapActivity = (activity, index) => {
  const action = activity.action || "default";
  return {
    id: activity.id || `${action}-${index}`,
    text: buildActivityText(activity),
    time: formatRelativeTime(activity.created_at),
    color: ACTIVITY_COLORS[action] || ACTIVITY_COLORS.default,
  };
};

const normalizeChartPoint = (point, index) => ({
  day: point.day || point.label || DEFAULT_CHART_DATA[index]?.day || "",
  tasks: Number(point.tasks ?? point.count ?? point.value ?? 0),
});

const STATUS_DISTRIBUTION_CONFIG = [
  { key: "backlog", name: "Backlog", color: "#8A87A0" },
  { key: "in_progress", name: "In Progress", color: "#3B82F6" },
  { key: "review", name: "Review", color: "#8B5CF6" },
  { key: "done", name: "Done", color: "#16A34A" },
];

/* ─── EXTRA CHART DATA (derived from API or defaults) ────────────────────── */
/* ─── CUSTOM TOOLTIP ─────────────────────────────────────────────────────── */
function GlassTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(255,255,255,0.92)",
      backdropFilter: "blur(12px)",
      border: "1px solid #E8E6F3",
      borderRadius: "10px",
      padding: "10px 14px",
      fontSize: "13px",
      boxShadow: "0 4px 20px rgba(13,12,26,0.1)",
    }}>
      <div style={{ fontWeight: 700, color: "#0D0C1A", marginBottom: 2 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState("");

  useEffect(() => {
    let ignore = false;

    const fetchDashboardOverview = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/dashboard/overview/");
        if (!ignore) setOverview(response.data);
      } catch (err) {
        if (!ignore) setError("Unable to load dashboard overview. Please try again.");
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchDashboardOverview();
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    let ignore = false;

    const fetchActivities = async () => {
      try {
        setActivitiesLoading(true);
        setActivitiesError("");
        const response = await api.get("/activities/");
        if (!ignore) setActivities(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        if (!ignore) setActivitiesError("Unable to load recent activity.");
      } finally {
        if (!ignore) setActivitiesLoading(false);
      }
    };

    fetchActivities();
    return () => { ignore = true; };
  }, []);

  /* ── Derived data ─────────────────────────────────────────────────────── */
  const statCards = useMemo(
    () => [
      {
        icon: FolderOpen,
        iconBg: "#F2EFFE",
        iconColor: "#6C53B3",
        value: overview?.total_projects ?? 0,
        label: "Total Projects",
        trend: "Workspace projects",
        up: true,
      },
      {
        icon: CheckSquare,
        iconBg: "#F5F3FF",
        iconColor: "#8B5CF6",
        value: overview?.total_tasks ?? 0,
        label: "Total Tasks",
        trend: "All tracked tasks",
        up: true,
      },
      {
        icon: Clock,
        iconBg: "#FFFBEB",
        iconColor: "#F59E0B",
        value: overview?.pending_tasks ?? 0,
        label: "Pending Tasks",
        trend: "Awaiting completion",
        up: false,
      },
      {
        icon: CheckSquare,
        iconBg: "#F0FDF4",
        iconColor: "#16A34A",
        value: overview?.completed_tasks ?? 0,
        label: "Completed",
        trend: "Finished work",
        up: true,
      },
      {
        icon: Users,
        iconBg: "#EFF6FF",
        iconColor: "#3B82F6",
        value: overview?.team_members ?? 0,
        label: "Team Members",
        trend: "Workspace members",
        up: null,
      },
      {
        icon: AlertTriangle,
        iconBg: "#FEF2F2",
        iconColor: "#EF4444",
        value: overview?.overdue_tasks ?? 0,
        label: "Overdue Tasks",
        trend: "Needs attention",
        up: false,
      },
    ],
    [overview]
  );

  const rawRecentTasks = useMemo(
    () => (Array.isArray(overview?.recent_tasks) ? overview.recent_tasks : []),
    [overview]
  );

  const chartData = Array.isArray(overview?.weekly_task_activity)
    ? overview.weekly_task_activity.map(normalizeChartPoint)
    : DEFAULT_CHART_DATA;

  const recentTasks = useMemo(
    () => rawRecentTasks.map(mapRecentTask),
    [rawRecentTasks]
  );

  const activityFeed = useMemo(
    () => activities.map(mapActivity),
    [activities]
  );

  const projectProgress = useMemo(() => {
    const projects = rawRecentTasks.reduce((acc, task) => {
      const name = getProjectName(task);
      if (!acc[name]) acc[name] = { total: 0, completed: 0 };
      acc[name].total += 1;
      if (isCompletedTask(task)) acc[name].completed += 1;
      return acc;
    }, {});

    return Object.entries(projects).map(([name, data], index) => ({
      name,
      pct: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      color: ASSIGNEE_COLORS[index % ASSIGNEE_COLORS.length],
    }));
  }, [rawRecentTasks]);

  const teamWorkload = useMemo(() => {
    if (Array.isArray(overview?.team_workload)) {
      return overview.team_workload.map((item, index) => ({
        name: item.name || "Unassigned",
        tasks: Number(item.tasks ?? item.count ?? 0),
        color: ASSIGNEE_COLORS[index % ASSIGNEE_COLORS.length],
      }));
    }

    const assignees = rawRecentTasks.reduce((acc, task) => {
      const name = getAssigneeName(task);
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(assignees).map(([name, tasks], index) => ({
      name,
      tasks,
      color: ASSIGNEE_COLORS[index % ASSIGNEE_COLORS.length],
    }));
  }, [overview, rawRecentTasks]);

  const statusDistribution = useMemo(() => {
    const counts = {
      backlog: 0,
      in_progress: 0,
      review: 0,
      done: 0,
    };

    if (Array.isArray(overview?.task_status_distribution)) {
      overview.task_status_distribution.forEach((item) => {
        const key = normalizeStatusKey(item.status || item.name);
        if (counts[key] !== undefined) counts[key] += Number(item.count ?? item.value ?? 0);
      });
    } else {
      rawRecentTasks.forEach((task) => {
        const key = normalizeStatusKey(task.status);
        if (counts[key] !== undefined) counts[key] += 1;
      });
    }

    return STATUS_DISTRIBUTION_CONFIG.map((item) => ({
      name: item.name,
      value: counts[item.key],
      color: item.color,
    }));
  }, [overview, rawRecentTasks]);

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <main className="db-page">
      {/* ── Topbar ──────────────────────────────────────────────────────── */}
      <header className="db-topbar">
        <div className="db-workspace">
          <span className="db-workspace-name">Acme Corp</span>
          <span className="db-pro-badge">Pro</span>
        </div>

        <div className="db-search">
          <Search size={15} className="db-search-icon" />
          <input placeholder="Search projects, tasks..." />
        </div>

        <div className="db-topbar-right">
          <button className="db-notif">
            <Bell size={18} />
            <span className="db-notif-badge">2</span>
          </button>
          <div className="db-user">
            <div className="db-avatar">JD</div>
            <div className="db-user-info">
              <span className="db-user-name">John Doe</span>
              <span className="db-user-role">Admin</span>
            </div>
            <ChevronDown size={14} color="#B8B5CC" />
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="db-content">
        {/* Welcome */}
        <div className="db-welcome-row">
          <div>
            <h1 className="db-welcome-title">Good morning, John 👋</h1>
            <p className="db-welcome-sub">
              Here's what's happening across your workspace today.
            </p>
            <span className="db-system-status">● All systems normal</span>
          </div>
        </div>

        {error && (
          <div className="db-tasks-card" role="alert">
            <p className="db-feed-text">{error}</p>
          </div>
        )}

        {/* ── Stat Cards ────────────────────────────────────────────────── */}
        <div className="db-stats" aria-busy={loading}>
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="db-stat-card">
                <div
                  className="db-stat-icon"
                  style={{ background: card.iconBg, color: card.iconColor }}
                >
                  <Icon size={20} />
                </div>
                <div className="db-stat-body">
                  <div className="db-stat-value">
                    {loading ? "..." : card.value}
                  </div>
                  <div className="db-stat-label">{card.label}</div>
                  <div
                    className={`db-stat-trend ${card.up === false ? "down" : card.up === null ? "neutral" : "up"
                      }`}
                  >
                    {card.up === true && <TrendingUp size={12} />}
                    {card.up === false && <TrendingDown size={12} />}
                    {card.up === null && <span style={{ fontSize: "11px" }}>↗</span>}
                    {card.trend}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Chart + Activity Feed ─────────────────────────────────────── */}
        <div className="db-mid-row">
          <div className="db-chart-card">
            <div className="db-chart-header">
              <div>
                <h2 className="db-section-title">Task Activity</h2>
                <p className="db-section-sub">Tasks completed this week</p>
              </div>
              <span className="db-chart-trend">
                {loading ? "Loading..." : "↗ Live overview"}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
                accessibilityLayer={false}
              >
                <defs>
                  <linearGradient id="taskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6C53B3" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#6C53B3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E6F3" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: "#8A87A0" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#8A87A0" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<GlassTooltip />} />
                <Area
                  type="monotone"
                  dataKey="tasks"
                  stroke="#6C53B3"
                  strokeWidth={2.5}
                  fill="url(#taskGrad)"
                  dot={{ r: 4, fill: "#6C53B3", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#6C53B3", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="db-feed-card">
            <div className="db-feed-header">
              <h2 className="db-section-title">Activity Feed</h2>
              <a href="#" className="db-view-all">View all</a>
            </div>
            <div className="db-feed-list">
              {activitiesLoading ? (
                <div className="db-feed-item">
                  <span className="db-feed-dot" style={{ background: ACTIVITY_COLORS.default }} />
                  <div>
                    <p className="db-feed-text">Loading recent activity...</p>
                    <p className="db-feed-time">Please wait</p>
                  </div>
                </div>
              ) : activitiesError ? (
                <div className="db-feed-item">
                  <span className="db-feed-dot" style={{ background: ACTIVITY_COLORS.default }} />
                  <div>
                    <p className="db-feed-text">{activitiesError}</p>
                    <p className="db-feed-time">Try again later</p>
                  </div>
                </div>
              ) : activityFeed.length === 0 ? (
                <div className="db-feed-item">
                  <span className="db-feed-dot" style={{ background: ACTIVITY_COLORS.default }} />
                  <div>
                    <p className="db-feed-text">No recent activity</p>
                    <p className="db-feed-time">You're all caught up</p>
                  </div>
                </div>
              ) : (
                activityFeed.map((item) => (
                <div key={item.id} className="db-feed-item">
                  <span className="db-feed-dot" style={{ background: item.color }} />
                  <div>
                    <p className="db-feed-text">{item.text}</p>
                    <p className="db-feed-time">{item.time}</p>
                  </div>
                </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom Row: 3 extra charts ────────────────────────────────── */}
        <div className="db-bottom-row">
          {/* Task Distribution Donut */}
          <div className="db-bottom-card">
            <div className="db-bottom-card-header">
              <div>
                <h2 className="db-section-title">Task Distribution</h2>
                <p className="db-section-sub">By current status</p>
              </div>
            </div>
            <div className="db-donut-wrap">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%" cy="50%"
                    innerRadius={40} outerRadius={65}
                    dataKey="value" strokeWidth={2} stroke="#fff"
                  >
                    {statusDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<GlassTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="db-donut-legend">
                {statusDistribution.map((s) => (
                  <div key={s.name} className="db-legend-item">
                    <span className="db-legend-dot" style={{ background: s.color }} />
                    {s.name}
                    <span className="db-legend-value">{loading ? "…" : s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Project Progress */}
          <div className="db-bottom-card">
            <div className="db-bottom-card-header">
              <div>
                <h2 className="db-section-title">Project Progress</h2>
                <p className="db-section-sub">Active projects completion</p>
              </div>
            </div>
            <div className="db-progress-list">
              {projectProgress.length === 0 ? (
                <div>
                  <div className="db-progress-item-header">
                    <span className="db-progress-name">No project data</span>
                    <span className="db-progress-pct">0%</span>
                  </div>
                  <div className="db-progress-bar">
                    <div
                      className="db-progress-fill"
                      style={{ width: "0%", background: ASSIGNEE_COLORS[0] }}
                    />
                  </div>
                </div>
              ) : (
                projectProgress.map((p) => (
                <div key={p.name}>
                  <div className="db-progress-item-header">
                    <span className="db-progress-name">{p.name}</span>
                    <span className="db-progress-pct">{p.pct}%</span>
                  </div>
                  <div className="db-progress-bar">
                    <div
                      className="db-progress-fill"
                      style={{ width: `${p.pct}%`, background: p.color }}
                    />
                  </div>
                </div>
                ))
              )}
            </div>
          </div>

          {/* Team Workload */}
          <div className="db-bottom-card">
            <div className="db-bottom-card-header">
              <div>
                <h2 className="db-section-title">Team Workload</h2>
                <p className="db-section-sub">Tasks per team member</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={teamWorkload} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E6F3" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#8A87A0" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#8A87A0" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<GlassTooltip />} />
                <Bar dataKey="tasks" radius={[6, 6, 0, 0]} barSize={28}>
                  {teamWorkload.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Recent Tasks Table ─────────────────────────────────────────── */}
        <div className="db-tasks-card">
          <div className="db-tasks-header">
            <h2 className="db-section-title">Recent Tasks</h2>
            <Link to="/dashboard/tasks" className="db-view-all">View all tasks →</Link>
          </div>
          <table className="db-tasks-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Project</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="db-task-project" colSpan="6">
                    Loading recent tasks...
                  </td>
                </tr>
              ) : recentTasks.length === 0 ? (
                <tr>
                  <td className="db-task-project" colSpan="6">
                    No recent tasks found.
                  </td>
                </tr>
              ) : (
                recentTasks.map((row) => (
                  <tr key={row.id}>
                    <td className="db-task-name">{row.task}</td>
                    <td className="db-task-project">{row.project}</td>
                    <td>
                      <span
                        className="db-priority"
                        style={{
                          color: row.priorityColor,
                          borderColor: row.priorityColor + "33",
                          background: row.priorityColor + "11",
                        }}
                      >
                        {row.priority}
                      </span>
                    </td>
                    <td>
                      <span
                        className="db-status"
                        style={{
                          background: row.statusBg,
                          color: row.statusColor,
                        }}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td>
                      <div
                        className="db-assignee"
                        style={{ background: row.assigneeBg }}
                      >
                        {row.assignee}
                      </div>
                    </td>
                    <td className="db-due">{row.due}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
