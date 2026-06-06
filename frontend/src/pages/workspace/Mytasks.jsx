import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
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
  Target,
  TrendingUp,
  X,
  Circle,
  Eye,
  BarChart2,
  CalendarClock,
  Activity,
  Zap,
  ArrowRight,
  CheckCheck,
  Timer,
  User,
} from "lucide-react";

import api from "../../services/api";
import { IssueProvider } from "../../context/issues/IssueContext";
import IssueDetailsModal from "../../components/issues/IssueDetailsModal";
import "./MyTasks.css";

/* ─── CONSTANTS ─────────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  todo:        { label: "Todo",        color: "#64748B", bg: "#F1F5F9", border: "rgba(100,116,139,0.18)", accent: "#94A3B8" },
  in_progress: { label: "In Progress", color: "#2563EB", bg: "#EFF6FF", border: "rgba(37,99,235,0.18)",   accent: "#60A5FA" },
  review:      { label: "Review",      color: "#7C3AED", bg: "#F5F3FF", border: "rgba(124,58,237,0.18)",  accent: "#A78BFA" },
  done:        { label: "Done",        color: "#059669", bg: "#ECFDF5", border: "rgba(5,150,105,0.18)",   accent: "#34D399" },
};

const ISSUE_STATUS_CONFIG = {
  open:          { label: "Open",          color: "#DC2626", bg: "#FEF2F2", border: "rgba(220,38,38,0.22)",  accent: "#EF4444" },
  investigating: { label: "Investigating", color: "#D97706", bg: "#FFFBEB", border: "rgba(217,119,6,0.18)",   accent: "#F59E0B" },
  resolved:      { label: "Resolved",      color: "#059669", bg: "#ECFDF5", border: "rgba(5,150,105,0.18)",   accent: "#34D399" },
  closed:        { label: "Closed",        color: "#64748B", bg: "#F1F5F9", border: "rgba(100,116,139,0.18)",  accent: "#94A3B8" },
};

const PRIORITY_CONFIG = {
  critical: { label: "Critical", color: "#DC2626", bg: "#FEF2F2",  border: "rgba(220,38,38,0.2)",   dot: "#EF4444",  cardTint: "rgba(254,242,242,0.6)"  },
  high:     { label: "High",     color: "#D97706", bg: "#FFFBEB",  border: "rgba(217,119,6,0.2)",   dot: "#F59E0B",  cardTint: "rgba(255,251,235,0.6)"  },
  medium:   { label: "Medium",   color: "#7C3AED", bg: "#F5F3FF",  border: "rgba(124,58,237,0.2)",  dot: "#8B5CF6",  cardTint: "rgba(245,243,255,0.5)"  },
  low:      { label: "Low",      color: "#64748B", bg: "#F8FAFC",  border: "rgba(100,116,139,0.15)", dot: "#94A3B8",  cardTint: "rgba(248,250,252,0.5)"  },
};

// Pastel card accent colors per status — inspired by the Salesforce/Weihu reference boards
const CARD_PALETTE = {
  todo:        { gradStart: "#F8F9FF", gradEnd: "#EEF2FF", topAccent: "#C7D2FE" },
  in_progress: { gradStart: "#F0F9FF", gradEnd: "#E0F2FE", topAccent: "#7DD3FC" },
  review:      { gradStart: "#FAF5FF", gradEnd: "#F3E8FF", topAccent: "#D8B4FE" },
  done:        { gradStart: "#F0FDF9", gradEnd: "#DCFCE7", topAccent: "#6EE7B7" },
};

const STATUS_TABS = [
  { key: "all",         label: "All",         icon: Layers       },
  { key: "todo",        label: "Todo",         icon: Circle       },
  { key: "in_progress", label: "In Progress",  icon: Loader2      },
  { key: "review",      label: "Review",       icon: Eye          },
  { key: "done",        label: "Done",         icon: CheckCircle2 },
  { key: "overdue",     label: "Overdue",      icon: AlertTriangle},
];

const SORT_OPTIONS = [
  { value: "due_date_asc",  label: "Due Date ↑" },
  { value: "due_date_desc", label: "Due Date ↓" },
  { value: "priority_desc", label: "Priority ↓" },
  { value: "title_asc",     label: "Title A–Z"  },
];

const PRIORITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
function formatDate(value) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
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

function getTabKey(status, isIssue) {
  if (!isIssue) return status;
  if (status === "open") return "todo";
  if (status === "investigating") return "in_progress";
  if (status === "resolved" || status === "closed") return "done";
  return "todo";
}

function getDaysUntilDue(due_date) {
  if (!due_date) return null;
  return Math.ceil((new Date(due_date).getTime() - Date.now()) / 86400000);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/* ─── SKELETON ───────────────────────────────────────────────────────────── */
function TaskSkeleton() {
  return (
    <div className="mt-skeleton-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="mt-task-skeleton">
          <div className="mt-sk mt-sk-top-bar" />
          <div className="mt-sk mt-sk-bar" style={{ width: "65%", marginTop: 14 }} />
          <div className="mt-sk mt-sk-bar" style={{ width: "45%", marginTop: 7 }} />
          <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
            <div className="mt-sk mt-sk-pill" />
            <div className="mt-sk mt-sk-pill" style={{ width: 50 }} />
          </div>
          <div className="mt-sk mt-sk-progress" style={{ marginTop: 12 }} />
          <div className="mt-sk mt-sk-bar" style={{ width: "35%", marginTop: 10 }} />
        </div>
      ))}
    </div>
  );
}

/* ─── EMPTY STATE ────────────────────────────────────────────────────────── */
function EmptyState({ filter }) {
  const configs = {
    all:         { emoji: "🎯", title: "No tasks assigned yet",   sub: "Tasks assigned to you will show up here." },
    todo:        { emoji: "📋", title: "Nothing in Todo",         sub: "All clear — nothing waiting to be started." },
    in_progress: { emoji: "⚡", title: "Nothing in progress",     sub: "Pick a task and get started." },
    review:      { emoji: "👀", title: "Nothing in review",       sub: "No tasks awaiting review." },
    done:        { emoji: "🏆", title: "No completed tasks yet",  sub: "Finish a task to see it here." },
    overdue:     { emoji: "✅", title: "No overdue tasks!",        sub: "You're right on schedule — great work." },
  };
  const c = configs[filter] || configs.all;
  return (
    <div className="mt-empty">
      <div className="mt-empty-icon">{c.emoji}</div>
      <h3 className="mt-empty-title">{c.title}</h3>
      <p className="mt-empty-sub">{c.sub}</p>
    </div>
  );
}

/* ─── DUE BADGE ──────────────────────────────────────────────────────────── */
function DueBadge({ due_date, status }) {
  if (!due_date) return <span className="mt-due mt-due--none">No due date</span>;
  const days  = getDaysUntilDue(due_date);
  const over  = isOverdue(due_date, status);
  if (over)    return <span className="mt-due mt-due--overdue">⚠ Overdue</span>;
  if (days === 0) return <span className="mt-due mt-due--today">Today</span>;
  if (days === 1) return <span className="mt-due mt-due--tomorrow">Tomorrow</span>;
  if (days <= 3)  return <span className="mt-due mt-due--soon">In {days}d</span>;
  return <span className="mt-due mt-due--normal">{formatDate(due_date)}</span>;
}

/* ─── PRIORITY BADGE ─────────────────────────────────────────────────────── */
function PriorityBadge({ priority }) {
  const key = priority?.toLowerCase() || "low";
  const cfg = PRIORITY_CONFIG[key] || PRIORITY_CONFIG.low;
  return (
    <span className="mt-priority-badge" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
      <span className="mt-priority-dot" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

/* ─── STATUS PILL ────────────────────────────────────────────────────────── */
function StatusPill({ status, onChange, isIssue = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const key = status || (isIssue ? "open" : "todo");
  const config = isIssue ? ISSUE_STATUS_CONFIG : STATUS_CONFIG;
  const cfg = config[key] || config[isIssue ? "open" : "todo"];

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const allowedIssueStatuses = isIssue ? (
    key === "open" ? [["investigating", ISSUE_STATUS_CONFIG.investigating]] :
    key === "investigating" ? [["resolved", ISSUE_STATUS_CONFIG.resolved]] : []
  ) : [];

  const isDisabled = isIssue && allowedIssueStatuses.length === 0;

  return (
    <div className="mt-status-wrap" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        className="mt-status-pill"
        style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
        onClick={() => !isDisabled && setOpen((o) => !o)}
        disabled={isDisabled}
      >
        <span className="mt-status-dot" style={{ background: cfg.accent }} />
        {cfg.label}
        {!isDisabled && <ChevronDown size={9} />}
      </button>
      {open && (
        <div className="mt-status-dropdown">
          {isIssue ? (
            allowedIssueStatuses.map(([k, v]) => (
              <button
                key={k}
                className={`mt-status-option ${k === key ? "active" : ""}`}
                onClick={() => { onChange?.(k); setOpen(false); }}
              >
                <span className="mt-status-option-dot" style={{ background: v.accent }} />
                {v.label}
              </button>
            ))
          ) : (
            Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <button
                key={k}
                className={`mt-status-option ${k === key ? "active" : ""}`}
                onClick={() => { onChange?.(k); setOpen(false); }}
              >
                <span className="mt-status-option-dot" style={{ background: v.accent }} />
                {v.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ─── TASK CARD ──────────────────────────────────────────────────────────── */
function TaskCard({ task, onStatusChange, onRaiseIssue, onOpenTask }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const overdue     = isOverdue(task.due_date, task.status);
  const statusKey   = task.status || (task.is_issue ? "open" : "todo");
  const priorityKey = task.priority?.toLowerCase() || "low";
  const priCfg      = PRIORITY_CONFIG[priorityKey] || PRIORITY_CONFIG.low;
  const config      = task.is_issue ? ISSUE_STATUS_CONFIG : STATUS_CONFIG;
  const stCfg       = config[statusKey] || config[task.is_issue ? "open" : "todo"];
  const palette     = task.is_issue ? { gradStart: "#FFF8F8", gradEnd: "#FEE2E2", topAccent: stCfg.accent } : (CARD_PALETTE[statusKey] || CARD_PALETTE.todo);

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  const projectName = task.task?.project?.name || task.project?.name || task.project?.title || "—";
  const isCritical = priorityKey === "critical";

  const cardClassName = `mt-task-card${
    task.is_issue ? " mt-task-card--issue" : ""
  }${
    task.is_issue && isCritical ? " mt-task-card--critical-issue" : ""
  }${
    overdue ? " mt-task-card--overdue" : ""
  }`;

  const allowedMenuOptions = task.is_issue ? (
    statusKey === "open" ? [["investigating", ISSUE_STATUS_CONFIG.investigating]] :
    statusKey === "investigating" ? [["resolved", ISSUE_STATUS_CONFIG.resolved]] : []
  ) : Object.entries(STATUS_CONFIG);

  return (
    <article
      className={cardClassName}
      style={!overdue && !task.is_issue ? {
        background: `linear-gradient(145deg, ${palette.gradStart} 0%, ${palette.gradEnd} 100%)`,
        "--card-top-accent": palette.topAccent,
      } : {}}
      onClick={() => onOpenTask?.(task)}
      onKeyDown={(e) => e.key === "Enter" && onOpenTask?.(task)}
      role="button"
      tabIndex={0}
    >
      {/* Top accent bar */}
      <div className="mt-card-accent-bar" style={{ background: overdue ? "#FCA5A5" : palette.topAccent }} />

      {/* Header row */}
      <div className="mt-card-header">
        <span className={`mt-card-project-tag ${task.is_issue ? "mt-card-project-tag--issue" : ""}`}>
          {task.is_issue ? <AlertTriangle size={9} /> : <Layers size={9} />}
          {projectName}
        </span>
        {task.is_issue && (
          <span className="mt-card-issue-badge">
            <AlertTriangle size={8} />
            Issue
          </span>
        )}
        <div className="mt-card-actions" onClick={(e) => e.stopPropagation()}>
          <button className="mt-icon-btn" title="Open" onClick={(e) => { e.stopPropagation(); onOpenTask?.(task); }}>
            <ExternalLink size={11} />
          </button>
          {!task.is_issue && (
            <button className="mt-icon-btn" title="Raise Issue" onClick={(e) => { e.stopPropagation(); onRaiseIssue?.(task); }}>
              <MessageSquarePlus size={11} />
            </button>
          )}
          {allowedMenuOptions.length > 0 && (
            <div className="mt-menu-wrap" ref={menuRef}>
              <button className="mt-icon-btn" onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}>
                <MoreHorizontal size={11} />
              </button>
              {menuOpen && (
                <div className="mt-card-menu">
                  {allowedMenuOptions.map(([k, v]) => (
                    <button key={k} className="mt-card-menu-item"
                      onClick={() => { onStatusChange?.(task.id, k, task.is_issue); setMenuOpen(false); }}>
                      <span className="mt-menu-dot" style={{ background: v.accent }} />
                      Mark as {v.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="mt-card-title">{task.title}</h3>

      {task.description && (
        <p className="mt-card-desc">{task.description}</p>
      )}

      {task.task?.title && (
        <div className="mt-card-parent-task">
          <Target size={9} />
          {task.task.title}
        </div>
      )}

      {/* Priority + Status badges */}
      <div className="mt-card-badges">
        <PriorityBadge priority={task.priority} />
        <StatusPill status={task.status} isIssue={task.is_issue} onChange={(s) => onStatusChange?.(task.id, s, task.is_issue)} />
      </div>

      {/* Progress bar (visual indicator based on status) */}
      <div className="mt-card-progress-wrap">
        <div className="mt-card-progress-track">
          <div
            className="mt-card-progress-fill"
            style={{
              width: statusKey === "done" || statusKey === "resolved" || statusKey === "closed" ? "100%" : statusKey === "review" ? "75%" : statusKey === "in_progress" || statusKey === "investigating" ? "45%" : "10%",
              background: stCfg.accent,
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-card-footer">
        <div className="mt-card-due">
          {!task.is_issue && <CalendarDays size={10} />}
          {!task.is_issue && <DueBadge due_date={task.due_date} status={task.status} />}
          {task.is_issue && task.assignee_name && (
            <span className="mt-card-assignee">
              <User size={9} />
              {task.assignee_name}
            </span>
          )}
        </div>
        <div className="mt-card-counts">
          {task.comments_count > 0 && (
            <span className="mt-count-chip">
              <MessageCircle size={9} />
              {task.comments_count}
            </span>
          )}
          {task.attachments_count > 0 && (
            <span className="mt-count-chip">
              <Paperclip size={9} />
              {task.attachments_count}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/* ─── LIST ROW (list view variant) ──────────────────────────────────────── */
function TaskRow({ task, onStatusChange, onRaiseIssue, onOpenTask }) {
  const overdue     = isOverdue(task.due_date, task.status);
  const priorityKey = task.priority?.toLowerCase() || "low";
  const priCfg      = PRIORITY_CONFIG[priorityKey] || PRIORITY_CONFIG.low;
  const projectName = task.task?.project?.name || task.project?.name || task.project?.title || "—";
  const isCritical = priorityKey === "critical";

  const rowClassName = `mt-list-row${
    task.is_issue ? " mt-list-row--issue" : ""
  }${
    task.is_issue && isCritical ? " mt-list-row--critical-issue" : ""
  }${
    overdue ? " mt-list-row--overdue" : ""
  }`;

  return (
    <div
      className={rowClassName}
      onClick={() => onOpenTask?.(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpenTask?.(task)}
    >
      <div className="mt-row-stripe" style={{ background: priCfg.dot }} />

      <div className="mt-row-main">
        <span className="mt-row-project">
          {task.is_issue ? <AlertTriangle size={9} color="#DC2626" /> : <Layers size={9} />}
          {projectName}
          {task.is_issue && (
            <span className="mt-card-issue-badge" style={{ marginLeft: 6 }}>
              <AlertTriangle size={8} /> Issue
            </span>
          )}
        </span>
        <span className="mt-row-title">{task.title}</span>
      </div>

      <div className="mt-row-meta">
        <PriorityBadge priority={task.priority} />
        <StatusPill status={task.status} isIssue={task.is_issue} onChange={(s) => onStatusChange?.(task.id, s, task.is_issue)} />
        <div className="mt-row-due">
          {!task.is_issue && <CalendarDays size={10} />}
          {!task.is_issue && <DueBadge due_date={task.due_date} status={task.status} />}
          {task.is_issue && task.assignee_name && (
            <span className="mt-card-assignee">
              <User size={9} />
              {task.assignee_name}
            </span>
          )}
        </div>
        <div className="mt-row-counts">
          {task.comments_count > 0 && <span className="mt-count-chip"><MessageCircle size={9} />{task.comments_count}</span>}
          {task.attachments_count > 0 && <span className="mt-count-chip"><Paperclip size={9} />{task.attachments_count}</span>}
        </div>
        <button className="mt-icon-btn" onClick={(e) => { e.stopPropagation(); onOpenTask?.(task); }}>
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}

/* ─── STAT CARD ──────────────────────────────────────────────────────────── */
function StatCard({ value, label, color, icon: Icon, bg }) {
  return (
    <div className="mt-stat-card" style={{ "--stat-color": color, "--stat-bg": bg }}>
      <div className="mt-stat-icon-wrap">
        <Icon size={14} />
      </div>
      <div className="mt-stat-body">
        <span className="mt-stat-value">{value}</span>
        <span className="mt-stat-label">{label}</span>
      </div>
    </div>
  );
}

/* ─── SIDEBAR ────────────────────────────────────────────────────────────── */
function Sidebar({ tasks, activities = [] }) {
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

  const r = 32, circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <aside className="mt-sidebar">

      {/* ── Completion ── */}
      <section className="mt-sb-card">
        <div className="mt-sb-card-header">
          <h3 className="mt-sb-card-title">Progress</h3>
          <TrendingUp size={13} className="mt-sb-header-icon" />
        </div>
        <div className="mt-ring-section">
          <div className="mt-ring-wrap">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <defs>
                <linearGradient id="rg1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
              <circle cx="40" cy="40" r={r} fill="none" stroke="#EEF2FF" strokeWidth="6" />
              <circle
                cx="40" cy="40" r={r}
                fill="none"
                stroke="url(#rg1)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                transform="rotate(-90 40 40)"
                className="mt-ring-fill-animated"
              />
            </svg>
            <div className="mt-ring-label">
              <span className="mt-ring-pct">{pct}</span>
              <span className="mt-ring-unit">%</span>
            </div>
          </div>
          <div className="mt-ring-stats">
            {Object.entries(byStatus).map(([key, val]) => {
              const cfg = STATUS_CONFIG[key];
              const pctBar = total > 0 ? Math.round((val / total) * 100) : 0;
              return (
                <div key={key} className="mt-bar-row">
                  <span className="mt-bar-label" style={{ color: cfg.color }}>{cfg.label}</span>
                  <div className="mt-bar-track">
                    <div className="mt-bar-fill" style={{ width: `${pctBar}%`, background: cfg.accent }} />
                  </div>
                  <span className="mt-bar-num">{val}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Workload tiles ── */}
      <section className="mt-sb-card">
        <div className="mt-sb-card-header">
          <h3 className="mt-sb-card-title">Workload</h3>
          <BarChart2 size={13} className="mt-sb-header-icon" />
        </div>
        <div className="mt-workload-grid">
          {[
            { value: total,                    label: "Total",   color: "#6366F1", bg: "#EEF2FF", icon: Layers       },
            { value: byStatus.in_progress,     label: "Active",  color: "#2563EB", bg: "#EFF6FF", icon: Zap          },
            { value: done,                     label: "Done",    color: "#059669", bg: "#ECFDF5", icon: CheckCheck    },
            { value: overdueTasks.length,      label: "Overdue", color: "#DC2626", bg: "#FEF2F2", icon: Timer        },
          ].map(({ value, label, color, bg, icon: Icon }) => (
            <div key={label} className="mt-wl-tile" style={{ "--wl-color": color, "--wl-bg": bg }}>
              <Icon size={13} className="mt-wl-icon" />
              <span className="mt-wl-value">{value}</span>
              <span className="mt-wl-label">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Upcoming ── */}
      <section className="mt-sb-card">
        <div className="mt-sb-card-header">
          <h3 className="mt-sb-card-title">Upcoming</h3>
          <CalendarClock size={13} className="mt-sb-header-icon" />
        </div>
        {upcoming.length === 0 ? (
          <p className="mt-sb-empty">No upcoming deadlines 🎉</p>
        ) : (
          <div className="mt-deadline-list">
            {upcoming.map((t) => {
              const days = getDaysUntilDue(t.due_date);
              const stCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.todo;
              return (
                <div key={t.id} className="mt-deadline-row">
                  <div className="mt-deadline-stripe" style={{ background: stCfg.accent }} />
                  <div className="mt-deadline-info">
                    <p className="mt-deadline-title">{t.title}</p>
                    <p className="mt-deadline-when">
                      {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days}d`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Activity ── */}
      <section className="mt-sb-card">
        <div className="mt-sb-card-header">
          <h3 className="mt-sb-card-title">Activity</h3>
          <Link to="/workspace/activity" className="mt-sb-view-all">View all</Link>
        </div>
        {activities.length === 0 ? (
          <p className="mt-sb-empty">No recent activity.</p>
        ) : (
          <div className="mt-activity-list">
            {activities.slice(0, 4).map((item) => (
              <div key={item.id} className="mt-activity-row">
                <div className="mt-activity-dot-wrap">
                  <Activity size={10} />
                </div>
                <div className="mt-activity-content">
                  <p className="mt-activity-msg">{item.message}</p>
                  <span className="mt-activity-time">{formatRelative(item.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Overdue ── */}
      {overdueTasks.length > 0 && (
        <section className="mt-sb-card mt-sb-card--danger">
          <div className="mt-sb-card-header">
            <h3 className="mt-sb-card-title" style={{ color: "#DC2626" }}>Overdue</h3>
            <AlertTriangle size={13} style={{ color: "#EF4444" }} />
          </div>
          <div className="mt-overdue-list">
            {overdueTasks.slice(0, 4).map((t) => (
              <div key={t.id} className="mt-overdue-row">
                <Flame size={10} className="mt-overdue-flame" />
                <span className="mt-overdue-title">{t.title}</span>
              </div>
            ))}
            {overdueTasks.length > 4 && (
              <span className="mt-overdue-more">+{overdueTasks.length - 4} more</span>
            )}
          </div>
        </section>
      )}

    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
function MyTasksContent() {
  const navigate = useNavigate();
  const [tasks,            setTasks]          = useState([]);
  const [loading,          setLoading]        = useState(true);
  const [error,            setError]          = useState("");
  const [activeTab,        setActiveTab]      = useState("all");
  const [search,           setSearch]         = useState("");
  const [priorityFilter,   setPriority]       = useState("all");
  const [projectFilter,    setProject]        = useState("all");
  const [sortBy,           setSortBy]         = useState("due_date_asc");
  const [viewMode,         setViewMode]       = useState("grid");
  const [showFilters,      setShowFilters]    = useState(false);
  const [recentActivities, setRecentActivities] = useState([]);
  const [selectedIssue,    setSelectedIssue]  = useState(null);

  /* ── Fetch ── */
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/workspace/my-tasks/");
        setTasks(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load your tasks.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/workspace/activity-feed/?limit=5");
        setRecentActivities(Array.isArray(res.data) ? res.data : []);
      } catch {/* silent */}
    })();
  }, []);

  /* ── Status update ── */
  const handleStatusChange = useCallback(async (taskId, newStatus, isIssue = false) => {
    let oldStatus = null;
    setTasks((prev) => prev.map((t) => {
      if (t.id === taskId) {
        oldStatus = t.status;
        return { ...t, status: newStatus };
      }
      return t;
    }));
    try {
      if (isIssue) {
        await api.patch(`/issues/${taskId}/`, { status: newStatus });
      } else {
        await api.patch(`/workspace/subtasks/${taskId}/`, { status: newStatus });
      }
    } catch {
      if (oldStatus) {
        setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: oldStatus } : t));
      }
    }
  }, []);

  const openTaskWorkspace = useCallback((task) => {
    const taskId = task?.task?.id;
    if (!taskId) return;
    const subtaskId = task.is_issue ? task.subtask?.id : task.id;
    navigate(`/workspace/task/${taskId}?subtask=${subtaskId}`);
  }, [navigate]);

  /* ── Derived ── */
  const projects = useMemo(() => {
    const s = new Set();
    tasks.forEach((t) => {
      const n = t.task?.project?.name || t.project?.name || t.project?.title;
      if (n) s.add(n);
    });
    return Array.from(s);
  }, [tasks]);

  const tabCounts = useMemo(() => {
    const c = { all: tasks.length, todo: 0, in_progress: 0, review: 0, done: 0, overdue: 0 };
    tasks.forEach((t) => {
      const tabKey = getTabKey(t.status, t.is_issue);
      if (c[tabKey] !== undefined) c[tabKey]++;
      if (isOverdue(t.due_date, t.status)) c.overdue++;
    });
    return c;
  }, [tasks]);

  const filtered = useMemo(() => {
    let list = [...tasks];
    if (activeTab === "overdue") {
      list = list.filter((t) => isOverdue(t.due_date, t.status));
    } else if (activeTab !== "all") {
      list = list.filter((t) => getTabKey(t.status, t.is_issue) === activeTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.task?.project?.name?.toLowerCase().includes(q) ||
        t.project?.title?.toLowerCase().includes(q)
      );
    }
    if (priorityFilter !== "all") {
      list = list.filter((t) => t.priority?.toLowerCase() === priorityFilter);
    }
    if (projectFilter !== "all") {
      list = list.filter((t) =>
        (t.task?.project?.name || t.project?.name || t.project?.title) === projectFilter
      );
    }
    switch (sortBy) {
      case "due_date_asc":  list.sort((a, b) => (!a.due_date ? 1 : !b.due_date ? -1 : new Date(a.due_date) - new Date(b.due_date))); break;
      case "due_date_desc": list.sort((a, b) => (!a.due_date ? 1 : !b.due_date ? -1 : new Date(b.due_date) - new Date(a.due_date))); break;
      case "priority_desc": list.sort((a, b) => (PRIORITY_ORDER[b.priority?.toLowerCase()] || 0) - (PRIORITY_ORDER[a.priority?.toLowerCase()] || 0)); break;
      case "title_asc":     list.sort((a, b) => a.title?.localeCompare(b.title)); break;
    }
    return list;
  }, [tasks, activeTab, search, priorityFilter, projectFilter, sortBy]);

  const heroStats = useMemo(() => {
    const total   = tasks.length;
    const done    = tasks.filter((t) => getTabKey(t.status, t.is_issue) === "done").length;
    const overdue = tasks.filter((t) => isOverdue(t.due_date, t.status)).length;
    const now = new Date();
    const today = tasks.filter((t) => {
      if (!t.due_date || t.status === "done" || t.status === "resolved" || t.status === "closed") return false;
      const d = new Date(t.due_date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    }).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, today, overdue, pct };
  }, [tasks]);

  const activeFiltersCount = [priorityFilter !== "all", projectFilter !== "all", sortBy !== "due_date_asc"].filter(Boolean).length;

  if (error) {
    return (
      <div className="mt-page">
        <div className="mt-error-banner">{error}</div>
      </div>
    );
  }

  return (
    <div className="mt-page">

      {/* ══ HERO BANNER ══════════════════════════════════════════════════ */}
      <header className="mt-hero">
        <div className="mt-hero-left">
          <div className="mt-hero-eyebrow">
            <span className="mt-pulse-dot" />
            My Tasks · Personal Workspace
          </div>
          <h1 className="mt-hero-h1">{greeting()}, here's your focus 🎯</h1>
          <p className="mt-hero-sub">
            {heroStats.overdue > 0
              ? `You have ${heroStats.overdue} overdue task${heroStats.overdue !== 1 ? "s" : ""}${heroStats.today > 0 ? ` and ${heroStats.today} due today` : ""}.`
              : heroStats.today > 0
              ? `You have ${heroStats.today} task${heroStats.today !== 1 ? "s" : ""} due today. Keep pushing!`
              : `${heroStats.total} tasks assigned — ${heroStats.done} complete. You're doing great!`}
          </p>

          <div className="mt-hero-stats">
            <StatCard value={heroStats.total}   label="Total"   color="#6366F1" bg="#EEF2FF" icon={Layers}       />
            <StatCard value={heroStats.done}    label="Done"    color="#059669" bg="#ECFDF5" icon={CheckCircle2} />
            {heroStats.today > 0 && <StatCard value={heroStats.today}   label="Today"   color="#2563EB" bg="#EFF6FF" icon={Clock}        />}
            {heroStats.overdue > 0 && <StatCard value={heroStats.overdue} label="Overdue" color="#DC2626" bg="#FEF2F2" icon={AlertTriangle} />}
          </div>
        </div>

        <div className="mt-hero-right">
          <div className="mt-completion-ring">
            <svg width="96" height="96" viewBox="0 0 96 96">
              <defs>
                <linearGradient id="hero-ring-g" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#A78BFA" />
                </linearGradient>
              </defs>
              <circle cx="48" cy="48" r="38" fill="none" stroke="#EEF2FF" strokeWidth="7" />
              <circle
                cx="48" cy="48" r="38"
                fill="none"
                stroke="url(#hero-ring-g)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 38}
                strokeDashoffset={2 * Math.PI * 38 * (1 - heroStats.pct / 100)}
                transform="rotate(-90 48 48)"
                className="mt-ring-fill-animated"
              />
            </svg>
            <div className="mt-completion-label">
              <span className="mt-completion-pct">{heroStats.pct}</span>
              <span className="mt-completion-unit">%</span>
            </div>
          </div>
          <span className="mt-completion-caption">Completion</span>
        </div>
      </header>

      {/* ══ TABS ══════════════════════════════════════════════════════════ */}
      <div className="mt-tabs-scroll">
        <div className="mt-tabs">
          {STATUS_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`mt-tab${activeTab === key ? " mt-tab--active" : ""}`}
              onClick={() => setActiveTab(key)}
            >
              <Icon size={11} />
              {label}
              {tabCounts[key] > 0 && (
                <span className={`mt-tab-badge${activeTab === key ? " mt-tab-badge--active" : ""}`}>
                  {tabCounts[key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ══ FILTER BAR ═══════════════════════════════════════════════════ */}
      <div className="mt-toolbar">
        <div className="mt-search-box">
          <Search size={13} className="mt-search-icon" />
          <input
            className="mt-search-input"
            placeholder="Search tasks, projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="mt-search-clear" onClick={() => setSearch("")}>
              <X size={11} />
            </button>
          )}
        </div>

        <button
          className={`mt-filter-btn${showFilters ? " active" : ""}`}
          onClick={() => setShowFilters((o) => !o)}
        >
          <SlidersHorizontal size={12} />
          Filters
          {activeFiltersCount > 0 && <span className="mt-filter-count">{activeFiltersCount}</span>}
        </button>

        <div className="mt-toolbar-right">
          <select className="mt-sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <div className="mt-view-switcher">
            <button className={`mt-view-btn${viewMode === "grid" ? " active" : ""}`} onClick={() => setViewMode("grid")} title="Grid">
              <LayoutGrid size={12} />
            </button>
            <button className={`mt-view-btn${viewMode === "list" ? " active" : ""}`} onClick={() => setViewMode("list")} title="List">
              <List size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter drawer */}
      {showFilters && (
        <div className="mt-filter-drawer">
          <div className="mt-filter-group">
            <span className="mt-filter-group-label"><Filter size={10} />Priority</span>
            <div className="mt-filter-chips">
              {["all", "critical", "high", "medium", "low"].map((p) => (
                <button
                  key={p}
                  className={`mt-chip${priorityFilter === p ? " active" : ""}`}
                  style={priorityFilter === p && p !== "all" ? {
                    background: PRIORITY_CONFIG[p]?.bg,
                    color: PRIORITY_CONFIG[p]?.color,
                    borderColor: PRIORITY_CONFIG[p]?.border,
                  } : {}}
                  onClick={() => setPriority(p)}
                >
                  {p === "all" ? "All priorities" : PRIORITY_CONFIG[p]?.label}
                </button>
              ))}
            </div>
          </div>

          {projects.length > 0 && (
            <div className="mt-filter-group">
              <span className="mt-filter-group-label"><Layers size={10} />Project</span>
              <div className="mt-filter-chips">
                <button className={`mt-chip${projectFilter === "all" ? " active" : ""}`} onClick={() => setProject("all")}>All projects</button>
                {projects.map((p) => (
                  <button key={p} className={`mt-chip${projectFilter === p ? " active" : ""}`} onClick={() => setProject(p)}>{p}</button>
                ))}
              </div>
            </div>
          )}

          {activeFiltersCount > 0 && (
            <button className="mt-clear-filters" onClick={() => { setPriority("all"); setProject("all"); setSortBy("due_date_asc"); }}>
              <X size={10} />Clear filters
            </button>
          )}
        </div>
      )}

      {/* ══ MAIN CONTENT ══════════════════════════════════════════════════ */}
      <div className="mt-layout">
        <div className="mt-main-area">
          {loading ? (
            <TaskSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState filter={activeTab} />
          ) : viewMode === "grid" ? (
            <div className="mt-card-grid">
              {filtered.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  onRaiseIssue={openTaskWorkspace}
                  onOpenTask={openTaskWorkspace}
                />
              ))}
            </div>
          ) : (
            <div className="mt-list-view">
              <div className="mt-list-header">
                <span>Task</span>
                <span>Priority · Status · Due</span>
              </div>
              {filtered.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  onRaiseIssue={openTaskWorkspace}
                  onOpenTask={openTaskWorkspace}
                />
              ))}
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <p className="mt-results-label">
              Showing {filtered.length} of {tasks.length} tasks
            </p>
          )}
        </div>

        {!loading && <Sidebar tasks={tasks} activities={recentActivities} />}
      </div>

      {selectedIssue && (
        <IssueDetailsModal
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
          onUpdate={(updated) => {
            setTasks((prev) =>
              prev.map((t) => (t.id === updated.id ? { ...t, status: updated.status } : t))
            );
          }}
        />
      )}

    </div>
  );
}

export default function MyTasks() {
  return (
    <IssueProvider>
      <MyTasksContent />
    </IssueProvider>
  );
}