import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Flame,
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
} from "lucide-react";

import api from "../../services/api";
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
  todo:        "#8A87A0",
  in_progress: "#3B82F6",
  review:      "#6C53B3",
  done:        "#16A34A",
};

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
            <stop offset="0%"   stopColor="#6C53B3" />
            <stop offset="100%" stopColor="#9CAAF2" />
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
        <div className="wh-skeleton wh-skeleton-hero" />
        <div className="wh-skeleton-row">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="wh-skeleton wh-skeleton-card" />
          ))}
        </div>
        <div className="wh-skeleton-row" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="wh-skeleton wh-skeleton-block" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── FOCUS CARD ─────────────────────────────────────────────────────────── */
function FocusCard({ variant, icon: Icon, value, label }) {
  return (
    <div className={`wh-focus-card wh-focus-card--${variant}`}>
      <div className="wh-focus-icon">
        <Icon size={17} />
      </div>
      <div className="wh-focus-body">
        <div className="wh-focus-value">{value}</div>
        <div className="wh-focus-label">{label}</div>
      </div>
    </div>
  );
}

/* ─── STAT CARD ──────────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, iconBg, iconColor, value, label }) {
  return (
    <article className="wh-stat-card wh-glass">
      <div className="wh-stat-icon" style={{ background: iconBg, color: iconColor }}>
        <Icon size={17} />
      </div>
      <div className="wh-stat-body">
        <div className="wh-stat-value">{value}</div>
        <div className="wh-stat-label">{label}</div>
      </div>
    </article>
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

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function WorkspaceHome() {
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [activityFeed, setActivityFeed] =useState([]);

  const fetchActivityFeed = useCallback( async () => {

      try {

        const response =
          await api.get(
            "/workspace/activity-feed/"
          );

        setActivityFeed(
          response.data
        );

      } catch (err) {

        console.log(err);
      }
    });

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get("/workspace/dashboard/");
        setDashboard({ ...initialDashboard, ...response.data });
      } catch (err) {
        setError(
          err.response?.data?.message || "Could not load your dashboard."
        );
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
    fetchActivityFeed();
  }, []);

  /* ── Derived data ─────────────────────────────────────────────────────── */
  const statCards = useMemo(() => [
    {
      icon: Target,
      iconBg: "#F2EFFE", iconColor: "#6C53B3",
      value: dashboard.assigned_tasks,
      label: "Assigned Tasks",
    },
    {
      icon: ListChecks,
      iconBg: "#F5F3FF", iconColor: "#8B5CF6",
      value: dashboard.assigned_subtasks,
      label: "Assigned Subtasks",
    },
    {
      icon: CheckCircle2,
      iconBg: "#F0FDF4", iconColor: "#16A34A",
      value: dashboard.completed_subtasks,
      label: "Completed",
    },
    {
      icon: Clock3,
      iconBg: "#FFFBEB", iconColor: "#F59E0B",
      value: dashboard.pending_subtasks,
      label: "Pending",
    },
    {
      icon: TrendingUp,
      iconBg: "#EFF6FF", iconColor: "#3B82F6",
      value: `${dashboard.completion_rate}%`,
      label: "Completion Rate",
    },
  ], [dashboard]);

  const focusItems = useMemo(() => [
    { variant: "overdue",  icon: AlertTriangle, value: dashboard.overdue_subtasks,       label: "Overdue" },
    { variant: "review",   icon: CheckCircle2,  value: dashboard.review_subtasks ?? 0,   label: "In Review" },
    { variant: "high",     icon: Flame,         value: dashboard.high_priority_subtasks, label: "High Priority" },
    { variant: "critical", icon: Zap,           value: dashboard.critical_subtasks,      label: "Critical" },
    { variant: "today",    icon: CalendarClock, value: dashboard.upcoming_deadlines.length, label: "Due Soon" },
  ], [dashboard]);

  /* Simulate activity feed from recent_subtasks for realtime-ready design */
  // const activityFeed = useMemo(() =>
  //   dashboard.recent_subtasks.slice(0, 6).map((s, i) => ({
  //     id: s.id || i,
  //     text: `Subtask "${s.title}" assigned to you`,
  //     time: formatRelative(s.created_at || null),
  //     color: ["#6C53B3","#3B82F6","#16A34A","#F59E0B","#8B5CF6","#EF4444"][i % 6],
  //   }))
  // , [dashboard]);

  const quickActions = [
    { icon: MessageSquarePlus, iconBg: "#FEF2F2", iconColor: "#DC2626", label: "Raise Issue" },
    { icon: FileEdit,          iconBg: "#EFF6FF", iconColor: "#2563EB", label: "Update Task" },
    { icon: StickyNote,        iconBg: "#FFFBEB", iconColor: "#D97706", label: "Add Note" },
    { icon: Upload,            iconBg: "#F0FDF4", iconColor: "#16A34A", label: "Upload Work" },
    { icon: LayoutList,        iconBg: "#F5F3FF", iconColor: "#7C3AED", label: "View Tasks" },
  ];

  /* Focus summary for hero */
  const overdueCount  = dashboard.overdue_subtasks;
  const pendingCount  = dashboard.pending_subtasks;

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
  task_create: "#3B82F6",
  task_update: "#8B5CF6",
  task_complete: "#16A34A",
  issue_create: "#EF4444",
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

      {/* ── 2. FOCUS GRID ────────────────────────────────────────────────── */}
      <div className="wh-focus-grid">
        {focusItems.map((item) => (
          <FocusCard key={item.variant} {...item} />
        ))}
      </div>

      {/* ── 3. STAT CARDS ────────────────────────────────────────────────── */}
      <div className="wh-stats-grid">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* ── 4 + 5. DEADLINES + ACTIVITY ──────────────────────────────────── */}
      <div className="wh-two-col">

        {/* Upcoming Deadlines */}
        <section className="wh-panel wh-glass">
          <div className="wh-panel-header">
            <div>
              <h2 className="wh-section-title">Upcoming Deadlines</h2>
              <p className="wh-section-sub">Due within the next 7 days</p>
            </div>
            <CalendarClock size={17} className="wh-panel-icon" />
          </div>

          {dashboard.upcoming_deadlines.length === 0 ? (
            <p className="wh-empty">No upcoming deadlines — you're clear! 🎉</p>
          ) : (
            <div className="wh-deadline-list">
              {dashboard.upcoming_deadlines.map((subtask) => {
                const statusKey = subtask.status || "todo";
                return (
                  <div key={subtask.id} className="wh-deadline-item">
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
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Activity Feed */}
        <section className="wh-panel wh-glass">
          <div className="wh-panel-header">
            <div>
              <h2 className="wh-section-title">Activity Feed</h2>
              <p className="wh-section-sub">Latest assigned subtasks</p>
            </div>
            <Sparkles size={17} className="wh-panel-icon" />
          </div>

          {activityFeed.length === 0 ? (
            <p className="wh-empty">No recent activity yet.</p>
          ) : (
            <div className="wh-feed-list">
              {activityFeed.map((item) => (
                <div key={item.id} className="wh-feed-item">
                  <span className="wh-feed-dot" style={{
                      background:
                        ACTIVITY_COLORS[item.type]
                        || "#6C53B3"
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

      {/* ── 6 + 7. QUICK ACTIONS + TASK PREVIEW ──────────────────────────── */}
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
                  critical: "#EF4444",
                  high:     "#F59E0B",
                  medium:   "#8B5CF6",
                  low:      "#8A87A0",
                };
                const dotColor = priorityColors[subtask.priority?.toLowerCase()] || "#8A87A0";
                return (
                  <div key={subtask.id} className="wh-task-item">
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
                  </div>
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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