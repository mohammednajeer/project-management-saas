import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Search,
  TrendingUp,
  TrendingDown,
  FolderOpen,
  CheckSquare,
  Users,
  Clock,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  MoreHorizontal,
  Zap,
  Target,
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
  Legend,
} from "recharts";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import useNotifications from "../../context/useNotifications";
import "./Dashboard.css";

/* ─── STATIC FALLBACK DATA ──────────────────────────────────────────── */
const DEFAULT_CHART_DATA = [
  { day: "Mon", tasks: 0 },
  { day: "Tue", tasks: 0 },
  { day: "Wed", tasks: 0 },
  { day: "Thu", tasks: 0 },
  { day: "Fri", tasks: 0 },
  { day: "Sat", tasks: 0 },
  { day: "Sun", tasks: 0 },
];

/* ─── CONFIG ─────────────────────────────────────────────────────────── */
const PRIORITY_COLORS = {
  critical: "#ef4444",
  high:     "#f97316",
  medium:   "#8b5cf6",
  low:      "#94a3b8",
};

const STATUS_STYLES = {
  backlog:     { label: "Backlog",     bg: "#f1f5f9", color: "#64748b" },
  todo:        { label: "Backlog",     bg: "#f1f5f9", color: "#64748b" },
  pending:     { label: "Pending",     bg: "#fef9c3", color: "#a16207" },
  in_progress: { label: "In Progress", bg: "#dbeafe", color: "#1d4ed8" },
  inprogress:  { label: "In Progress", bg: "#dbeafe", color: "#1d4ed8" },
  review:      { label: "Review",      bg: "#ede9fe", color: "#6d28d9" },
  done:        { label: "Done",        bg: "#dcfce7", color: "#15803d" },
  completed:   { label: "Done",        bg: "#dcfce7", color: "#15803d" },
};

const PIE_COLORS = ["#94a3b8", "#3b82f6", "#8b5cf6", "#22c55e"];

const ACTIVITY_COLORS = {
  task_created:    "#22c55e",
  subtask_created: "#8b5cf6",
  comment_added:   "#f59e0b",
  task_updated:    "#3b82f6",
  subtask_updated: "#3b82f6",
  default:         "#94a3b8",
};

const STATUS_DISTRIBUTION_CONFIG = [
  { key: "backlog",     name: "Backlog",     color: "#94a3b8" },
  { key: "in_progress", name: "In Progress", color: "#3b82f6" },
  { key: "review",      name: "Review",      color: "#8b5cf6" },
  { key: "done",        name: "Done",        color: "#22c55e" },
];

const CARD_GRADIENTS = [
  { from: "#6354c4", to: "#9b7ff4", icon: FolderOpen,    shadow: "rgba(99,84,196,0.35)" },
  { from: "#3b82f6", to: "#60a5fa", icon: CheckSquare,   shadow: "rgba(59,130,246,0.35)" },
  { from: "#f97316", to: "#fb923c", icon: Clock,         shadow: "rgba(249,115,22,0.35)"  },
  { from: "#22c55e", to: "#4ade80", icon: CheckSquare,   shadow: "rgba(34,197,94,0.35)"   },
  { from: "#06b6d4", to: "#22d3ee", icon: Users,         shadow: "rgba(6,182,212,0.35)"   },
  { from: "#ef4444", to: "#f87171", icon: AlertTriangle, shadow: "rgba(239,68,68,0.35)"   },
];

/* ─── HELPERS ─────────────────────────────────────────────────────────── */
const formatLabel  = (v) => !v ? "None" : String(v).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const formatDueDate = (v) => { if (!v) return "No date"; const d = new Date(v); return isNaN(d) ? v : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); };
const formatRelativeTime = (v) => {
  if (!v) return "";
  const diff = Date.now() - new Date(v).getTime();
  const m = Math.floor(Math.max(0, diff) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  if (Math.floor(h / 24) === 1) return "Yesterday";
  return `${Math.floor(h / 24)}d ago`;
};

const extractQuoted = (msg) => { const m = String(msg || "").match(/'([^']+)'|"([^"]+)"/); return m?.[1] || m?.[2] || ""; };
const buildActivityText = (a) => {
  const who  = a.user_data?.name || "Someone";
  const name = extractQuoted(a.message);
  const q    = name ? ` "${name}"` : "";
  const map  = { task_created: "created task", subtask_created: "created subtask", task_updated: "updated task", subtask_updated: "updated subtask", comment_added: "added a comment" };
  return map[a.action] ? `${who} ${map[a.action]}${q}` : (a.message ? `${who} ${a.message}` : `${who} recorded activity`);
};

const getProjectName = (t) => { const p = t.project || t.project_name; if (!p) return "No project"; if (typeof p === "string") return p; return p.name || p.title || "No project"; };
const getAssigneeName = (t) => {
  const a = t.assigned_users || t.assignee || t.assignee_name || t.user || t.user_data;
  if (!a) return "Unassigned";
  if (Array.isArray(a)) return a.map(u => u.name || u.email).filter(Boolean).join(", ") || "Unassigned";
  return typeof a === "string" ? a : (a.name || a.email || "Unassigned");
};
const normalizeStatus = (s) => { const k = String(s || "").toLowerCase().replace(/\s+/g, "_"); if (k === "backlog" || k === "todo") return "backlog"; if (k === "inprogress" || k === "in_progress") return "in_progress"; if (k === "completed" || k === "done") return "done"; return k || "backlog"; };
const buildInitials = (t) => { const src = getAssigneeName(t) || getProjectName(t) || t.title || "?"; return src.split(" ").filter(Boolean).slice(0, 2).map(w => w.charAt(0).toUpperCase()).join(""); };

const AVATAR_COLORS = ["#6354c4", "#3b82f6", "#f97316", "#22c55e", "#06b6d4", "#ef4444", "#8b5cf6", "#f59e0b"];

const mapRecentTask = (task, i) => {
  const pk  = String(task.priority || "").toLowerCase();
  const sk  = normalizeStatus(task.status);
  const ss  = STATUS_STYLES[sk] || { label: formatLabel(task.status), bg: "#f1f5f9", color: "#64748b" };
  return {
    id:          task.id || `${task.title}-${i}`,
    task:        task.title || task.task || "Untitled",
    project:     getProjectName(task),
    priority:    formatLabel(task.priority),
    priorityColor: PRIORITY_COLORS[pk] || "#94a3b8",
    status:      ss.label,
    statusBg:    ss.bg,
    statusColor: ss.color,
    assignee:    buildInitials(task),
    assigneeBg:  AVATAR_COLORS[i % AVATAR_COLORS.length],
    due:         formatDueDate(task.due_date || task.due),
  };
};

const mapActivity = (a, i) => ({
  id:    a.id || `${a.action}-${i}`,
  text:  buildActivityText(a),
  time:  formatRelativeTime(a.created_at),
  color: ACTIVITY_COLORS[a.action] || ACTIVITY_COLORS.default,
});

const normalizeChartPoint = (p, i) => ({
  day:   p.day || p.label || DEFAULT_CHART_DATA[i]?.day || "",
  tasks: Number(p.tasks ?? p.count ?? p.value ?? 0),
});

/* ─── CUSTOM TOOLTIP ─────────────────────────────────────────────────── */
function GlassTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="db-tooltip">
      <div className="db-tooltip-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="db-tooltip-row" style={{ color: p.color }}>
          <span className="db-tooltip-dot" style={{ background: p.color }} />
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

/* ─── GREETING ────────────────────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/* ═══════════════════════════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { user }  = useAuth();
  const { unreadCount } = useNotifications();

  const [overview,          setOverview]         = useState(null);
  const [loading,           setLoading]          = useState(true);
  const [activities,        setActivities]        = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  /* ── Fetch overview ── */
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await api.get("/dashboard/overview/");
        if (!ignore) setOverview(res.data);
      } catch {}
      finally { if (!ignore) setLoading(false); }
    })();
    return () => { ignore = true; };
  }, []);

  /* ── Fetch activities ── */
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await api.get("/activities/");
        if (!ignore) setActivities(Array.isArray(res.data) ? res.data : []);
      } catch {}
      finally { if (!ignore) setActivitiesLoading(false); }
    })();
    return () => { ignore = true; };
  }, []);

  /* ── Derived data ── */
  const rawRecentTasks = useMemo(() => Array.isArray(overview?.recent_tasks) ? overview.recent_tasks : [], [overview]);

  const chartData = Array.isArray(overview?.weekly_task_activity)
    ? overview.weekly_task_activity.map(normalizeChartPoint)
    : DEFAULT_CHART_DATA;

  const recentTasks = useMemo(() => rawRecentTasks.map(mapRecentTask), [rawRecentTasks]);
  const activityFeed = useMemo(() => activities.slice(0, 6).map(mapActivity), [activities]);

  const statusDistribution = useMemo(() => {
    const counts = { backlog: 0, in_progress: 0, review: 0, done: 0 };
    if (Array.isArray(overview?.task_status_distribution)) {
      overview.task_status_distribution.forEach(item => {
        const k = normalizeStatus(item.status || item.name);
        if (counts[k] !== undefined) counts[k] += Number(item.count ?? item.value ?? 0);
      });
    } else {
      rawRecentTasks.forEach(t => { const k = normalizeStatus(t.status); if (counts[k] !== undefined) counts[k]++; });
    }
    return STATUS_DISTRIBUTION_CONFIG.map(item => ({ name: item.name, value: counts[item.key], color: item.color }));
  }, [overview, rawRecentTasks]);

  const teamWorkload = useMemo(() => {
    if (Array.isArray(overview?.team_workload)) {
      return overview.team_workload.map((item, i) => ({
        name:  item.name || "Unassigned",
        tasks: Number(item.tasks ?? item.count ?? 0),
        color: AVATAR_COLORS[i % AVATAR_COLORS.length],
      }));
    }
    const acc = {};
    rawRecentTasks.forEach(t => { const n = getAssigneeName(t); acc[n] = (acc[n] || 0) + 1; });
    return Object.entries(acc).map(([name, tasks], i) => ({ name, tasks, color: AVATAR_COLORS[i % AVATAR_COLORS.length] }));
  }, [overview, rawRecentTasks]);

  const projectProgress = useMemo(() => {
    const projects = {};
    rawRecentTasks.forEach(t => {
      const name = getProjectName(t);
      if (!projects[name]) projects[name] = { total: 0, done: 0 };
      projects[name].total++;
      if (normalizeStatus(t.status) === "done") projects[name].done++;
    });
    return Object.entries(projects).map(([name, d], i) => ({
      name,
      pct:   d.total > 0 ? Math.round((d.done / d.total) * 100) : 0,
      color: AVATAR_COLORS[i % AVATAR_COLORS.length],
    }));
  }, [rawRecentTasks]);

  const statCards = useMemo(() => [
    { value: overview?.total_projects  ?? 0, label: "Total Projects",  trend: "Workspace projects",   up: true,  ...CARD_GRADIENTS[0] },
    { value: overview?.total_tasks     ?? 0, label: "Total Tasks",      trend: "All tracked tasks",    up: true,  ...CARD_GRADIENTS[1] },
    { value: overview?.pending_tasks   ?? 0, label: "Pending",          trend: "Awaiting completion",  up: false, ...CARD_GRADIENTS[2] },
    { value: overview?.completed_tasks ?? 0, label: "Completed",        trend: "Finished tasks",       up: true,  ...CARD_GRADIENTS[3] },
    { value: overview?.team_members    ?? 0, label: "Team Members",     trend: "Active members",       up: null,  ...CARD_GRADIENTS[4] },
    { value: overview?.overdue_tasks   ?? 0, label: "Overdue",          trend: "Need attention",       up: false, ...CARD_GRADIENTS[5] },
  ], [overview]);

  const firstName = user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const completionPct = useMemo(() => {
    const total = overview?.total_tasks || 0;
    const done  = overview?.completed_tasks || 0;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [overview]);

  /* ── Render ── */
  return (
    <div className="db-page">

      {/* ══ TOPBAR ══════════════════════════════════════════════════ */}
      <header className="db-topbar">
        <div className="db-topbar-left">
          <div className="db-search-wrap">
            <Search size={14} className="db-search-icon" />
            <input className="db-search-input" placeholder="Search projects, tasks, people…" />
          </div>
        </div>

        <div className="db-topbar-right">
          <Link to="/dashboard/notifications" className="db-notif-btn">
            <Bell size={18} />
            {unreadCount > 0 && <span className="db-notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
          </Link>

          <Link to="/dashboard/profile" className="db-user-chip">
            <div className="db-user-avatar">
              {user?.profile_picture
                ? <img src={user.profile_picture} alt="" />
                : (user?.name || user?.email || "U").charAt(0).toUpperCase()}
            </div>
            <div className="db-user-info">
              <span className="db-user-name">{user?.name || user?.email || "User"}</span>
              <span className="db-user-role">{user?.role || "Member"}</span>
            </div>
          </Link>
        </div>
      </header>

      {/* ══ CONTENT ════════════════════════════════════════════════ */}
      <div className="db-content">

        {/* ── WELCOME HERO ── */}
        <div className="db-hero">
          <div className="db-hero-left">
            <div className="db-hero-eyebrow">
              <span className="db-pulse" />
              All systems operational
            </div>
            <h1 className="db-hero-title">
              {getGreeting()}, {firstName} 👋
            </h1>
            <p className="db-hero-sub">
              {overview?.overdue_tasks > 0
                ? `You have ${overview.overdue_tasks} overdue task${overview.overdue_tasks > 1 ? "s" : ""} that need attention.`
                : "Everything looks great — here's your workspace overview."}
            </p>

            {/* Quick stats strip */}
            <div className="db-hero-strip">
              <div className="db-hero-strip-item">
                <span className="db-hero-strip-val">{loading ? "…" : (overview?.total_projects ?? 0)}</span>
                <span className="db-hero-strip-label">Projects</span>
              </div>
              <div className="db-hero-strip-div" />
              <div className="db-hero-strip-item">
                <span className="db-hero-strip-val">{loading ? "…" : (overview?.total_tasks ?? 0)}</span>
                <span className="db-hero-strip-label">Total Tasks</span>
              </div>
              <div className="db-hero-strip-div" />
              <div className="db-hero-strip-item">
                <span className="db-hero-strip-val">{loading ? "…" : `${completionPct}%`}</span>
                <span className="db-hero-strip-label">Completion</span>
              </div>
              <div className="db-hero-strip-div" />
              <div className="db-hero-strip-item">
                <span className="db-hero-strip-val">{loading ? "…" : (overview?.team_members ?? 0)}</span>
                <span className="db-hero-strip-label">Members</span>
              </div>
            </div>
          </div>

          {/* Completion ring */}
          <div className="db-hero-ring-wrap">
            <svg viewBox="0 0 120 120" className="db-ring-svg">
              <defs>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%"   stopColor="#6354c4" />
                  <stop offset="100%" stopColor="#9b7ff4" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="50"
                fill="none"
                stroke="url(#ringGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 50}`}
                strokeDashoffset={`${2 * Math.PI * 50 * (1 - completionPct / 100)}`}
                transform="rotate(-90 60 60)"
                style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1)" }}
              />
            </svg>
            <div className="db-ring-center">
              <span className="db-ring-pct">{completionPct}</span>
              <span className="db-ring-unit">%</span>
            </div>
            <p className="db-ring-caption">Tasks done</p>
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="db-stat-grid" aria-busy={loading}>
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="db-stat-card">
                <div
                  className="db-stat-icon"
                  style={{ background: `linear-gradient(135deg, ${card.from}, ${card.to})`, boxShadow: `0 8px 20px ${card.shadow}` }}
                >
                  <Icon size={20} color="#fff" />
                </div>
                <div className="db-stat-body">
                  <div className="db-stat-value">{loading ? "—" : card.value}</div>
                  <div className="db-stat-label">{card.label}</div>
                  <div className={`db-stat-trend ${card.up === false ? "down" : card.up === null ? "neutral" : "up"}`}>
                    {card.up === true  && <TrendingUp  size={11} />}
                    {card.up === false && <TrendingDown size={11} />}
                    {card.up === null  && <span style={{ fontSize: 10 }}>→</span>}
                    {card.trend}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── MID ROW: Area Chart + Activity Feed ── */}
        <div className="db-mid-row">

          {/* Area chart */}
          <div className="db-card db-chart-card">
            <div className="db-card-header">
              <div>
                <h2 className="db-card-title">Task Activity</h2>
                <p className="db-card-sub">Tasks completed this week</p>
              </div>
              <span className="db-live-badge">
                <span className="db-pulse db-pulse--green" />
                Live
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6354c4" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#6354c4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,84,196,0.08)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<GlassTooltip />} />
                <Area
                  type="monotone"
                  dataKey="tasks"
                  name="Tasks"
                  stroke="#6354c4"
                  strokeWidth={2.5}
                  fill="url(#areaGrad)"
                  dot={{ r: 4, fill: "#6354c4", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#6354c4", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Activity feed */}
          <div className="db-card db-feed-card">
            <div className="db-card-header">
              <div>
                <h2 className="db-card-title">Activity Feed</h2>
                <p className="db-card-sub">Recent workspace updates</p>
              </div>
              <Link to="/dashboard/activity" className="db-link-btn">View all <ArrowRight size={12} /></Link>
            </div>

            <div className="db-feed-list">
              {activitiesLoading ? (
                [1, 2, 3].map(i => <div key={i} className="db-feed-skeleton" />)
              ) : activityFeed.length === 0 ? (
                <div className="db-feed-empty">
                  <Zap size={22} />
                  <p>No recent activity</p>
                </div>
              ) : (
                activityFeed.map(item => (
                  <div key={item.id} className="db-feed-item">
                    <span className="db-feed-dot" style={{ background: item.color, boxShadow: `0 0 0 3px ${item.color}22` }} />
                    <div className="db-feed-body">
                      <p className="db-feed-text">{item.text}</p>
                      <time className="db-feed-time">{item.time}</time>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── BOTTOM ROW: 3 charts ── */}
        <div className="db-bottom-row">

          {/* Donut — Task Distribution */}
          <div className="db-card db-donut-card">
            <div className="db-card-header">
              <div>
                <h2 className="db-card-title">Task Distribution</h2>
                <p className="db-card-sub">By status</p>
              </div>
            </div>
            <div className="db-donut-body">
              <ResponsiveContainer width={150} height={150}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%" cy="50%"
                    innerRadius={42} outerRadius={68}
                    dataKey="value"
                    strokeWidth={3}
                    stroke="#f0f2fa"
                  >
                    {statusDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<GlassTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="db-donut-legend">
                {statusDistribution.map(s => (
                  <div key={s.name} className="db-legend-row">
                    <span className="db-legend-dot" style={{ background: s.color }} />
                    <span className="db-legend-name">{s.name}</span>
                    <span className="db-legend-val">{loading ? "…" : s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Project Progress */}
          <div className="db-card db-progress-card">
            <div className="db-card-header">
              <div>
                <h2 className="db-card-title">Project Progress</h2>
                <p className="db-card-sub">Completion by project</p>
              </div>
              <Target size={16} className="db-card-icon-accent" />
            </div>
            <div className="db-progress-list">
              {projectProgress.length === 0 ? (
                <div className="db-feed-empty"><p>No project data yet</p></div>
              ) : (
                projectProgress.map(p => (
                  <div key={p.name} className="db-progress-item">
                    <div className="db-progress-meta">
                      <span className="db-progress-name">{p.name}</span>
                      <span className="db-progress-pct" style={{ color: p.color }}>{p.pct}%</span>
                    </div>
                    <div className="db-progress-track">
                      <div
                        className="db-progress-fill"
                        style={{ width: `${p.pct}%`, background: `linear-gradient(90deg, ${p.color}, ${p.color}cc)` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Team Workload Bar Chart */}
          <div className="db-card db-workload-card">
            <div className="db-card-header">
              <div>
                <h2 className="db-card-title">Team Workload</h2>
                <p className="db-card-sub">Tasks per member</p>
              </div>
              <Sparkles size={15} className="db-card-icon-accent" />
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={teamWorkload} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,84,196,0.08)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<GlassTooltip />} />
                <Bar dataKey="tasks" name="Tasks" radius={[6, 6, 0, 0]} barSize={26}>
                  {teamWorkload.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── RECENT TASKS TABLE ── */}
        <div className="db-card db-table-card">
          <div className="db-card-header">
            <div>
              <h2 className="db-card-title">Recent Tasks</h2>
              <p className="db-card-sub">Latest activity across all projects</p>
            </div>
            <Link to="/dashboard/tasks" className="db-link-btn">
              View all <ArrowRight size={12} />
            </Link>
          </div>

          <div className="db-table-wrap">
            <table className="db-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i}>
                      <td colSpan={6}><div className="db-table-skeleton" /></td>
                    </tr>
                  ))
                ) : recentTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="db-table-empty">No recent tasks found</td>
                  </tr>
                ) : (
                  recentTasks.map(row => (
                    <tr key={row.id}>
                      <td className="db-task-name">{row.task}</td>
                      <td className="db-task-project">{row.project}</td>
                      <td>
                        <span className="db-priority-tag" style={{ color: row.priorityColor, background: `${row.priorityColor}14`, borderColor: `${row.priorityColor}30` }}>
                          <span className="db-priority-dot" style={{ background: row.priorityColor }} />
                          {row.priority}
                        </span>
                      </td>
                      <td>
                        <span className="db-status-tag" style={{ background: row.statusBg, color: row.statusColor }}>
                          {row.status}
                        </span>
                      </td>
                      <td>
                        <div className="db-assignee-chip" style={{ background: row.assigneeBg }}>
                          {row.assignee}
                        </div>
                      </td>
                      <td className="db-due-date">{row.due}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}