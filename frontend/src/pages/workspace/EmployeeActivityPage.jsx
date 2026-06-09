import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Activity,
  AlertCircle,
  Clock,
  FolderOpen,
  RefreshCw,
  Search,
  CheckCircle2,
  MessageSquare,
  UserPlus,
  ListTodo,
  Layers,
  PlusCircle,
  Pencil,
  Trash2,
  LayoutGrid,
  Users,
  TrendingUp,
  Zap,
} from "lucide-react";
import api from "../../services/api";
import "./EmployeeActivityPage.css";

/* ─── CONSTANTS ──────────────────────────────────────────────────────────── */
const ACTION_META = {
  task_created:      { label: "Task Created",       icon: <PlusCircle size={10} />,   color: "#16A34A" },
  task_updated:      { label: "Task Updated",       icon: <Pencil size={10} />,       color: "#2563EB" },
  task_deleted:      { label: "Task Deleted",       icon: <Trash2 size={10} />,       color: "#DC2626" },
  subtask_created:   { label: "Subtask Created",    icon: <PlusCircle size={10} />,   color: "#7C3AED" },
  subtask_updated:   { label: "Subtask Updated",    icon: <Pencil size={10} />,       color: "#4F46E5" },
  subtask_completed: { label: "Subtask Completed",  icon: <CheckCircle2 size={10} />, color: "#059669" },
  comment_added:     { label: "Comment Added",      icon: <MessageSquare size={10}/>, color: "#D97706" },
  member_added:      { label: "Member Added",       icon: <UserPlus size={10} />,     color: "#0891B2" },
  project_created:   { label: "Project Created",    icon: <FolderOpen size={10} />,   color: "#DB2777" },
};

const FILTER_TABS = [
  { key: "all",     label: "All",      icon: <LayoutGrid size={11} /> },
  { key: "task",    label: "Tasks",    icon: <ListTodo size={11} /> },
  { key: "subtask", label: "Subtasks", icon: <Layers size={11} /> },
  { key: "comment", label: "Comments", icon: <MessageSquare size={11} /> },
  { key: "project", label: "Projects", icon: <FolderOpen size={11} /> },
  { key: "member",  label: "Members",  icon: <UserPlus size={11} /> },
];

const STAT_ITEMS = [
  { key: "task",     label: "Task Events",    icon: <ListTodo size={16} />, actions: ["task_created","task_updated","task_deleted"] },
  { key: "subtask",  label: "Subtask Events", icon: <Layers size={16} />, actions: ["subtask_created","subtask_updated","subtask_completed"] },
  { key: "comment",  label: "Comments",       icon: <MessageSquare size={16} />, actions: ["comment_added"] },
  { key: "project",  label: "Projects",       icon: <FolderOpen size={16} />, actions: ["project_created"] },
  { key: "member",   label: "Members",        icon: <Users size={16} />, actions: ["member_added"] },
];

const BREAKDOWN_COLORS = {
  task_created:      "#16A34A",
  task_updated:      "#2563EB",
  task_deleted:      "#DC2626",
  subtask_created:   "#7C3AED",
  subtask_updated:   "#4F46E5",
  subtask_completed: "#059669",
  comment_added:     "#D97706",
  member_added:      "#0891B2",
  project_created:   "#DB2777",
};

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#6C53B3,#9C7EE0)",
  "linear-gradient(135deg,#0891B2,#38BDF8)",
  "linear-gradient(135deg,#DB2777,#F472B6)",
  "linear-gradient(135deg,#059669,#34D399)",
  "linear-gradient(135deg,#D97706,#FCD34D)",
  "linear-gradient(135deg,#7C3AED,#A78BFA)",
];

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
function formatRelativeTime(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "Just now";
  const diff = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  const mins  = Math.floor(diff / 60);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (diff < 60)  return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7)   return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateGroup(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "Unknown";
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString())     return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function buildInitials(user) {
  const src = user?.name || user?.email || "?";
  return src.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

function formatRole(role) {
  if (!role) return "Member";
  return role.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function buildText(activity) {
  if (activity.message) return activity.message;
  return (activity.action || "activity").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function getActionMeta(action) {
  return ACTION_META[action] || { label: formatRole(action), icon: <Activity size={10} />, color: "#6B7280" };
}

function groupByDate(activities) {
  const groups = {};
  activities.forEach(a => {
    const key = formatDateGroup(a.created_at);
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  });
  return Object.entries(groups);
}

/* ─── SKELETON ───────────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="ap-skeleton-list">
      {[0,1,2,3,4].map(i => (
        <div key={i} className="ap-skeleton-row">
          <div className="ap-skeleton-rail">
            <div className="ap-skeleton-dot" />
          </div>
          <div className="ap-skeleton-card">
            <div className="ap-skeleton-av" />
            <div className="ap-skeleton-body">
              <span className="ap-skeleton-line w-20" />
              <span className="ap-skeleton-line w-70" />
              <span className="ap-skeleton-line w-45" />
              <span className="ap-skeleton-line w-55" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── SIDEBAR: TYPE BREAKDOWN ────────────────────────────────────────────── */
function TypeBreakdown({ activities }) {
  const breakdown = useMemo(() => {
    const counts = {};
    activities.forEach(a => { counts[a.action] = (counts[a.action] || 0) + 1; });
    const max = Math.max(...Object.values(counts), 1);
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([action, count]) => ({
        action,
        label: getActionMeta(action).label,
        color: BREAKDOWN_COLORS[action] || "#6B7280",
        count,
        pct: Math.round((count / max) * 100),
      }));
  }, [activities]);

  if (breakdown.length === 0)
    return <div style={{ padding: "16px 18px", fontSize: 12, color: "var(--text-3)" }}>No data yet</div>;

  return (
    <div className="ap-breakdown-list">
      {breakdown.map(item => (
        <div key={item.action} className="ap-breakdown-row">
          <div className="ap-breakdown-dot" style={{ background: item.color }} />
          <span className="ap-breakdown-label">{item.label}</span>
          <div className="ap-mini-bar-track">
            <div className="ap-mini-bar-fill" style={{ width: `${item.pct}%`, background: item.color }} />
          </div>
          <span className="ap-breakdown-count">{item.count}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── SIDEBAR: ACTIVE USERS ──────────────────────────────────────────────── */
function ActiveUsers({ activities }) {
  const users = useMemo(() => {
    const map = {};
    activities.forEach(a => {
      const u = a.user_data;
      if (!u) return;
      const id = u.id || u.email;
      if (!map[id]) map[id] = { user: u, count: 0 };
      map[id].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [activities]);

  if (users.length === 0)
    return <div style={{ padding: "16px 18px", fontSize: 12, color: "var(--text-3)" }}>No users yet</div>;

  return (
    <div className="ap-users-list">
      {users.map(({ user, count }, i) => (
        <div key={user.id || user.email} className="ap-user-item">
          <div className="ap-user-av" style={{ background: user.profile_picture ? "transparent" : AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length] }}>
            {user.profile_picture ? (
              <img src={user.profile_picture} alt="" />
            ) : (
              buildInitials(user)
            )}
          </div>
          <div className="ap-user-item-info">
            <div className="ap-user-item-name">{user.name || user.email || "Unknown"}</div>
            <div className="ap-user-item-count">{count} event{count !== 1 ? "s" : ""}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── SKELETON SIDEBAR ROWS ──────────────────────────────────────────────── */
const skeletonStyle = {
  animation: "ap-shimmer 1.4s infinite",
  backgroundSize: "600px 100%",
  backgroundImage: "linear-gradient(90deg, rgba(108,83,179,0.06) 25%, rgba(255,255,255,0.5) 50%, rgba(108,83,179,0.06) 75%)",
  background: "var(--bg-muted)",
  borderRadius: 6,
};

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────── */
export default function EmployeeActivityPage() {
  const [activities, setActivities]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState("");
  const [search, setSearch]             = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const fetchActivities = useCallback(async ({ showLoading = true } = {}) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);
      setError("");
      const res = await api.get("/workspace/activity-feed/");
      setActivities(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.log(err);
      setError("Unable to load workspace activity. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const statCounts = useMemo(() => {
    const counts = {};
    STAT_ITEMS.forEach(s => {
      counts[s.key] = activities.filter(a => s.actions.includes(a.action)).length;
    });
    return counts;
  }, [activities]);

  const filtered = useMemo(() => {
    return activities.filter(a => {
      const matchFilter =
        activeFilter === "all" ||
        STAT_ITEMS.find(s => s.key === activeFilter)?.actions.includes(a.action);
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        buildText(a).toLowerCase().includes(q) ||
        (a.user_data?.name || "").toLowerCase().includes(q) ||
        (a.project_data?.name || "").toLowerCase().includes(q) ||
        (a.task_data?.title || "").toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [activities, activeFilter, search]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const latestTime = useMemo(() =>
    activities.length ? formatRelativeTime(activities[0]?.created_at) : "No activity",
  [activities]);

  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return activities.filter(a => a.created_at && new Date(a.created_at).toDateString() === today).length;
  }, [activities]);

  return (
    <main className="activity-page">

      {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
      <div className="ap-page-header">
        <div className="ap-header-inner">
          <div className="ap-header-left">
            <div className="ap-eyebrow">
              <span className="ap-live-dot" />
              Employee Workspace Audit
            </div>
            <h1 className="ap-title">Activity Center</h1>
            <p className="ap-subtitle">Track every action across projects, tasks, and your team.</p>
          </div>

          <div className="ap-header-kpis">
            <div className="ap-kpi-card">
              <div className="ap-kpi-label">Total Events</div>
              <div className="ap-kpi-value">{loading ? "—" : activities.length}</div>
            </div>
            <div className="ap-kpi-card">
              <div className="ap-kpi-label">Today</div>
              <div className="ap-kpi-value">{loading ? "—" : todayCount}</div>
            </div>
            <div className="ap-kpi-card">
              <div className="ap-kpi-label">Last Activity</div>
              <div className="ap-kpi-value--sm">{loading ? "—" : latestTime}</div>
            </div>
            <div className="ap-live-badge">
              <span className="ap-live-pulse" />
              Live
            </div>
          </div>
        </div>
      </div>

      {/* ── STAT CHIPS ──────────────────────────────────────────────────── */}
      <div className="ap-stat-chips">
        {STAT_ITEMS.map(s => (
          <div
            key={s.key}
            className={`ap-chip ${activeFilter === s.key ? "active" : ""}`}
            onClick={() => setActiveFilter(activeFilter === s.key ? "all" : s.key)}
          >
            <div className="ap-chip-icon">
              {s.icon}
            </div>
            <div className="ap-chip-body">
              <div className="ap-chip-count">{loading ? "—" : statCounts[s.key]}</div>
              <div className="ap-chip-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── MAIN LAYOUT ─────────────────────────────────────────────────── */}
      <div className="ap-page-layout">

        {/* ── LEFT: Timeline ──────────────────────────────────────────── */}
        <div>
          {/* Toolbar */}
          <div className="ap-toolbar">
            <div className="ap-search-wrap">
              <Search size={13} className="ap-search-icon" />
              <input
                className="ap-search-input"
                placeholder="Search by user, project, task..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="ap-divider" />
            <div className="ap-filter-tabs">
              {FILTER_TABS.map(t => (
                <button
                  key={t.key}
                  type="button"
                  className={`ap-filter-tab ${activeFilter === t.key ? "active" : ""}`}
                  onClick={() => setActiveFilter(t.key)}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
            <div className="ap-divider" />
            <button
              type="button"
              className={`ap-refresh-btn ${refreshing ? "spinning" : ""}`}
              onClick={() => fetchActivities({ showLoading: false })}
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>

          {/* Panel */}
          <div className="ap-panel">
            <div className="ap-panel-header">
              <div>
                <h2 className="ap-panel-title">Workspace Timeline</h2>
                <p className="ap-panel-sub">Company-wide project, task, subtask, and comment history.</p>
              </div>
              <span className="ap-count-tag">
                {loading ? "..." : `${filtered.length} event${filtered.length !== 1 ? "s" : ""}`}
              </span>
            </div>

            {loading ? (
              <Skeleton />
            ) : error ? (
              <div className="ap-state">
                <div className="ap-state-icon ap-state-icon--error">
                  <AlertCircle size={24} />
                </div>
                <h3>Could not load activity</h3>
                <p>{error}</p>
                <button type="button" className="ap-retry-btn" onClick={() => fetchActivities()}>
                  <RefreshCw size={12} /> Try Again
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="ap-state">
                <div className="ap-state-icon">
                  <Activity size={24} />
                </div>
                <h3>{search || activeFilter !== "all" ? "No matching events" : "No activity yet"}</h3>
                <p>
                  {search || activeFilter !== "all"
                    ? "Try adjusting your search or filter to see more results."
                    : "New project, task, comment, and member events will appear here."}
                </p>
              </div>
            ) : (
              <div className="ap-timeline">
                {grouped.map(([dateLabel, items]) => (
                  <div key={dateLabel} className="ap-date-group">
                    <div className="ap-date-label">
                      <span className="ap-date-label-text">{dateLabel}</span>
                    </div>
                    {items.map(activity => {
                      const user         = activity.user_data || {};
                      const meta         = getActionMeta(activity.action);
                      const dotClass     = `ap-dot--${activity.action || "default"}`;
                      const badgeClass   = `ap-action-badge--${activity.action || "default"}`;
                      const projectName  = activity.project_data?.name;
                      const taskTitle    = activity.task_data?.title;
                      const subtaskTitle = activity.subtask_data?.title;

                      return (
                        <div key={activity.id} className="ap-rail-row">
                          <div className="ap-rail">
                            <div className={`ap-dot ${dotClass}`} />
                          </div>
                          <div className="ap-card" data-type={activity.action}>
                            <div className="ap-card-head">
                              <div className="ap-user-row">
                                <div className="ap-avatar">
                                  {user.profile_picture ? (
                                    <img src={user.profile_picture} alt="" />
                                  ) : (
                                    buildInitials(user)
                                  )}
                                </div>
                                <div className="ap-user-info">
                                  <div className="ap-user-name">{user.name || user.email || "Unknown user"}</div>
                                  <span className="ap-role-tag">{formatRole(user.role)}</span>
                                </div>
                              </div>
                              <div className="ap-card-meta">
                                <span className={`ap-action-badge ${badgeClass}`}>
                                  {meta.icon}
                                  {meta.label}
                                </span>
                                <time className="ap-time">
                                  <Clock size={11} />
                                  {formatRelativeTime(activity.created_at)}
                                </time>
                              </div>
                            </div>
                            <p className="ap-message">{buildText(activity)}</p>
                            {(projectName || taskTitle || subtaskTitle) && (
                              <div className="ap-context">
                                {projectName && (
                                  <span className="ap-ctx-pill ap-ctx-pill--project">
                                    <FolderOpen size={10} /> {projectName}
                                  </span>
                                )}
                                {taskTitle && (
                                  <span className="ap-ctx-pill ap-ctx-pill--task">
                                    <ListTodo size={10} /> {taskTitle}
                                  </span>
                                )}
                                {subtaskTitle && (
                                  <span className="ap-ctx-pill ap-ctx-pill--subtask">
                                    <Layers size={10} /> {subtaskTitle}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Sidebar ────────────────────────────────────────────── */}
        <div className="ap-sidebar">

          {/* Overview */}
          <div className="ap-sidebar-card">
            <div className="ap-sidebar-header">
              <div>
                <h3 className="ap-sidebar-title">Overview</h3>
                <p className="ap-sidebar-sub">Workspace snapshot</p>
              </div>
              <TrendingUp size={16} color="var(--brand)" />
            </div>
            <div className="ap-info-list">
              <div className="ap-info-row">
                <span className="ap-info-key">Total Events</span>
                <span className="ap-info-val ap-info-val--brand">{loading ? "—" : activities.length}</span>
              </div>
              <div className="ap-info-row">
                <span className="ap-info-key">Today's Activity</span>
                <span className="ap-info-val ap-info-val--green">{loading ? "—" : todayCount}</span>
              </div>
              <div className="ap-info-row">
                <span className="ap-info-key">Filtered Events</span>
                <span className="ap-info-val">{loading ? "—" : filtered.length}</span>
              </div>
              <div className="ap-info-row">
                <span className="ap-info-key">Last Update</span>
                <span className="ap-info-val">{loading ? "—" : latestTime}</span>
              </div>
              <div className="ap-info-row">
                <span className="ap-info-key">Active Filter</span>
                <span className="ap-info-val" style={{ textTransform: "capitalize" }}>
                  {activeFilter === "all" ? "All types" : activeFilter}
                </span>
              </div>
            </div>
          </div>

          {/* Activity type breakdown */}
          <div className="ap-sidebar-card">
            <div className="ap-sidebar-header">
              <div>
                <h3 className="ap-sidebar-title">Activity Breakdown</h3>
                <p className="ap-sidebar-sub">Events by type</p>
              </div>
              <Zap size={15} color="var(--brand)" />
            </div>
            {loading ? (
              <div className="ap-info-list">
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ height: 28, ...skeletonStyle }} />
                ))}
              </div>
            ) : (
              <TypeBreakdown activities={activities} />
            )}
          </div>

          {/* Active users */}
          <div className="ap-sidebar-card">
            <div className="ap-sidebar-header">
              <div>
                <h3 className="ap-sidebar-title">Most Active Users</h3>
                <p className="ap-sidebar-sub">By event count</p>
              </div>
              <Users size={15} color="var(--brand)" />
            </div>
            {loading ? (
              <div className="ap-users-list">
                {[0,1,2,3].map(i => (
                  <div key={i} style={{ display:"flex", gap:10, alignItems:"center" }}>
                    <div style={{ width:32, height:32, borderRadius:"50%", flexShrink:0, ...skeletonStyle }} />
                    <div style={{ flex:1 }}>
                      <div style={{ height:10, width:"60%", marginBottom:6, ...skeletonStyle }} />
                      <div style={{ height:9, width:"40%", ...skeletonStyle }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ActiveUsers activities={activities} />
            )}
          </div>

        </div>
      </div>
    </main>
  );
}
