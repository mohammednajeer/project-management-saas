import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  Target,
  X,
  Circle,
  Eye,
  Activity,
  Zap,
  ArrowRight,
  ClipboardList,
} from "lucide-react";

import api from "../../services/api";
import "./AssignedTasks.css";

/* ─── CONSTANTS ─────────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  todo:        { label: "Todo",        color: "#D97706", bg: "#FEF3C7", border: "rgba(217,119,6,0.15)",  accent: "#F59E0B" },
  in_progress: { label: "In Progress", color: "#2563EB", bg: "#EFF6FF", border: "rgba(37,99,235,0.15)",   accent: "#3B82F6" },
  review:      { label: "Review",      color: "#7C3AED", bg: "#F5F3FF", border: "rgba(124,58,237,0.15)",  accent: "#8B5CF6" },
  done:        { label: "Done",        color: "#059669", bg: "#ECFDF5", border: "rgba(5,150,105,0.15)",   accent: "#10B981" },
};

const PRIORITY_CONFIG = {
  critical: { label: "Critical", color: "#E11D48", bg: "#FFF1F2",  border: "rgba(225,29,72,0.15)",   dot: "#F43F5E",  cardTint: "rgba(255,241,242,0.4)"  },
  high:     { label: "High",     color: "#D97706", bg: "#FEF3C7",  border: "rgba(217,119,6,0.15)",   dot: "#F59E0B",  cardTint: "rgba(254,243,199,0.4)"  },
  medium:   { label: "Medium",   color: "#2563EB", bg: "#EFF6FF",  border: "rgba(37,99,235,0.15)",  dot: "#3B82F6",  cardTint: "rgba(239,246,255,0.4)"  },
  low:      { label: "Low",      color: "#475569", bg: "#F8FAFC",  border: "rgba(71,85,105,0.15)", dot: "#64748B",  cardTint: "rgba(248,250,252,0.4)"  },
};

const CARD_PALETTE = {
  todo:        "#FEF3C7",
  in_progress: "#EFF6FF",
  review:      "#F5F3FF",
  done:        "#ECFDF5",
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

function isOverdue(due_date, status) {
  if (!due_date || status === "done") return false;
  return new Date(due_date) < new Date();
}

function getDaysUntilDue(due_date) {
  if (!due_date) return null;
  return Math.ceil((new Date(due_date).getTime() - Date.now()) / 86400000);
}

function getStatusProgress(s) {
  return { todo: 8, in_progress: 45, review: 75, done: 100 }[s] || 8;
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
    <div className="at-skeleton-grid">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="at-task-skeleton">
          <div className="at-sk at-sk-top-bar" />
          <div className="at-sk at-sk-bar" style={{ width: "65%", marginTop: 14 }} />
          <div className="at-sk at-sk-bar" style={{ width: "45%", marginTop: 7 }} />
          <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
            <div className="at-sk at-sk-pill" />
            <div className="at-sk at-sk-pill" style={{ width: 50 }} />
          </div>
          <div className="at-sk at-sk-progress" style={{ marginTop: 12 }} />
          <div className="at-sk at-sk-bar" style={{ width: "35%", marginTop: 10 }} />
        </div>
      ))}
    </div>
  );
}

/* ─── EMPTY STATE ────────────────────────────────────────────────────────── */
function EmptyState({ filter }) {
  const configs = {
    all:         { emoji: "📋", title: "No primary tasks assigned", sub: "Tasks assigned directly to you will appear here." },
    todo:        { emoji: "🌟", title: "All todo cleared!",         sub: "You don't have any tasks waiting to be started." },
    in_progress: { emoji: "⚡", title: "No tasks in progress",     sub: "Choose a task, click it to open workspace, and start working!" },
    review:      { emoji: "🔍", title: "No tasks in review",       sub: "Nothing is currently awaiting verification." },
    done:        { emoji: "🏆", title: "No completed tasks yet",  sub: "Work on your tasks and mark them complete to see achievements here." },
    overdue:     { emoji: "🎉", title: "No overdue tasks!",        sub: "Great job keeping up with all your deadlines!" },
  };
  const c = configs[filter] || configs.all;
  return (
    <div className="at-empty">
      <div className="at-empty-icon">{c.emoji}</div>
      <h3 className="at-empty-title">{c.title}</h3>
      <p className="at-empty-sub">{c.sub}</p>
    </div>
  );
}

/* ─── STAT CARD ──────────────────────────────────────────────────────────── */
function StatCard({ value, label, color, bg, icon: Icon }) {
  return (
    <div className="at-stat-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="at-stat-details">
        <span className="at-stat-val">{value}</span>
        <span className="at-stat-lbl">{label}</span>
      </div>
      <div className="at-stat-icon-wrap" style={{ background: bg, color }}>
        <Icon size={16} />
      </div>
    </div>
  );
}

/* ─── DUE BADGE ──────────────────────────────────────────────────────────── */
function DueBadge({ due_date, status }) {
  if (!due_date) return <span className="at-due at-due--none">No due date</span>;
  const days  = getDaysUntilDue(due_date);
  const over  = isOverdue(due_date, status);
  if (over)    return <span className="at-due at-due--overdue">⚠ Overdue</span>;
  if (days === 0) return <span className="at-due at-due--today">Today</span>;
  if (days === 1) return <span className="at-due at-due--tomorrow">Tomorrow</span>;
  if (days <= 3)  return <span className="at-due at-due--soon">In {days}d</span>;
  return <span className="at-due at-due--normal">{formatDate(due_date)}</span>;
}

/* ─── PRIORITY BADGE ─────────────────────────────────────────────────────── */
function PriorityBadge({ priority }) {
  const key = priority?.toLowerCase() || "low";
  const cfg = PRIORITY_CONFIG[key] || PRIORITY_CONFIG.low;
  return (
    <span className="at-priority-badge" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
      <span className="at-priority-dot" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

/* ─── STATUS SELECT ──────────────────────────────────────────────────────── */
function StatusSelect({ status, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.todo;

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div className="at-status-wrap" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        className="at-status-pill"
        style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="at-status-dot" style={{ background: cfg.accent }} />
        {cfg.label}
        <ChevronDown size={9} />
      </button>
      {open && (
        <div className="at-status-dropdown">
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <button
              key={k}
              className={`at-status-option ${k === status ? "active" : ""}`}
              onClick={() => { onChange?.(k); setOpen(false); }}
            >
              <span className="at-status-option-dot" style={{ background: v.accent }} />
              {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── TASK CARD ──────────────────────────────────────────────────────────── */
function TaskCard({ task, onStatusChange, onOpenTask }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const overdue   = isOverdue(task.due_date, task.status);
  const statusKey = task.status || "todo";
  const paletteBg = CARD_PALETTE[statusKey] || CARD_PALETTE.todo;
  const progress  = getStatusProgress(statusKey);
  const barColor  = STATUS_CONFIG[statusKey]?.accent || "#94a3b8";

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  const projectName = task.project?.title || "—";

  return (
    <article
      className={`at-task-card${overdue ? " at-task-card--overdue" : ""}`}
      style={!overdue ? { background: paletteBg } : {}}
      onClick={() => onOpenTask?.(task.id)}
      onKeyDown={(e) => e.key === "Enter" && onOpenTask?.(task.id)}
      role="button"
      tabIndex={0}
    >
      <div className="at-card-header">
        <span className="at-card-project-tag">
          <Layers size={9} />
          {projectName}
        </span>
        <div className="at-card-actions" onClick={(e) => e.stopPropagation()}>
          <button className="at-icon-btn" title="Open Workspace" onClick={() => onOpenTask?.(task.id)}>
            <ExternalLink size={11} />
          </button>
          <div className="at-menu-wrap" ref={menuRef}>
            <button className="at-icon-btn" onClick={() => setMenuOpen((o) => !o)}>
              <MoreHorizontal size={11} />
            </button>
            {menuOpen && (
              <div className="at-card-menu">
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <button
                    key={k}
                    className="at-card-menu-item"
                    onClick={() => { onStatusChange?.(task.id, k); setMenuOpen(false); }}
                  >
                    <span className="at-menu-dot" style={{ background: v.accent }} />
                    Mark as {v.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="at-card-body">
        <h3 className="at-card-title">{task.title}</h3>
        <p className="at-card-desc">{task.description || "No description provided."}</p>
      </div>

      <div className="at-card-progress">
        <div className="at-card-progress-label">
          <span>Task Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="at-card-progress-track">
          <div className="at-card-progress-fill" style={{ width: `${progress}%`, background: barColor }} />
        </div>
      </div>

      <div className="at-card-footer">
        <div className="at-card-meta">
          <PriorityBadge priority={task.priority} />
          <DueBadge due_date={task.due_date} status={task.status} />
        </div>
        <div className="at-card-stats">
          {task.comments_count > 0 && (
            <span className="at-stat-badge" title={`${task.comments_count} comments`}>
              <MessageCircle size={10} />
              {task.comments_count}
            </span>
          )}
          {task.attachments_count > 0 && (
            <span className="at-stat-badge" title={`${task.attachments_count} attachments`}>
              <Paperclip size={10} />
              {task.attachments_count}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

/* ─── TASK ROW (LIST VIEW) ────────────────────────────────────────────────── */
function TaskRow({ task, onStatusChange, onOpenTask }) {
  const statusKey = task.status || "todo";
  const overdue = isOverdue(task.due_date, task.status);

  return (
    <div
      className={`at-task-row${overdue ? " at-task-row--overdue" : ""}`}
      onClick={() => onOpenTask?.(task.id)}
      onKeyDown={(e) => e.key === "Enter" && onOpenTask?.(task.id)}
      role="button"
      tabIndex={0}
    >
      <div className="at-row-main">
        <div className="at-row-project">{task.project?.title || "—"}</div>
        <div className="at-row-title-desc">
          <h4 className="at-row-title">{task.title}</h4>
          <p className="at-row-desc">{task.description || "No description provided."}</p>
        </div>
      </div>

      <div className="at-row-meta">
        <PriorityBadge priority={task.priority} />
        <StatusSelect status={statusKey} onChange={(val) => onStatusChange?.(task.id, val)} />
        <DueBadge due_date={task.due_date} status={task.status} />
        <button className="at-row-open" title="Open Workspace" onClick={(e) => { e.stopPropagation(); onOpenTask?.(task.id); }}>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ──────────────────────────────────────────────────────── */
export default function AssignedTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [sortBy, setSortBy] = useState("due_date_asc");
  const [viewMode, setViewMode] = useState("grid");
  const [showFilters, setShowFilters] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get("/workspace/my-tasks/");
      const items = Array.isArray(res.data) ? res.data : res.data.results || [];
      // Keep ONLY parent tasks (main tasks assigned to the employee)
      const parentItems = items.filter((t) => t.is_parent_task === true);
      setTasks(parentItems);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load assigned tasks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleStatusChange = useCallback(async (taskId, newStatus) => {
    let oldStatus = null;
    setTasks((prev) => prev.map((t) => {
      if (t.id === taskId) {
        oldStatus = t.status;
        return { ...t, status: newStatus };
      }
      return t;
    }));

    try {
      // Patch task status in the backend
      await api.patch(`/tasks/task/${taskId}/`, { status: newStatus });
    } catch (err) {
      if (oldStatus) {
        setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: oldStatus } : t));
      }
    }
  }, []);

  const handleOpenTask = useCallback((taskId) => {
    navigate(`/workspace/task/${taskId}`);
  }, [navigate]);

  /* ── Derived Lists & Filter Computations ── */
  const projectsList = useMemo(() => {
    const s = new Set();
    tasks.forEach((t) => {
      const pName = t.project?.title;
      if (pName) s.add(pName);
    });
    return Array.from(s);
  }, [tasks]);

  const tabCounts = useMemo(() => {
    const c = { all: tasks.length, todo: 0, in_progress: 0, review: 0, done: 0, overdue: 0 };
    tasks.forEach((t) => {
      const status = t.status || "todo";
      if (c[status] !== undefined) c[status]++;
      if (isOverdue(t.due_date, t.status)) c.overdue++;
    });
    return c;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let list = [...tasks];

    // Status / Overdue Filter
    if (activeTab === "overdue") {
      list = list.filter((t) => isOverdue(t.due_date, t.status));
    } else if (activeTab !== "all") {
      list = list.filter((t) => (t.status || "todo") === activeTab);
    }

    // Search Query Filter
    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter((t) =>
        t.title?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query) ||
        t.project?.title?.toLowerCase().includes(query)
      );
    }

    // Priority Filter
    if (priorityFilter !== "all") {
      list = list.filter((t) => t.priority?.toLowerCase() === priorityFilter);
    }

    // Project Filter
    if (projectFilter !== "all") {
      list = list.filter((t) => (t.project?.title) === projectFilter);
    }

    // Sorting
    switch (sortBy) {
      case "due_date_asc":
        list.sort((a, b) => (!a.due_date ? 1 : !b.due_date ? -1 : new Date(a.due_date) - new Date(b.due_date)));
        break;
      case "due_date_desc":
        list.sort((a, b) => (!a.due_date ? 1 : !b.due_date ? -1 : new Date(b.due_date) - new Date(a.due_date)));
        break;
      case "priority_desc":
        list.sort((a, b) => (PRIORITY_ORDER[b.priority?.toLowerCase()] || 0) - (PRIORITY_ORDER[a.priority?.toLowerCase()] || 0));
        break;
      case "title_asc":
        list.sort((a, b) => a.title?.localeCompare(b.title));
        break;
      default:
        break;
    }

    return list;
  }, [tasks, activeTab, search, priorityFilter, projectFilter, sortBy]);

  const heroStats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const overdue = tasks.filter((t) => isOverdue(t.due_date, t.status)).length;
    
    const now = new Date();
    const today = tasks.filter((t) => {
      if (!t.due_date || t.status === "done") return false;
      const d = new Date(t.due_date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    }).length;

    const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, today, overdue, progressPct };
  }, [tasks]);

  const activeFiltersCount = [
    priorityFilter !== "all",
    projectFilter !== "all",
    sortBy !== "due_date_asc",
  ].filter(Boolean).length;

  if (error) {
    return (
      <div className="at-page">
        <div className="at-error-banner">{error}</div>
      </div>
    );
  }

  return (
    <div className="at-page">
      {/* ── HERO HEADER ── */}
      <header className="at-hero">
        <div className="at-hero-left">
          <div className="at-hero-eyebrow">
            <span className="at-pulse-dot" />
            Core Assigned Tasks Hub
          </div>
          <h1 className="at-hero-h1">{greeting()}, focus on your assignments! 🎯</h1>
          <p className="at-hero-sub">
            {heroStats.overdue > 0
              ? `You have ${heroStats.overdue} overdue task${heroStats.overdue !== 1 ? "s" : ""}${heroStats.today > 0 ? ` and ${heroStats.today} due today` : ""}. Take action to clear blockers.`
              : heroStats.today > 0
              ? `You have ${heroStats.today} task${heroStats.today !== 1 ? "s" : ""} due today. Keep the momentum going!`
              : `${heroStats.total} primary tasks assigned — ${heroStats.done} completed. You are making excellent headway!`}
          </p>

          <div className="at-hero-stats">
            <StatCard value={heroStats.total} label="Total Tasks" color="#6354c4" bg="rgba(99, 84, 196, 0.12)" icon={Layers} />
            <StatCard value={heroStats.done} label="Completed" color="#3D9A5F" bg="rgba(61, 154, 95, 0.12)" icon={CheckCircle2} />
            {heroStats.today > 0 && <StatCard value={heroStats.today} label="Due Today" color="#D4835E" bg="rgba(212, 131, 94, 0.12)" icon={Clock} />}
            {heroStats.overdue > 0 && <StatCard value={heroStats.overdue} label="Overdue" color="#A34A30" bg="rgba(163, 74, 48, 0.12)" icon={AlertTriangle} />}
          </div>
        </div>
      </header>

      {/* ── STATUS TABS ── */}
      <div className="at-tabs-scroll">
        <div className="at-tabs">
          {STATUS_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`at-tab${activeTab === key ? " at-tab--active" : ""}`}
              onClick={() => setActiveTab(key)}
            >
              <Icon size={12} />
              {label}
              {tabCounts[key] > 0 && (
                <span className={`at-tab-badge${activeTab === key ? " at-tab-badge--active" : ""}`}>
                  {tabCounts[key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── FILTER & TOOLBAR ── */}
      <div className="at-toolbar">
        <div className="at-search-box">
          <Search size={13} className="at-search-icon" />
          <input
            className="at-search-input"
            placeholder="Search assigned tasks or projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="at-search-clear" onClick={() => setSearch("")}>
              <X size={11} />
            </button>
          )}
        </div>

        <button
          className={`at-filter-btn${showFilters ? " active" : ""}`}
          onClick={() => setShowFilters((o) => !o)}
        >
          <SlidersHorizontal size={12} />
          Filters
          {activeFiltersCount > 0 && <span className="at-filter-count">{activeFiltersCount}</span>}
        </button>

        <div className="at-toolbar-right">
          <select className="at-sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <div className="at-view-switcher">
            <button className={`at-view-btn${viewMode === "grid" ? " active" : ""}`} onClick={() => setViewMode("grid")} title="Grid View">
              <LayoutGrid size={12} />
            </button>
            <button className={`at-view-btn${viewMode === "list" ? " active" : ""}`} onClick={() => setViewMode("list")} title="List View">
              <List size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Drawer */}
      {showFilters && (
        <div className="at-filter-drawer">
          <div className="at-filter-group">
            <span className="at-filter-group-label"><Filter size={10} />Priority</span>
            <div className="at-filter-chips">
              {["all", "critical", "high", "medium", "low"].map((p) => (
                <button
                  key={p}
                  className={`at-chip${priorityFilter === p ? " active" : ""}`}
                  style={priorityFilter === p && p !== "all" ? {
                    background: PRIORITY_CONFIG[p]?.bg,
                    color: PRIORITY_CONFIG[p]?.color,
                    borderColor: PRIORITY_CONFIG[p]?.border,
                  } : {}}
                  onClick={() => setPriorityFilter(p)}
                >
                  {p === "all" ? "All priorities" : PRIORITY_CONFIG[p]?.label}
                </button>
              ))}
            </div>
          </div>

          {projectsList.length > 0 && (
            <div className="at-filter-group">
              <span className="at-filter-group-label"><Layers size={10} />Project</span>
              <div className="at-filter-chips">
                <button className={`at-chip${projectFilter === "all" ? " active" : ""}`} onClick={() => setProjectFilter("all")}>All projects</button>
                {projectsList.map((p) => (
                  <button key={p} className={`at-chip${projectFilter === p ? " active" : ""}`} onClick={() => setProjectFilter(p)}>{p}</button>
                ))}
              </div>
            </div>
          )}

          {activeFiltersCount > 0 && (
            <button className="at-clear-filters" onClick={() => { setPriorityFilter("all"); setProjectFilter("all"); setSortBy("due_date_asc"); }}>
              <X size={10} />Clear filters
            </button>
          )}
        </div>
      )}

      {/* ── TASKS CONTAINER ── */}
      <div className="at-layout">
        <div className="at-main-area">
          {loading ? (
            <TaskSkeleton />
          ) : filteredTasks.length === 0 ? (
            <EmptyState filter={activeTab} />
          ) : viewMode === "grid" ? (
            <div className="at-card-grid">
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  onOpenTask={handleOpenTask}
                />
              ))}
            </div>
          ) : (
            <div className="at-list-view">
              <div className="at-list-header">
                <span>Task Overview</span>
                <span>Metadata & Actions</span>
              </div>
              {filteredTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  onOpenTask={handleOpenTask}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
