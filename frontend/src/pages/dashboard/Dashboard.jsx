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
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import api from "../../services/api";
import "./Dashboard.css";

// TODO: replace with real activity timeline system later
const activityFeed = [
  { id: 1, color: "#22c55e", text: 'Alex Kim completed "API Integration"', time: "2 min ago" },
  { id: 2, color: "#4f6df5", text: 'New project "Analytics Dashboard" created', time: "15 min ago" },
  { id: 3, color: "#a855f7", text: "Sara Patel joined the workspace", time: "1 hour ago" },
  { id: 4, color: "#f59e0b", text: '"Mobile App" deadline moved to Dec 30', time: "3 hours ago" },
  { id: 5, color: "#22c55e", text: '5 tasks moved to "Done" in Website Redesign', time: "5 hours ago" },
  { id: 6, color: "#6b7280", text: 'Comment added on "Backend API" task', time: "Yesterday" },
];

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
  critical: "#ef4444",
  high: "#f59e0b",
  medium: "#a855f7",
  low: "#6b7280",
};

const STATUS_STYLES = {
  backlog: { label: "Backlog", bg: "#f3f4f6", color: "#374151" },
  todo: { label: "To Do", bg: "#f3f4f6", color: "#374151" },
  pending: { label: "Pending", bg: "#fffbeb", color: "#d97706" },
  in_progress: { label: "In Progress", bg: "#eff6ff", color: "#4f6df5" },
  review: { label: "Review", bg: "#fdf4ff", color: "#a855f7" },
  done: { label: "Done", bg: "#f0fdf4", color: "#22c55e" },
  completed: { label: "Completed", bg: "#f0fdf4", color: "#22c55e" },
};

const ASSIGNEE_COLORS = ["#4f6df5", "#8b5cf6", "#ec4899", "#22c55e", "#f59e0b"];

const formatLabel = (value) => {
  if (!value) return "None";

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDueDate = (value) => {
  if (!value) return "No date";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const buildInitials = (task) => {
  const source = task.assignee || task.assignee_name || task.project || task.title || "?";

  return String(source)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
};

const mapRecentTask = (task, index) => {
  const priorityKey = String(task.priority || "").toLowerCase();
  const statusKey = String(task.status || "").toLowerCase();
  const statusStyle = STATUS_STYLES[statusKey] || {
    label: formatLabel(task.status),
    bg: "#f3f4f6",
    color: "#374151",
  };

  return {
    id: task.id || `${task.title}-${index}`,
    task: task.title || task.task || "Untitled task",
    project: task.project || "No project",
    priority: formatLabel(task.priority),
    priorityColor: PRIORITY_COLORS[priorityKey] || "#6b7280",
    status: statusStyle.label,
    statusBg: statusStyle.bg,
    statusColor: statusStyle.color,
    assignee: buildInitials(task),
    assigneeBg: ASSIGNEE_COLORS[index % ASSIGNEE_COLORS.length],
    due: formatDueDate(task.due_date || task.due),
  };
};

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    const fetchDashboardOverview = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/dashboard/overview/");

        if (!ignore) {
          setOverview(response.data);
        }
      } catch (err) {
        if (!ignore) {
          setError("Unable to load dashboard overview. Please try again.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchDashboardOverview();

    return () => {
      ignore = true;
    };
  }, []);

  const statCards = useMemo(
    () => [
      {
        icon: FolderOpen,
        iconBg: "#eff6ff",
        iconColor: "#4f6df5",
        value: overview?.total_projects ?? 0,
        label: "Total Projects",
        trend: "Workspace projects",
        up: true,
      },
      {
        icon: CheckSquare,
        iconBg: "#f5f3ff",
        iconColor: "#8b5cf6",
        value: overview?.total_tasks ?? 0,
        label: "Total Tasks",
        trend: "All tracked tasks",
        up: true,
      },
      {
        icon: null,
        emoji: "clock",
        iconBg: "#fffbeb",
        iconColor: "#f59e0b",
        value: overview?.pending_tasks ?? 0,
        label: "Pending Tasks",
        trend: "Awaiting completion",
        up: false,
      },
      {
        icon: null,
        checkGreen: true,
        iconBg: "#f0fdf4",
        iconColor: "#22c55e",
        value: overview?.completed_tasks ?? 0,
        label: "Completed Tasks",
        trend: "Finished work",
        up: true,
      },
      {
        icon: Users,
        iconBg: "#fff1f2",
        iconColor: "#ef4444",
        value: overview?.team_members ?? 0,
        label: "Team Members",
        trend: "Workspace members",
        up: null,
      },
      {
        icon: Sparkles,
        iconBg: "#fef2f2",
        iconColor: "#ef4444",
        value: overview?.overdue_tasks ?? 0,
        label: "Overdue Tasks",
        trend: "Needs attention",
        up: false,
      },
    ],
    [overview]
  );

  const chartData =
    overview?.weekly_task_activity?.length > 0
      ? overview.weekly_task_activity
      : DEFAULT_CHART_DATA;

  const recentTasks = useMemo(
    () => (overview?.recent_tasks || []).map(mapRecentTask),
    [overview]
  );

  return (
    <main className="db-page">
      {/* Topbar */}
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
            <ChevronDown size={14} color="#9ca3af" />
          </div>
        </div>
      </header>

      {/* Content */}
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

        {/* Stat cards */}
        <div className="db-stats" aria-busy={loading}>
          {statCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="db-stat-card">
                <div
                  className="db-stat-icon"
                  style={{ background: card.iconBg, color: card.iconColor }}
                >
                  {card.checkGreen ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  ) : card.emoji ? (
                    <span style={{ fontSize: "18px" }}>🕐</span>
                  ) : (
                    <Icon size={20} />
                  )}
                </div>
                <div className="db-stat-body">
                  <div className="db-stat-value">
                    {loading ? "..." : card.value}
                  </div>
                  <div className="db-stat-label">{card.label}</div>
                  <div
                    className={`db-stat-trend ${
                      card.up === false
                        ? "down"
                        : card.up === null
                        ? "neutral"
                        : "up"
                    }`}
                  >
                    {card.up === true && <TrendingUp size={12} />}
                    {card.up === false && <TrendingDown size={12} />}
                    {card.up === null && (
                      <span style={{ fontSize: "11px" }}>↗</span>
                    )}
                    {card.trend}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Chart + Activity Feed */}
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
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
                accessibilityLayer={false}
              >
                <defs>
                  <linearGradient id="taskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f6df5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4f6df5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f0f0f0"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  ticks={[0, 3, 6, 9, 12]}
                />
                <Tooltip
                  contentStyle={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "13px",
                  }}
                  cursor={{
                    stroke: "#4f6df5",
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="tasks"
                  stroke="#4f6df5"
                  strokeWidth={2.5}
                  fill="url(#taskGrad)"
                  dot={{ r: 4, fill: "#4f6df5", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="db-feed-card">
            <div className="db-feed-header">
              <h2 className="db-section-title">Activity Feed</h2>
              <a href="#" className="db-view-all">
                View all
              </a>
            </div>
            <div className="db-feed-list">
              {activityFeed.map((item) => (
                <div key={item.id} className="db-feed-item">
                  <span
                    className="db-feed-dot"
                    style={{ background: item.color }}
                  />
                  <div>
                    <p className="db-feed-text">{item.text}</p>
                    <p className="db-feed-time">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="db-tasks-card">
          <div className="db-tasks-header">
            <h2 className="db-section-title">Recent Tasks</h2>
            <a href="#" className="db-view-all">
              View all tasks →
            </a>
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
