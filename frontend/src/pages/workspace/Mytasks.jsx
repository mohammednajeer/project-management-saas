import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  Paperclip,
  MessageCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Filter,
  Flame,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  MessageSquarePlus,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
  X,
  Circle,
  Eye,
  BarChart2,
  CalendarClock,
  Activity,
} from "lucide-react";

import api from "../../services/api";
import "./MyTasks.css";

/* ─── CONSTANTS ─────────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  todo:        { label: "Todo",        color: "#8A87A0", bg: "#F2F0F8", border: "rgba(138,135,160,0.2)" },
  in_progress: { label: "In Progress", color: "#3B82F6", bg: "#EFF6FF", border: "rgba(59,130,246,0.2)"  },
  review:      { label: "Review",      color: "#8B5CF6", bg: "#F5F3FF", border: "rgba(139,92,246,0.2)"  },
  done:        { label: "Done",        color: "#16A34A", bg: "#F0FDF4", border: "rgba(22,163,74,0.2)"   },
};

const PRIORITY_CONFIG = {
  critical: { label: "Critical", color: "#DC2626", bg: "rgba(220,38,38,0.08)",  icon: "🔴", dot: "#DC2626" },
  high:     { label: "High",     color: "#F59E0B", bg: "rgba(245,158,11,0.08)", icon: "🟠", dot: "#F59E0B" },
  medium:   { label: "Medium",   color: "#8B5CF6", bg: "rgba(139,92,246,0.08)", icon: "🟣", dot: "#8B5CF6" },
  low:      { label: "Low",      color: "#8A87A0", bg: "rgba(138,135,160,0.08)",icon: "⚪", dot: "#B8B5CC" },
};

const STATUS_TABS = [
  { key: "all",        label: "All",         icon: Layers      },
  { key: "todo",       label: "Todo",        icon: Circle      },
  { key: "in_progress",label: "In Progress", icon: Loader2     },
  { key: "review",     label: "Review",      icon: Eye         },
  { key: "done",       label: "Done",        icon: CheckCircle2},
  { key: "overdue",    label: "Overdue",     icon: AlertTriangle},
];

const SORT_OPTIONS = [
  { value: "due_date_asc",   label: "Due Date ↑" },
  { value: "due_date_desc",  label: "Due Date ↓" },
  { value: "priority_desc",  label: "Priority ↓" },
  { value: "title_asc",      label: "Title A–Z"  },
];

const PRIORITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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

function isOverdue(due_date, status) {
  if (!due_date || status === "done") return false;
  return new Date(due_date) < new Date();
}

function getDaysUntilDue(due_date) {
  if (!due_date) return null;
  const diff = new Date(due_date).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/* ─── LOADING SKELETON ──────────────────────────────────────────────────── */
function TaskSkeleton() {
  return (
    <div className="mt-skeleton-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="mt-task-skeleton">
          <div className="mt-sk mt-sk-bar" style={{ width: "60%" }} />
          <div className="mt-sk mt-sk-bar" style={{ width: "40%", marginTop: 6 }} />
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            <div className="mt-sk mt-sk-pill" />
            <div className="mt-sk mt-sk-pill" />
          </div>
          <div className="mt-sk mt-sk-bar" style={{ width: "30%", marginTop: 10 }} />
        </div>
      ))}
    </div>
  );
}

/* ─── EMPTY STATE ───────────────────────────────────────────────────────── */
function EmptyState({ filter }) {
  const configs = {
    all:        { emoji: "🎯", title: "No tasks assigned yet", sub: "Tasks assigned to you will appear here." },
    todo:       { emoji: "📋", title: "Nothing in Todo",        sub: "All clear — no tasks waiting to be started." },
    in_progress:{ emoji: "⚡", title: "Nothing in progress",    sub: "Start a task to see it here." },
    review:     { emoji: "👀", title: "Nothing in review",      sub: "No tasks awaiting review." },
    done:       { emoji: "🏆", title: "No completed tasks yet", sub: "Finish tasks to see them here." },
    overdue:    { emoji: "✅", title: "No overdue tasks!",       sub: "You're right on schedule — great work." },
  };
  const c = configs[filter] || configs.all;
  return (
    <div className="mt-empty">
      <div className="mt-empty-emoji">{c.emoji}</div>
      <h3 className="mt-empty-title">{c.title}</h3>
      <p className="mt-empty-sub">{c.sub}</p>
    </div>
  );
}

/* ─── DUE DATE BADGE ─────────────────────────────────────────────────────── */
function DueBadge({ due_date, status }) {
  if (!due_date) return <span className="mt-due mt-due--none">No due date</span>;
  const days = getDaysUntilDue(due_date);
  const overdue = isOverdue(due_date, status);

  if (overdue)     return <span className="mt-due mt-due--overdue">⚠ Overdue</span>;
  if (days === 0)  return <span className="mt-due mt-due--today">Due today</span>;
  if (days === 1)  return <span className="mt-due mt-due--tomorrow">Due tomorrow</span>;
  if (days <= 3)   return <span className="mt-due mt-due--soon">Due in {days}d</span>;
  return <span className="mt-due mt-due--normal">{formatDate(due_date)}</span>;
}

/* ─── PRIORITY BADGE ─────────────────────────────────────────────────────── */
function PriorityBadge({ priority }) {
  const key = priority?.toLowerCase() || "low";
  const cfg = PRIORITY_CONFIG[key] || PRIORITY_CONFIG.low;
  return (
    <span
      className="mt-priority-badge"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <span className="mt-priority-dot" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

/* ─── STATUS PILL ────────────────────────────────────────────────────────── */
function StatusPill({ status, onChange }) {
  const [open, setOpen] = useState(false);
  const key = status || "todo";
  const cfg = STATUS_CONFIG[key] || STATUS_CONFIG.todo;

  return (
    <div className="mt-status-wrap" onClick={(e) => e.stopPropagation()}>
      <button
        className="mt-status-pill"
        style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
        onClick={() => setOpen((o) => !o)}
      >
        {cfg.label}
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="mt-status-dropdown">
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <button
              key={k}
              className={`mt-status-option ${k === key ? "active" : ""}`}
              style={{ "--opt-color": v.color }}
              onClick={() => { onChange?.(k); setOpen(false); }}
            >
              <span className="mt-status-option-dot" style={{ background: v.color }} />
              {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── TASK CARD ──────────────────────────────────────────────────────────── */
function TaskCard({ task, onStatusChange, onRaiseIssue, onOpenTask }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const overdue = isOverdue(task.due_date, task.status);
  const priorityKey = task.priority?.toLowerCase() || "low";
  const priCfg = PRIORITY_CONFIG[priorityKey] || PRIORITY_CONFIG.low;

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <article className={`mt-task-card ${overdue ? "mt-task-card--overdue" : ""}`}>
      {/* Priority stripe */}
      <div className="mt-card-stripe" style={{ background: priCfg.dot }} />

      {/* Top row */}
      <div className="mt-card-top">
        <div className="mt-card-project">
          <Layers size={10} />
          {task.task?.project?.name || task.project?.name || "—"}
        </div>
        <div className="mt-card-actions-row">
          <button
            className="mt-card-icon-btn"
            title="Open Task"
            onClick={() => onOpenTask?.(task)}
          >
            <ExternalLink size={12} />
          </button>
          <button
            className="mt-card-icon-btn"
            title="Raise Issue"
            onClick={() => onRaiseIssue?.(task)}
          >
            <MessageSquarePlus size={12} />
          </button>
          <div className="mt-card-menu-wrap" ref={menuRef}>
            <button
              className="mt-card-icon-btn"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <MoreHorizontal size={12} />
            </button>
            {menuOpen && (
              <div className="mt-card-menu">
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <button
                    key={k}
                    className="mt-card-menu-item"
                    onClick={() => { onStatusChange?.(task.id, k); setMenuOpen(false); }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: v.color, display: "inline-block" }} />
                    Mark as {v.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Title */}
      <h3 className="mt-card-title">{task.title}</h3>
      {task.description && (
        <p className="mt-card-desc">{task.description}</p>
      )}

      {/* Task name if nested */}
      {task.task?.title && (
        <div className="mt-card-parent">
          <Target size={9} />
          {task.task.title}
        </div>
      )}

      {/* Badges row */}
      <div className="mt-card-badges">
        <PriorityBadge priority={task.priority} />
        <StatusPill status={task.status} onChange={(s) => onStatusChange?.(task.id, s)} />
      </div>

      {/* Footer */}
      <div className="mt-card-footer">
        <div className="mt-card-meta">
          <CalendarDays size={11} />
          <DueBadge due_date={task.due_date} status={task.status} />
        </div>
        <div className="mt-card-counts">
          {task.comments_count > 0 && (
            <span className="mt-card-count">
              <MessageCircle size={10} />
              {task.comments_count}
            </span>
          )}
          {task.attachments_count > 0 && (
            <span className="mt-card-count">
              <Paperclip size={10} />
              {task.attachments_count}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/* ─── SIDEBAR ────────────────────────────────────────────────────────────── */
function Sidebar({ tasks }) {
  const upcoming = useMemo(() =>
    tasks
      .filter((t) => t.due_date && t.status !== "done" && !isOverdue(t.due_date, t.status))
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
      .slice(0, 5),
    [tasks]
  );

  const overdueTasks = tasks.filter((t) => isOverdue(t.due_date, t.status));
  const done  = tasks.filter((t) => t.status === "done").length;
  const total = tasks.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  const byStatus = useMemo(() => {
    const counts = { todo: 0, in_progress: 0, review: 0, done: 0 };
    tasks.forEach((t) => { if (counts[t.status] !== undefined) counts[t.status]++; });
    return counts;
  }, [tasks]);

  const r = 30, circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <aside className="mt-sidebar">

      {/* Completion Ring */}
      <section className="mt-sidebar-card">
        <div className="mt-sb-header">
          <h3 className="mt-sb-title">Completion</h3>
          <TrendingUp size={14} className="mt-sb-icon" />
        </div>
        <div className="mt-sb-ring-wrap">
          <svg width="72" height="72" viewBox="0 0 72 72" className="mt-sb-ring-svg">
            <defs>
              <linearGradient id="mt-ring-g" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6C53B3" />
                <stop offset="100%" stopColor="#9CAAF2" />
              </linearGradient>
            </defs>
            <circle cx="36" cy="36" r={r} className="mt-sb-ring-track" />
            <circle
              cx="36" cy="36" r={r}
              className="mt-sb-ring-fill"
              strokeDasharray={circ}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="mt-sb-ring-center">
            <span className="mt-sb-ring-pct">{pct}%</span>
          </div>
        </div>
        <div className="mt-sb-bar-grid">
          {Object.entries(byStatus).map(([key, val]) => {
            const cfg = STATUS_CONFIG[key];
            const barPct = total > 0 ? Math.round((val / total) * 100) : 0;
            return (
              <div key={key} className="mt-sb-bar-row">
                <span className="mt-sb-bar-label" style={{ color: cfg.color }}>{cfg.label}</span>
                <div className="mt-sb-bar-track">
                  <div className="mt-sb-bar-fill" style={{ width: `${barPct}%`, background: cfg.color }} />
                </div>
                <span className="mt-sb-bar-count">{val}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Upcoming Deadlines */}
      <section className="mt-sidebar-card">
        <div className="mt-sb-header">
          <h3 className="mt-sb-title">Upcoming</h3>
          <CalendarClock size={14} className="mt-sb-icon" />
        </div>
        {upcoming.length === 0 ? (
          <p className="mt-sb-empty">No upcoming deadlines 🎉</p>
        ) : (
          <div className="mt-sb-deadline-list">
            {upcoming.map((t) => {
              const days = getDaysUntilDue(t.due_date);
              return (
                <div key={t.id} className="mt-sb-deadline-item">
                  <div
                    className="mt-sb-deadline-stripe"
                    style={{ background: STATUS_CONFIG[t.status]?.color || "#8A87A0" }}
                  />
                  <div className="mt-sb-deadline-body">
                    <p className="mt-sb-deadline-title">{t.title}</p>
                    <p className="mt-sb-deadline-date">
                      {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days}d`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Overdue Alert */}
      {overdueTasks.length > 0 && (
        <section className="mt-sidebar-card mt-sidebar-card--danger">
          <div className="mt-sb-header">
            <h3 className="mt-sb-title" style={{ color: "#DC2626" }}>Overdue</h3>
            <AlertTriangle size={14} style={{ color: "#DC2626" }} />
          </div>
          <div className="mt-sb-overdue-list">
            {overdueTasks.slice(0, 4).map((t) => (
              <div key={t.id} className="mt-sb-overdue-item">
                <Flame size={10} style={{ color: "#EF4444", flexShrink: 0 }} />
                <span className="mt-sb-overdue-title">{t.title}</span>
              </div>
            ))}
            {overdueTasks.length > 4 && (
              <p className="mt-sb-overdue-more">+{overdueTasks.length - 4} more</p>
            )}
          </div>
        </section>
      )}

      {/* Workload */}
      <section className="mt-sidebar-card">
        <div className="mt-sb-header">
          <h3 className="mt-sb-title">Workload</h3>
          <BarChart2 size={14} className="mt-sb-icon" />
        </div>
        <div className="mt-sb-workload-grid">
          <div className="mt-sb-workload-item">
            <span className="mt-sb-wl-value" style={{ color: "#6C53B3" }}>{total}</span>
            <span className="mt-sb-wl-label">Total</span>
          </div>
          <div className="mt-sb-workload-item">
            <span className="mt-sb-wl-value" style={{ color: "#3B82F6" }}>{byStatus.in_progress}</span>
            <span className="mt-sb-wl-label">Active</span>
          </div>
          <div className="mt-sb-workload-item">
            <span className="mt-sb-wl-value" style={{ color: "#16A34A" }}>{done}</span>
            <span className="mt-sb-wl-label">Done</span>
          </div>
          <div className="mt-sb-workload-item">
            <span className="mt-sb-wl-value" style={{ color: "#EF4444" }}>{overdueTasks.length}</span>
            <span className="mt-sb-wl-label">Overdue</span>
          </div>
        </div>
      </section>

    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function MyTasks() {
  const [tasks, setTasks]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [activeTab, setActiveTab]       = useState("all");
  const [search, setSearch]             = useState("");
  const [priorityFilter, setPriority]   = useState("all");
  const [projectFilter, setProject]     = useState("all");
  const [sortBy, setSortBy]             = useState("due_date_asc");
  const [viewMode, setViewMode]         = useState("grid"); // grid | list
  const [showFilters, setShowFilters]   = useState(false);

  /* ── Fetch ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/workspace/my-tasks/");
        setTasks(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load your tasks.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* ── Status update ──────────────────────────────────────────────────── */
  const handleStatusChange = useCallback(async (taskId, newStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    try {
      await api.patch(`/workspace/my-tasks/${taskId}/`, { status: newStatus });
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: t.status } : t))
      );
    }
  }, []);

  /* ── Derived ─────────────────────────────────────────────────────────── */
  const projects = useMemo(() => {
    const set = new Set();
    tasks.forEach((t) => {
      const name = t.task?.project?.name || t.project?.name;
      if (name) set.add(name);
    });
    return Array.from(set);
  }, [tasks]);

  const tabCounts = useMemo(() => {
    const counts = { all: tasks.length, todo: 0, in_progress: 0, review: 0, done: 0, overdue: 0 };
    tasks.forEach((t) => {
      if (counts[t.status] !== undefined) counts[t.status]++;
      if (isOverdue(t.due_date, t.status)) counts.overdue++;
    });
    return counts;
  }, [tasks]);

  const filtered = useMemo(() => {
    let list = [...tasks];

    // Tab filter
    if (activeTab === "overdue") {
      list = list.filter((t) => isOverdue(t.due_date, t.status));
    } else if (activeTab !== "all") {
      list = list.filter((t) => t.status === activeTab);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.task?.project?.name?.toLowerCase().includes(q)
      );
    }

    // Priority
    if (priorityFilter !== "all") {
      list = list.filter((t) => t.priority?.toLowerCase() === priorityFilter);
    }

    // Project
    if (projectFilter !== "all") {
      list = list.filter(
        (t) => (t.task?.project?.name || t.project?.name) === projectFilter
      );
    }

    // Sort
    switch (sortBy) {
      case "due_date_asc":
        list.sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(a.due_date) - new Date(b.due_date);
        });
        break;
      case "due_date_desc":
        list.sort((a, b) => {
          if (!a.due_date) return 1;
          if (!b.due_date) return -1;
          return new Date(b.due_date) - new Date(a.due_date);
        });
        break;
      case "priority_desc":
        list.sort(
          (a, b) =>
            (PRIORITY_ORDER[b.priority?.toLowerCase()] || 0) -
            (PRIORITY_ORDER[a.priority?.toLowerCase()] || 0)
        );
        break;
      case "title_asc":
        list.sort((a, b) => a.title?.localeCompare(b.title));
        break;
    }

    return list;
  }, [tasks, activeTab, search, priorityFilter, projectFilter, sortBy]);

  /* ── Summary stats for hero ──────────────────────────────────────────── */
  const heroStats = useMemo(() => {
    const total = tasks.length;
    const done  = tasks.filter((t) => t.status === "done").length;
    const today = tasks.filter((t) => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date);
      const now = new Date();
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate() &&
        t.status !== "done"
      );
    }).length;
    const overdue = tasks.filter((t) => isOverdue(t.due_date, t.status)).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, today, overdue, pct };
  }, [tasks]);

  const activeFiltersCount = [
    priorityFilter !== "all",
    projectFilter !== "all",
    sortBy !== "due_date_asc",
  ].filter(Boolean).length;

  /* ── Guards ──────────────────────────────────────────────────────────── */
  if (error) {
    return (
      <div className="mt-page">
        <div className="mt-error">{error}</div>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="mt-page">

      {/* ── 1. HERO ──────────────────────────────────────────────────── */}
      <section className="mt-hero mt-glass">
        <div className="mt-hero-left">
          <div className="mt-hero-eyebrow">
            <span className="mt-hero-pulse" />
            My Tasks — Personal Workspace
          </div>
          <h1 className="mt-hero-title">
            {greeting()}, here's your focus 🎯
          </h1>
          <p className="mt-hero-sub">
            {heroStats.overdue > 0
              ? `You have ${heroStats.overdue} overdue task${heroStats.overdue !== 1 ? "s" : ""} and ${heroStats.today} due today.`
              : heroStats.today > 0
              ? `You have ${heroStats.today} task${heroStats.today !== 1 ? "s" : ""} due today. Keep pushing!`
              : `${heroStats.total} tasks assigned — ${heroStats.done} complete. You're doing great!`}
          </p>
          <div className="mt-hero-chips">
            <div className="mt-hero-chip">
              <Target size={12} />
              <span>{heroStats.total} Total</span>
            </div>
            <div className="mt-hero-chip mt-hero-chip--green">
              <CheckCircle2 size={12} />
              <span>{heroStats.done} Done</span>
            </div>
            {heroStats.today > 0 && (
              <div className="mt-hero-chip mt-hero-chip--blue">
                <Clock size={12} />
                <span>{heroStats.today} Today</span>
              </div>
            )}
            {heroStats.overdue > 0 && (
              <div className="mt-hero-chip mt-hero-chip--red">
                <AlertTriangle size={12} />
                <span>{heroStats.overdue} Overdue</span>
              </div>
            )}
          </div>
        </div>
        <div className="mt-hero-right">
          <div className="mt-hero-score">
            <span className="mt-hero-score-val">{heroStats.pct}</span>
            <span className="mt-hero-score-unit">%</span>
          </div>
          <div className="mt-hero-score-bar">
            <div className="mt-hero-score-fill" style={{ width: `${heroStats.pct}%` }} />
          </div>
          <span className="mt-hero-score-label">Completion Rate</span>
        </div>
      </section>

      {/* ── 2. TABS ───────────────────────────────────────────────────── */}
      <div className="mt-tabs-wrap">
        <div className="mt-tabs">
          {STATUS_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`mt-tab ${activeTab === key ? "mt-tab--active" : ""}`}
              onClick={() => setActiveTab(key)}
            >
              <Icon size={12} />
              {label}
              {tabCounts[key] > 0 && (
                <span className={`mt-tab-count ${activeTab === key ? "mt-tab-count--active" : ""}`}>
                  {tabCounts[key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── 3. SEARCH + FILTERS ──────────────────────────────────────── */}
      <div className="mt-filter-bar">
        <div className="mt-search-wrap">
          <Search size={14} className="mt-search-icon" />
          <input
            className="mt-search"
            placeholder="Search tasks, projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="mt-search-clear" onClick={() => setSearch("")}>
              <X size={12} />
            </button>
          )}
        </div>

        <button
          className={`mt-filter-toggle ${showFilters ? "active" : ""}`}
          onClick={() => setShowFilters((o) => !o)}
        >
          <SlidersHorizontal size={13} />
          Filters
          {activeFiltersCount > 0 && (
            <span className="mt-filter-badge">{activeFiltersCount}</span>
          )}
        </button>

        <div className="mt-filter-right">
          <select
            className="mt-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <div className="mt-view-toggle">
            <button
              className={`mt-view-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Grid view"
            >
              <LayoutGrid size={13} />
            </button>
            <button
              className={`mt-view-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
              title="List view"
            >
              <List size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter drawer */}
      {showFilters && (
        <div className="mt-filter-drawer mt-glass">
          <div className="mt-filter-group">
            <label className="mt-filter-label">
              <Filter size={11} />
              Priority
            </label>
            <div className="mt-filter-pills">
              {["all", "critical", "high", "medium", "low"].map((p) => (
                <button
                  key={p}
                  className={`mt-filter-pill ${priorityFilter === p ? "active" : ""}`}
                  style={
                    priorityFilter === p && p !== "all"
                      ? { background: PRIORITY_CONFIG[p]?.bg, color: PRIORITY_CONFIG[p]?.color, borderColor: PRIORITY_CONFIG[p]?.color }
                      : {}
                  }
                  onClick={() => setPriority(p)}
                >
                  {p === "all" ? "All priorities" : PRIORITY_CONFIG[p]?.label}
                </button>
              ))}
            </div>
          </div>

          {projects.length > 0 && (
            <div className="mt-filter-group">
              <label className="mt-filter-label">
                <Layers size={11} />
                Project
              </label>
              <div className="mt-filter-pills">
                <button
                  className={`mt-filter-pill ${projectFilter === "all" ? "active" : ""}`}
                  onClick={() => setProject("all")}
                >
                  All projects
                </button>
                {projects.map((p) => (
                  <button
                    key={p}
                    className={`mt-filter-pill ${projectFilter === p ? "active" : ""}`}
                    onClick={() => setProject(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeFiltersCount > 0 && (
            <button
              className="mt-filter-clear"
              onClick={() => { setPriority("all"); setProject("all"); setSortBy("due_date_asc"); }}
            >
              <X size={11} />
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* ── 4. MAIN CONTENT ──────────────────────────────────────────── */}
      <div className="mt-main">

        {/* Task grid / list */}
        <div className="mt-content">
          {loading ? (
            <TaskSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState filter={activeTab} />
          ) : (
            <div className={viewMode === "grid" ? "mt-grid" : "mt-list"}>
              {filtered.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  onRaiseIssue={() => {}}
                  onOpenTask={() => {}}
                />
              ))}
            </div>
          )}

          {/* Results count */}
          {!loading && filtered.length > 0 && (
            <p className="mt-results-count">
              Showing {filtered.length} of {tasks.length} tasks
            </p>
          )}
        </div>

        {/* Sidebar */}
        {!loading && <Sidebar tasks={tasks} />}
      </div>

    </div>
  );
}