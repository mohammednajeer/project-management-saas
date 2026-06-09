import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ListChecks,
  Target,
  TrendingUp,
  Zap,
  FileEdit,
  StickyNote,
  Upload,
  LayoutList,
  MessageSquarePlus,
  Sparkles,
  Building2,
} from "lucide-react";
import {
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

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { getCompanyFromUser, getCompanyInitials, getCompanyName } from "../../utils/company";
import checkBoxesIllustration from "../../assets/images/undraw_check-boxes_x5fg.svg";
import "./WorkspaceHome.css";

/* ─── CONSTANTS ──────────────────────────────────────────────────────────── */
const initialDashboard = {
  assigned_tasks: 0,
  assigned_subtasks: 0,
  completed_subtasks: 0,
  pending_subtasks: 0,
  review_subtasks: 0,
  overdue_subtasks: 0,
  completion_rate: 0,
  high_priority_subtasks: 0,
  critical_subtasks: 0,
  recent_subtasks: [],
  upcoming_deadlines: [],
};

const STATUS_LABELS = {
  todo:        "Todo",
  in_progress: "In Progress",
  review:      "Review",
  done:        "Done",
};

const STATUS_PILL_CLASS = {
  todo:        "wh-status-pill--todo",
  in_progress: "wh-status-pill--in_progress",
  review:      "wh-status-pill--review",
  done:        "wh-status-pill--done",
};

const DEADLINE_COLORS = {
  todo:        "#a3a6af",
  in_progress: "#3b82f6",
  review:      "#8b5cf6",
  done:        "#16a34a",
};

const STAT_CARDS_CONFIG = [
  { label: "Assigned Tasks", key: "assigned_tasks", icon: Target, from: "#17191c", to: "#4c4c4c", shadow: "rgba(23,25,28,0.18)", suffix: "" },
  { label: "Assigned Subtasks", key: "assigned_subtasks", icon: ListChecks, from: "#3b82f6", to: "#5B8CB8", shadow: "rgba(91,140,184,0.22)", suffix: "" },
  { label: "Completed", key: "completed_subtasks", icon: CheckCircle2, from: "#16a34a", to: "#3D9A5F", shadow: "rgba(61,154,95,0.22)", suffix: "" },
  { label: "Pending", key: "pending_subtasks", icon: Clock3, from: "#D4835E", to: "#E0A07A", shadow: "rgba(212,131,94,0.22)", suffix: "" },
  { label: "Overdue", key: "overdue_subtasks", icon: AlertTriangle, from: "#dc2626", to: "#C96442", shadow: "rgba(220,38,38,0.22)", suffix: "" },
  { label: "Completion Rate", key: "completion_rate", icon: TrendingUp, from: "#777b86", to: "#a3a6af", shadow: "rgba(92,92,92,0.16)", suffix: "%" },
];

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
function formatDate(value) {
  if (!value) return "No due date";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

function formatRelative(value) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function getHour() {
  return new Date().getHours();
}

function greeting() {
  const h = getHour();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/* ─── SVG PROGRESS RING ──────────────────────────────────────────────────── */
function ProgressRing({ value }) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="wh-ring-wrap">
      <svg className="wh-ring-svg" viewBox="0 0 80 80">
        <defs>
          <linearGradient id="wh-ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#17191c" />
            <stop offset="100%" stopColor="#777b86" />
          </linearGradient>
        </defs>
        <circle className="wh-ring-track" cx="40" cy="40" r={r} />
        <circle
          className="wh-ring-fill"
          cx="40" cy="40" r={r}
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="wh-ring-center">
        <span className="wh-ring-value">{value}%</span>
        <span className="wh-ring-label">done</span>
      </div>
    </div>
  );
}

/* ─── LOADING SKELETON ───────────────────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="wh-page">
      <div className="wh-loading-wrap">
        <div className="wh-skeleton wh-skeleton-hero" style={{ height: "140px", borderRadius: "24px" }} />
        <div className="wh-skeleton-row" style={{ marginTop: "16px" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="wh-skeleton wh-skeleton-card" style={{ height: "108px", borderRadius: "22px" }} />
          ))}
        </div>
        <div className="wh-skeleton-row" style={{ gridTemplateColumns: "1fr 1fr", marginTop: "16px" }}>
          <div className="wh-skeleton wh-skeleton-block" style={{ height: "200px", borderRadius: "24px" }} />
          <div className="wh-skeleton wh-skeleton-block" style={{ height: "200px", borderRadius: "24px" }} />
        </div>
      </div>
    </div>
  );
}



/* ─── QUICK ACTION BTN ───────────────────────────────────────────────────── */
function ActionBtn({ icon: Icon, iconBg, iconColor, label, onClick }) {
  return (
    <button className="wh-action-btn" onClick={onClick} type="button">
      <div className="wh-action-icon" style={{ background: iconBg, color: iconColor }}>
        <Icon size={15} />
      </div>
      <span className="wh-action-label">{label}</span>
    </button>
  );
}

/* ─── CUSTOM TOOLTIP ─────────────────────────────────────────────────── */
function GlassTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="wh-tooltip">
      <div className="wh-tooltip-label">{label || "Value"}</div>
      {payload.map((p, i) => (
        <div key={i} className="wh-tooltip-row" style={{ color: p.color || p.payload?.color }}>
          <span className="wh-tooltip-dot" style={{ background: p.color || p.payload?.color }} />
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function WorkspaceHome() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [subtasksList, setSubtasksList] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [activityFeed, setActivityFeed] = useState([]);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        const [dashRes, feedRes, subtasksRes] = await Promise.all([
          api.get("/workspace/dashboard/"),
          api.get("/workspace/activity-feed/?limit=6").catch(err => {
            console.warn("Could not load activity feed:", err);
            return { data: [] };
          }),
          api.get("/workspace/subtasks/").catch(err => {
            console.warn("Could not load subtasks list for workspace analytics:", err);
            return { data: [] };
          })
        ]);

        if (!active) return;

        setDashboard({ ...initialDashboard, ...dashRes.data });
        setActivityFeed(feedRes.data);
        setSubtasksList(Array.isArray(subtasksRes.data) ? subtasksRes.data : []);
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message || "Could not load your dashboard."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      active = false;
    };
  }, []);

  /* ── Derived data ─────────────────────────────────────────────────────── */

  const statusDistribution = useMemo(() => {
    const counts = { todo: 0, in_progress: 0, review: 0, done: 0 };
    subtasksList.forEach((s) => {
      const status = s.status || "todo";
      if (counts[status] !== undefined) counts[status]++;
    });
    return [
      { name: "Todo", value: counts.todo, color: "#a3a6af" },
      { name: "In Progress", value: counts.in_progress, color: "#3b82f6" },
      { name: "Review", value: counts.review, color: "#8b5cf6" },
      { name: "Completed", value: counts.done, color: "#16a34a" },
    ];
  }, [subtasksList]);

  const priorityDistribution = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    subtasksList.forEach((s) => {
      const p = (s.priority || "medium").toLowerCase();
      if (counts[p] !== undefined) counts[p]++;
    });
    return [
      { name: "Critical", count: counts.critical, color: "#dc2626" },
      { name: "High", count: counts.high, color: "#f97316" },
      { name: "Medium", count: counts.medium, color: "#3b82f6" },
      { name: "Low", count: counts.low, color: "#a3a6af" },
    ];
  }, [subtasksList]);

  const activityPreview = useMemo(
    () => activityFeed.slice(0, 5),
    [activityFeed]
  );

  const quickActions = [
    { icon: MessageSquarePlus, iconBg: "rgba(251, 225, 209, 0.4)", iconColor: "#d97706", label: "Raise Issue" },
    { icon: FileEdit,          iconBg: "rgba(211, 227, 252, 0.3)", iconColor: "#3b82f6", label: "Update Task" },
    { icon: StickyNote,        iconBg: "rgba(251, 225, 209, 0.4)", iconColor: "#d97706", label: "Add Note" },
    { icon: Upload,            iconBg: "rgba(22, 163, 74, 0.1)", iconColor: "#16a34a", label: "Upload Work" },
    { icon: LayoutList,        iconBg: "rgba(211, 227, 252, 0.3)", iconColor: "#3b82f6", label: "View Tasks" },
  ];

  /* Focus summary for hero */
  const overdueCount  = dashboard.overdue_subtasks;
  const pendingCount  = dashboard.pending_subtasks;
  const company = getCompanyFromUser(user);
  const companyName = getCompanyName(company, user?.organization || "Your company");

  /* ── Guards ───────────────────────────────────────────────────────────── */
  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="wh-page">
        <div className="wh-error">{error}</div>
      </div>
    );
  }

  const ACTIVITY_COLORS = {
    task_create: "#3b82f6",
    task_update: "#3b82f6",
    task_complete: "#16a34a",
    issue_create: "#dc2626",
    issue_assigned: "#f97316",
    subtask_updated: "#16a34a",
    comment_added: "#3b82f6",
  };

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="wh-page">

      {/* ── 1. HERO ──────────────────────────────────────────────────────── */}
      <section className="wh-hero wh-glass">
        <div className="wh-hero-left">
          <div className="wh-hero-eyebrow">
            <span className="wh-hero-dot" />
            Workspace — Productivity OS
          </div>
          <div className="wh-company-chip">
            <span className="wh-company-logo">
              {company?.logo ? (
                <img src={company.logo} alt="" />
              ) : (
                getCompanyInitials(company, "PF")
              )}
            </span>
            <span>
              <small>Organization</small>
              <strong>{companyName}</strong>
            </span>
            <Building2 size={15} />
          </div>
          <h1 className="wh-hero-greeting">
            {greeting()}, let's get to work 👋
          </h1>
          <p className="wh-hero-sub">
            {overdueCount > 0
              ? `You have ${overdueCount} overdue item${overdueCount !== 1 ? "s" : ""} and ${pendingCount} pending subtasks.`
              : `You have ${pendingCount} active subtasks and ${dashboard.upcoming_deadlines.length} upcoming deadlines.`}
          </p>
          <div className="wh-hero-badges">
            {overdueCount > 0 && (
              <span className="wh-hero-badge wh-hero-badge--warn">
                ⚠ {overdueCount} Overdue
              </span>
            )}
            {dashboard.high_priority_subtasks > 0 && (
              <span className="wh-hero-badge wh-hero-badge--info">
                🔥 {dashboard.high_priority_subtasks} High Priority
              </span>
            )}
            {dashboard.completion_rate >= 50 && (
              <span className="wh-hero-badge wh-hero-badge--ok">
                ✓ {dashboard.completion_rate}% Complete
              </span>
            )}
          </div>
        </div>
        <div className="wh-hero-right">
          <ProgressRing value={dashboard.completion_rate} />
        </div>
      </section>

      {/* ── 2. STAT CARDS ────────────────────────────────────────────────── */}
      <div className="wh-stats-grid">
        {STAT_CARDS_CONFIG.map((card) => {
          const Icon = card.icon;
          const val = dashboard[card.key] ?? 0;
          return (
            <article key={card.label} className="wh-stat-card wh-glass" style={{ flexDirection: "column", padding: "18px", gap: "12px", minHeight: "108px", color: card.from }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span className="wh-stat-value" style={{ fontSize: "26px" }}>{val}{card.suffix}</span>
                  <span className="wh-stat-label" style={{ fontSize: "11px" }}>{card.label}</span>
                </div>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: `linear-gradient(135deg, ${card.from}, ${card.to})`,
                  boxShadow: `0 6px 12px ${card.shadow}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff"
                }}>
                  <Icon size={16} />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* ── 4. ANALYTICS DECK ── */}
      <div className="wh-analytics-row">
        {/* Status Donut Chart */}
        <div className="wh-chart-card wh-glass">
          <div className="wh-chart-header">
            <div>
              <h2 className="wh-section-title">Status Distribution</h2>
              <p className="wh-section-sub">Subtasks by status</p>
            </div>
          </div>
          <div className="wh-donut-body">
            <ResponsiveContainer width={110} height={110}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={48}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="#ffffff"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<GlassTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="wh-donut-legend">
              {statusDistribution.map((s) => (
                <div key={s.name} className="wh-legend-row">
                  <div className="wh-legend-left">
                    <span className="wh-legend-dot" style={{ background: s.color }} />
                    <span>{s.name}</span>
                  </div>
                  <span className="wh-legend-val">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Priority Bar Chart */}
        <div className="wh-chart-card wh-glass">
          <div className="wh-chart-header">
            <div>
              <h2 className="wh-section-title">Subtask Priorities</h2>
              <p className="wh-section-sub">Assigned items by tier</p>
            </div>
          </div>
          <div style={{ width: "100%", height: "110px", marginTop: "10px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityDistribution} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,25,28,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#777b86" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#777b86" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<GlassTooltip />} />
                <Bar dataKey="count" name="Subtasks" radius={[4, 4, 0, 0]}>
                  {priorityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── 5 + 6. DEADLINES + ACTIVITY ──────────────────────────────────── */}
      <div className="wh-two-col">

        {/* Upcoming Deadlines */}
        <section className="wh-panel wh-glass wh-panel--fixed-height">
          <div className="wh-panel-header">
            <div>
              <h2 className="wh-section-title">Upcoming Deadlines</h2>
              <p className="wh-section-sub">Due within the next 7 days</p>
            </div>
            <CalendarClock size={17} className="wh-panel-icon" />
          </div>

          {dashboard.upcoming_deadlines.length === 0 ? (
            <div className="wh-empty-deadlines">
              <img src={checkBoxesIllustration} alt="No deadlines" className="wh-empty-illustration" />
              <p className="wh-empty">No upcoming deadlines — you're clear! 🎉</p>
            </div>
          ) : (
            <div className="wh-deadline-list">
              {dashboard.upcoming_deadlines.map((subtask) => {
                const statusKey = subtask.status || "todo";
                return (
                  <Link
                    key={subtask.id}
                    to={`/workspace/task/${subtask.task}?subtask=${subtask.id}`}
                    className="wh-deadline-item"
                    style={{ textDecoration: "none", cursor: "pointer" }}
                  >
                    <div
                      className="wh-deadline-line"
                      style={{ background: DEADLINE_COLORS[statusKey] || DEADLINE_COLORS.todo }}
                    />
                    <div className="wh-deadline-body">
                      <p className="wh-deadline-title">{subtask.title}</p>
                      <p className="wh-deadline-date">Due {formatDate(subtask.due_date)}</p>
                    </div>
                    <span className={`wh-status-pill ${STATUS_PILL_CLASS[statusKey] || "wh-status-pill--todo"}`}>
                      {STATUS_LABELS[statusKey] || subtask.status}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Activity Feed */}
        <section className="wh-panel wh-glass wh-panel--fixed-height">
          <div className="wh-panel-header">
            <div>
              <h2 className="wh-section-title">Activity Feed</h2>
              <p className="wh-section-sub">Latest workspace updates</p>
            </div>
            <Link to="/workspace/activity" className="wh-panel-action">
              View all
            </Link>
          </div>

          {activityPreview.length === 0 ? (
            <p className="wh-empty">No recent activity yet.</p>
          ) : (
            <div className="wh-feed-list">
              {activityPreview.map((item) => (
                <div key={item.id} className="wh-feed-item">
                  <span className="wh-feed-dot" style={{
                      background:
                        ACTIVITY_COLORS[item.type]
                        || ACTIVITY_COLORS[item.action]
                        || "#C96442"
                    }}/>
                  <div>
                    <p className="wh-feed-text">{item.message}</p>
                    <p className="wh-feed-time">
                      {formatRelative(item.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── 7 + 8. QUICK ACTIONS + TASK PREVIEW ──────────────────────────── */}
      <div className="wh-two-col">

        {/* Task Preview */}
        <section className="wh-panel wh-glass">
          <div className="wh-panel-header">
            <div>
              <h2 className="wh-section-title">Recent Subtasks</h2>
              <p className="wh-section-sub">Latest assigned work</p>
            </div>
            <ListChecks size={17} className="wh-panel-icon" />
          </div>

          {dashboard.recent_subtasks.length === 0 ? (
            <p className="wh-empty">No recent subtasks assigned.</p>
          ) : (
            <div className="wh-task-list">
              {dashboard.recent_subtasks.map((subtask) => {
                const statusKey = subtask.status || "todo";
                const priorityColors = {
                  critical: "#dc2626",
                  high:     "#f97316",
                  medium:   "#3b82f6",
                  low:      "#a3a6af",
                };
                const dotColor = priorityColors[subtask.priority?.toLowerCase()] || "#8A87A0";
                return (
                  <Link
                    key={subtask.id}
                    to={`/workspace/task/${subtask.task}?subtask=${subtask.id}`}
                    className="wh-task-item"
                    style={{ textDecoration: "none", cursor: "pointer" }}
                  >
                    <div
                      className="wh-task-priority-dot"
                      style={{ background: dotColor }}
                      title={subtask.priority || "No priority"}
                    />
                    <div className="wh-task-body">
                      <p className="wh-task-title">{subtask.title}</p>
                      <p className="wh-task-desc">
                        {subtask.description || "No description provided."}
                      </p>
                    </div>
                    <span className={`wh-status-pill ${STATUS_PILL_CLASS[statusKey] || "wh-status-pill--todo"}`}>
                      {STATUS_LABELS[statusKey] || subtask.status}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Quick Actions + Productivity Panel */}
        <div className="wh-prod-panel">

          {/* Quick Actions */}
          <section className="wh-panel wh-glass">
            <div className="wh-panel-header">
              <div>
                <h2 className="wh-section-title">Quick Actions</h2>
                <p className="wh-section-sub">Common workspace tasks</p>
              </div>
              <Zap size={17} className="wh-panel-icon" />
            </div>
            <div className="wh-actions-grid">
              {quickActions.map((action) => (
                <ActionBtn key={action.label} {...action} />
              ))}
            </div>
          </section>

          {/* Productivity Score */}
          <section className="wh-prod-card wh-glass">
            <div style={{ display: "flex", alignItems: "center", justifySpaceBetween: "space-between" }}>
              <h2 className="wh-section-title">Productivity Score</h2>
              <Sparkles size={15} style={{ color: "var(--text-3)" }} />
            </div>
            <div className="wh-prod-score">
              <span className="wh-prod-score-value">{dashboard.completion_rate}</span>
              <span className="wh-prod-score-max">/100</span>
            </div>
            <div className="wh-prod-bar-wrap">
              <div
                className="wh-prod-bar-fill"
                style={{ width: `${dashboard.completion_rate}%` }}
              />
            </div>
            <p className="wh-prod-insight">
              {dashboard.completion_rate >= 75
                ? "Excellent pace — you're ahead of schedule. 🚀"
                : dashboard.completion_rate >= 40
                ? "Good progress. Clear the overdue items next."
                : "Focus on high-priority tasks to build momentum."}
            </p>
          </section>

          {/* Today's Progress */}
          <section className="wh-prod-card wh-glass">
            <h2 className="wh-section-title" style={{ marginBottom: "10px" }}>Today's Progress</h2>

            {[
              { label: "Completed", value: dashboard.completed_subtasks, max: dashboard.assigned_subtasks },
              { label: "Pending",   value: dashboard.pending_subtasks,   max: dashboard.assigned_subtasks },
            ].map(({ label, value, max }) => {
              const pct = max > 0 ? Math.round((value / max) * 100) : 0;
              return (
                <div key={label} style={{ marginBottom: "10px" }}>
                  <div className="wh-prod-progress-row">
                    <span className="wh-prod-progress-label">{label}</span>
                    <span className="wh-prod-progress-value">{value} / {max}</span>
                  </div>
                  <div className="wh-prod-bar-wrap">
                    <div
                      className="wh-prod-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: label === "Pending"
                          ? "linear-gradient(90deg, #F59E0B, #FCD34D)"
                          : undefined,
                      }}
                    />
                  </div>
                </div>
              );
            })}

            <div className="wh-streak-row">
              <span className="wh-streak-icon">🔥</span>
              <span className="wh-streak-value">{Math.max(1, Math.floor(dashboard.completion_rate / 10))} day streak</span>
              <span className="wh-streak-label">keep it up</span>
            </div>
          </section>

          {/* Focus Mode */}
          <button className="wh-focus-mode-btn" type="button">
            <Zap size={14} />
            Enter Focus Mode
          </button>

        </div>
      </div>

    </div>
  );
}
