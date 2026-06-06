import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  FolderOpen,
  CheckSquare,
  Users,
  UserCheck,
  Mail,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Zap,
  Target,
  Globe2,
  CalendarDays,
  PlaneTakeoff,
  Flag,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";
import { getHealthStyle } from "../projects/projectUtils";
import { getWorkloadStyle } from "../projects/workloadUtils";
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
import { useAuth } from "../../context/AuthContext";
import useNotifications from "../../context/useNotifications";
import { formatWebsite, getCompanyInitials, getCompanyName } from "../../utils/company";
import successIllustration from "../../assets/images/undraw_successful_rtc4.svg";
import teamworkIllustration from "../../assets/images/undraw_teamwork_zplp.svg";
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
  critical: "#A34A30",
  high:     "#C96442",
  medium:   "#5B8CB8",
  low:      "#9E9E9E",
};

const STATUS_STYLES = {
  backlog:     { label: "Backlog",     bg: "#F2F2F2", color: "#7A7A7A" },
  todo:        { label: "Backlog",     bg: "#F2F2F2", color: "#7A7A7A" },
  pending:     { label: "Pending",     bg: "#fbe1d1", color: "#B55636" },
  in_progress: { label: "In Progress", bg: "#d3e3fc", color: "#3D6E8E" },
  inprogress:  { label: "In Progress", bg: "#d3e3fc", color: "#3D6E8E" },
  review:      { label: "Review",      bg: "#E8E0F0", color: "#6B5D8A" },
  done:        { label: "Done",        bg: "#E8F5ED", color: "#2D7A47" },
  completed:   { label: "Done",        bg: "#E8F5ED", color: "#2D7A47" },
};

const ACTIVITY_COLORS = {
  task_created:    "#3D9A5F",
  subtask_created: "#5B8CB8",
  comment_added:   "#C96442",
  task_updated:    "#5B8CB8",
  subtask_updated: "#5B8CB8",
  default:         "#a3a6af",
};

const STATUS_DISTRIBUTION_CONFIG = [
  { key: "backlog",     name: "Backlog",     color: "#a3a6af" },
  { key: "in_progress", name: "In Progress", color: "#5B8CB8" },
  { key: "review",      name: "Review",      color: "#8B7BA8" },
  { key: "done",        name: "Done",        color: "#3D9A5F" },
];

/* 6 stat cards exactly */
const STAT_CARD_CONFIG = [
  { key: "total_projects",  label: "Total Projects",  trend: "Workspace projects",   up: true,  icon: FolderOpen,    from: "#17191c", to: "#4c4c4c", shadow: "rgba(23,25,28,0.18)" },
  { key: "total_tasks",     label: "Total Tasks",     trend: "All tracked tasks",    up: true,  icon: CheckSquare,   from: "#5B8CB8", to: "#7BA8CC", shadow: "rgba(91,140,184,0.22)" },
  { key: "pending_tasks",   label: "Pending",         trend: "Awaiting completion",  up: false, icon: Clock,         from: "#D4835E", to: "#E0A07A", shadow: "rgba(212,131,94,0.22)" },
  { key: "completed_tasks", label: "Completed",       trend: "Finished tasks",       up: true,  icon: CheckCircle2,  from: "#3D9A5F", to: "#5DB87A", shadow: "rgba(61,154,95,0.22)"  },
  { key: "overdue_tasks",   label: "Overdue",         trend: "Need attention",       up: false, icon: AlertTriangle, from: "#A34A30", to: "#C96442", shadow: "rgba(163,74,48,0.22)"  },
  { key: "team_members",    label: "Team Members",    trend: "Active members",       up: null,  icon: Users,         from: "#777b86", to: "#a3a6af", shadow: "rgba(92,92,92,0.16)"   },
];

const AVATAR_COLORS = ["#C96442","#5B8CB8","#3D9A5F","#8B7BA8","#5C5C5C","#A34A30","#4A7A9B","#D4835E"];

/* ─── HELPERS ─────────────────────────────────────────────────────────── */
const formatLabel    = (v) => !v ? "None" : String(v).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const formatDueDate  = (v) => { if (!v) return "No date"; const d = new Date(v); return isNaN(d) ? v : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); };
const formatDateRange = (s, e) => { const a = formatDueDate(s); const b = formatDueDate(e || s); return a === b ? a : `${a} – ${b}`; };
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
  const map  = { task_created:"created task", subtask_created:"created subtask", task_updated:"updated task", subtask_updated:"updated subtask", comment_added:"added a comment" };
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
const buildInitials  = (t) => { const src = getAssigneeName(t) || getProjectName(t) || t.title || "?"; return src.split(" ").filter(Boolean).slice(0,2).map(w => w.charAt(0).toUpperCase()).join(""); };

const mapRecentTask = (task, i) => {
  const pk = String(task.priority || "").toLowerCase();
  const sk = normalizeStatus(task.status);
  const ss = STATUS_STYLES[sk] || { label: formatLabel(task.status), bg: "#f1f5f9", color: "#64748b" };
  return { id: task.id || `${task.title}-${i}`, task: task.title || task.task || "Untitled", project: getProjectName(task), priority: formatLabel(task.priority), priorityColor: PRIORITY_COLORS[pk] || "#94a3b8", status: ss.label, statusBg: ss.bg, statusColor: ss.color, assignee: buildInitials(task), assigneeBg: AVATAR_COLORS[i % AVATAR_COLORS.length], due: formatDueDate(task.due_date || task.due) };
};

const mapActivity = (a, i) => ({ id: a.id || `${a.action}-${i}`, text: buildActivityText(a), time: formatRelativeTime(a.created_at), color: ACTIVITY_COLORS[a.action] || ACTIVITY_COLORS.default });
const normalizeChartPoint = (p, i) => ({ day: p.day || p.label || DEFAULT_CHART_DATA[i]?.day || "", tasks: Number(p.tasks ?? p.count ?? p.value ?? 0) });
const pluralize = (count, label) => `${count} ${label}${count === 1 ? "" : "s"}`;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

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

/* ─── WIDGET CARD ────────────────────────────────────────────────────── */
function DashboardWidget({ title, subtitle, icon: Icon, items, emptyText, to, loading, tone, count }) {
  return (
    <section className={`db-card db-calendar-widget db-calendar-widget--${tone}`}>
      <div className="db-card-header">
        <div>
          <h2 className="db-card-title">{title}</h2>
          <p className="db-card-sub">{subtitle}</p>
        </div>
        <div className="db-widget-icon"><Icon size={15} /></div>
      </div>

      {typeof count === "number" && (
        <div className="db-widget-count">
          <strong>{loading ? "..." : count}</strong>
          <span>{title}</span>
        </div>
      )}

      <div className="db-widget-list">
        {loading ? (
          [1,2,3].map(n => <div key={n} className="db-widget-skeleton" />)
        ) : items.length === 0 ? (
          <div className="db-widget-empty">{emptyText}</div>
        ) : (
          items.map(item => (
            <Link key={item.id} to={item.to || to} className="db-widget-item">
              <span className="db-widget-dot" />
              <span className="db-widget-copy">
                <strong>{item.title}</strong>
                <small>{item.meta}</small>
                {item.extra && <em>{item.extra}</em>}
              </span>
              <ArrowRight size={12} />
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { user }        = useAuth();
  const { unreadCount } = useNotifications();

  const [overview,          setOverview]          = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [activities,        setActivities]        = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try { const res = await api.get("/dashboard/overview/"); if (!ignore) setOverview(res.data); }
      catch (err) { console.error(err); }
      finally { if (!ignore) setLoading(false); }
    })();
    return () => { ignore = true; };
  }, []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try { const res = await api.get("/activities/"); if (!ignore) setActivities(Array.isArray(res.data) ? res.data : []); }
      catch (err) { console.error(err); }
      finally { if (!ignore) setActivitiesLoading(false); }
    })();
    return () => { ignore = true; };
  }, []);

  /* ── Derived data ── */
  const rawRecentTasks = useMemo(() => Array.isArray(overview?.recent_tasks) ? overview.recent_tasks : [], [overview]);

  const chartData = Array.isArray(overview?.weekly_task_activity)
    ? overview.weekly_task_activity.map(normalizeChartPoint)
    : DEFAULT_CHART_DATA;

  const recentTasks  = useMemo(() => rawRecentTasks.map(mapRecentTask), [rawRecentTasks]);
  const activityFeed = useMemo(() => activities.slice(0, 7).map(mapActivity), [activities]);

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

  const teamWorkloadMembers = useMemo(() => {
    if (Array.isArray(overview?.team_workload_members)) return overview.team_workload_members;
    if (Array.isArray(overview?.team_workload) && overview.team_workload[0]?.workload_status) return overview.team_workload;
    if (overview?.my_workload) return [overview.my_workload];
    return [];
  }, [overview]);

  const teamWorkload = useMemo(() => {
    if (teamWorkloadMembers.length) return teamWorkloadMembers.map((item, i) => ({ name: item.name || "Member", tasks: Number(item.active_tasks ?? item.tasks ?? 0), color: AVATAR_COLORS[i % AVATAR_COLORS.length] }));
    if (Array.isArray(overview?.team_workload)) return overview.team_workload.map((item, i) => ({ name: item.name || "Unassigned", tasks: Number(item.tasks ?? item.count ?? 0), color: AVATAR_COLORS[i % AVATAR_COLORS.length] }));
    const acc = {};
    rawRecentTasks.forEach(t => { const n = getAssigneeName(t); acc[n] = (acc[n] || 0) + 1; });
    return Object.entries(acc).map(([name, tasks], i) => ({ name, tasks, color: AVATAR_COLORS[i % AVATAR_COLORS.length] }));
  }, [overview, rawRecentTasks, teamWorkloadMembers]);

  const projectSummaries = useMemo(() => Array.isArray(overview?.project_summaries) ? overview.project_summaries : [], [overview]);

  const projectProgress = useMemo(() => {
    if (projectSummaries.length) return projectSummaries.map((p, i) => ({ id: p.id, name: p.name, pct: p.milestone_progress ?? 0, health: p.health_label, lead: p.project_lead?.name, color: AVATAR_COLORS[i % AVATAR_COLORS.length] }));
    const projects = {};
    rawRecentTasks.forEach(t => {
      const name = getProjectName(t);
      if (!projects[name]) projects[name] = { total: 0, done: 0 };
      projects[name].total++;
      if (normalizeStatus(t.status) === "done") projects[name].done++;
    });
    return Object.entries(projects).map(([name, d], i) => ({ name, pct: d.total > 0 ? Math.round((d.done / d.total) * 100) : 0, color: AVATAR_COLORS[i % AVATAR_COLORS.length] }));
  }, [projectSummaries, rawRecentTasks]);

  const canViewProjectWidgets = user?.role === "admin" || user?.role === "manager";
  const canReviewLeave        = ["admin","manager"].includes(user?.role);

  const completionPct = useMemo(() => {
    const total = overview?.total_tasks || 0;
    const done  = overview?.completed_tasks || 0;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [overview]);

  const openTasks = Math.max(0, Number(overview?.total_tasks || 0) - Number(overview?.completed_tasks || 0));

  const firstName = user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const company   = overview?.company || user?.company_information;

  /* ── Focus items ── */
  const focusItems = useMemo(() => [
    { label: "Overdue work",   value: overview?.overdue_tasks ?? 0, copy: "Tasks needing a check-in",        tone: "danger",  to: "/dashboard/tasks" },
    { label: "Pending queue",  value: overview?.pending_tasks ?? 0, copy: "Planned work waiting to move",    tone: "warning", to: "/dashboard/tasks" },
    { label: "Open workload",  value: openTasks,                    copy: "Tasks not yet completed",          tone: "brand",   to: "/dashboard/tasks" },
  ], [openTasks, overview]);

  const quickActions = useMemo(() => [
    { label: "Create project",  copy: "Start a new workspace initiative",   to: "/dashboard/projects" },
    user?.role === "admin" ? { label: "Invite member", copy: "Add teammates to the organization", to: "/dashboard/team" } : null,
    { label: "Review issues",   copy: "Triage reported blockers",           to: "/dashboard/issues" },
  ].filter(Boolean), [user?.role]);

  /* ── Project widgets ── */
  const projectWidgets = useMemo(() => {
    if (!canViewProjectWidgets) return [];
    return [
      { title: "Projects At Risk",      subtitle: "Needs immediate attention",   icon: AlertTriangle, tone: "red",    to: "/dashboard/projects", emptyText: "No projects at risk.",    items: (overview?.projects_at_risk       || []).map(p => ({ id: p.id, title: p.name, meta: p.health_label || "At Risk",   extra: p.project_lead?.name ? `Lead: ${p.project_lead.name}` : "No lead", to: `/dashboard/projects/${p.id}` })) },
      { title: "Upcoming Milestones",   subtitle: "Next project milestones",     icon: Target,        tone: "purple", to: "/dashboard/projects", emptyText: "No upcoming milestones.", items: (overview?.upcoming_milestones    || []).map(m => ({ id: m.id, title: m.title, meta: formatDueDate(m.target_date), extra: m.project_name, to: `/dashboard/projects/${m.project_id}` })) },
      { title: "Completed Milestones",  subtitle: "Recently finished milestones",icon: CheckCircle2,  tone: "green",  to: "/dashboard/projects", emptyText: "No completed milestones.", items: (overview?.completed_milestones  || []).map(m => ({ id: m.id, title: m.title, meta: formatDueDate(m.target_date), extra: m.project_name, to: `/dashboard/projects/${m.project_id}` })) },
    ];
  }, [canViewProjectWidgets, overview]);

  /* ── Calendar widgets ── */
  const upcomingHolidays       = useMemo(() => Array.isArray(overview?.upcoming_holidays)       ? overview.upcoming_holidays       : [], [overview]);
  const upcomingCompanyEvents  = useMemo(() => Array.isArray(overview?.upcoming_company_events) ? overview.upcoming_company_events : [], [overview]);
  const peopleOnLeave          = useMemo(() => Array.isArray(overview?.people_currently_on_leave) ? overview.people_currently_on_leave : [], [overview]);
  const upcomingDeadlines      = useMemo(() => Array.isArray(overview?.upcoming_deadlines) ? [...overview.upcoming_deadlines].sort((a,b) => new Date(a.date)-new Date(b.date)).slice(0,5) : [], [overview]);

  return (
    <div className="db-page">
      <div className="db-content">

        {/* ══ HERO ══════════════════════════════════════════════════ */}
        <div className="db-hero">
          <div className="db-hero-left">
            <div className="db-hero-eyebrow">
              <span className="db-pulse" />
              All systems operational
            </div>

            <h1 className="db-hero-title">
              {getGreeting()}, {firstName}
            </h1>

            <p className="db-hero-sub">
              {overview?.overdue_tasks > 0
                ? `You have ${overview.overdue_tasks} overdue task${overview.overdue_tasks > 1 ? "s" : ""} that need attention.`
                : "Everything looks steady. Here is the latest workspace overview."}
            </p>

            {/* Company strip embedded in hero */}
            {(company || loading) && (
              <div className="db-hero-company">
                <div className="db-hero-company-logo">
                  {company?.logo
                    ? <img src={company.logo} alt="" />
                    : getCompanyInitials(company, "PF")}
                </div>
                <div className="db-hero-company-info">
                  <div className="db-hero-company-name">{loading ? "Loading..." : getCompanyName(company, "Company")}</div>
                  <div className="db-hero-company-meta">{company?.industry || "Industry not set"} · {loading ? "..." : `${company?.employee_count ?? 0} employees`}</div>
                </div>
                {company?.website && (
                  <>
                    <div className="db-hero-company-divider" />
                    <a href={company.website} target="_blank" rel="noreferrer" className="db-hero-company-link">
                      <Globe2 size={12} />
                      {formatWebsite(company.website)}
                    </a>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="db-hero-right-illustration">
            <img src={successIllustration} alt="Success" className="db-hero-illustration" />
          </div>
        </div>

        {/* ══ STAT CARDS — 6 ════════════════════════════════════════ */}
        <div className="db-stat-grid" aria-busy={loading}>
          {STAT_CARD_CONFIG.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="db-stat-card">
                <div className="db-stat-icon" style={{ background: `linear-gradient(135deg, ${card.from}, ${card.to})`, boxShadow: `0 6px 16px ${card.shadow}` }}>
                  <Icon size={18} color="#fff" />
                </div>
                <div>
                  <div className="db-stat-value">{loading ? "–" : (overview?.[card.key] ?? 0)}</div>
                  <div className="db-stat-label">{card.label}</div>
                </div>
                <div className={`db-stat-trend ${card.up === false ? "down" : card.up === null ? "neutral" : "up"}`}>
                  {card.up === true  && <TrendingUp  size={11} />}
                  {card.up === false && <TrendingDown size={11} />}
                  {card.up === null  && <span style={{ fontSize: 10 }}>→</span>}
                  {card.trend}
                </div>
              </div>
            );
          })}
        </div>

        {/* ══ COMMAND GRID ══════════════════════════════════════════ */}
        <div className="db-command-grid">
          {/* Focus */}
          <section className="db-card">
            <div className="db-card-header">
              <div><h2 className="db-card-title">Today's Focus</h2><p className="db-card-sub">Highest signal items right now</p></div>
              <Target size={15} className="db-card-icon-accent" />
            </div>
            <div className="db-focus-list">
              {focusItems.map(item => (
                <Link key={item.label} to={item.to} className={`db-focus-item db-focus-item--${item.tone}`}>
                  <span className="db-focus-value">{loading ? "..." : item.value}</span>
                  <span className="db-focus-copy"><strong>{item.label}</strong><small>{item.copy}</small></span>
                  <ArrowRight size={13} />
                </Link>
              ))}
            </div>
          </section>

          {/* Team Pulse */}
          <section className="db-card db-pulse-card">
            <div className="db-card-header">
              <div><h2 className="db-card-title">Team Pulse</h2><p className="db-card-sub">Capacity and completion</p></div>
              <Sparkles size={14} className="db-card-icon-accent" />
            </div>
            <div className="db-pulse-body-layout">
              <div className="db-pulse-stack">
                <div className="db-pulse-row">
                  <span>Completion rate</span>
                  <strong>{loading ? "..." : `${completionPct}%`}</strong>
                </div>
                <div className="db-pulse-meter"><span style={{ width: `${completionPct}%` }} /></div>
                <div className="db-pulse-meta">
                  <span>{pluralize(overview?.completed_tasks ?? 0, "task")} completed</span>
                  <span>{pluralize(openTasks, "task")} open</span>
                </div>
                <div className="db-pulse-foot">
                  <Users size={13} />
                  {loading ? "Loading..." : `${overview?.team_members ?? 0} active team members`}
                </div>
              </div>
              <div className="db-pulse-illustration-wrap">
                <img src={teamworkIllustration} alt="Teamwork" className="db-pulse-illustration" />
              </div>
            </div>
          </section>

          {/* Quick Actions */}
          <section className="db-card">
            <div className="db-card-header">
              <div><h2 className="db-card-title">Quick Actions</h2><p className="db-card-sub">Common workflows</p></div>
              <Zap size={14} className="db-card-icon-accent" />
            </div>
            <div className="db-action-list">
              {quickActions.map(action => (
                <Link key={action.label} to={action.to} className="db-action-item">
                  <span><strong>{action.label}</strong><small>{action.copy}</small></span>
                  <ArrowRight size={13} />
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* ══ CHART ANALYTICS ROW ═══════════════════════════════════ */}
        <div className="db-analytics-row">
          {/* Area chart */}
          <div className="db-card db-activity-chart">
            <div className="db-card-header">
              <div><h2 className="db-card-title">Task Activity</h2><p className="db-card-sub">Tasks completed this week</p></div>
              <span className="db-live-badge">
                <span className="db-pulse db-pulse--green" style={{ width:6, height:6, borderRadius:"50%", background:"#3D9A5F", flexShrink:0 }} />
                Live
              </span>
            </div>
            <div className="db-chart-wrapper">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData} margin={{ top:8, right:0, left:-20, bottom:0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#17191c" stopOpacity={0.14} />
                      <stop offset="95%" stopColor="#17191c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,25,28,0.05)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize:11, fill:"#a3a6af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:11, fill:"#a3a6af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<GlassTooltip />} />
                  <Area type="monotone" dataKey="tasks" name="Tasks" stroke="#17191c" strokeWidth={2} fill="url(#areaGrad)" dot={{ r:3, fill:"#17191c", strokeWidth:0 }} activeDot={{ r:5, fill:"#17191c", stroke:"#fff", strokeWidth:2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="db-card db-donut-chart">
            <div className="db-card-header">
              <div><h2 className="db-card-title">Task Distribution</h2><p className="db-card-sub">By current status</p></div>
            </div>
            <div className="db-donut-body">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={32} outerRadius={52} dataKey="value" strokeWidth={3} stroke="#f7f7f8">
                    {statusDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<GlassTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="db-donut-legend">
                {statusDistribution.map(s => (
                  <div key={s.name} className="db-legend-row">
                    <span className="db-legend-dot" style={{ background: s.color }} />
                    <span className="db-legend-name">{s.name}</span>
                    <span className="db-legend-val">{loading ? "–" : s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ══ CONSOLIDATED WIDGETS ROW ══════════════════════════════ */}
        <div className="db-widget-columns-row">
          {/* Column 1: Schedule & Deadlines */}
          <div className="db-card db-column-widget-card">
            <div className="db-card-header">
              <div>
                <h2 className="db-card-title">Schedule & Deadlines</h2>
                <p className="db-card-sub">Holidays, events & task deadlines</p>
              </div>
              <CalendarDays size={15} className="db-card-icon-accent" />
            </div>
            <div className="db-column-widget-content">
              {/* Holidays */}
              <div className="db-widget-section">
                <h3 className="db-widget-section-title">Holidays</h3>
                {loading ? (
                  <div className="db-widget-skeleton" />
                ) : upcomingHolidays.length === 0 ? (
                  <div className="db-widget-empty-text">No upcoming holidays</div>
                ) : (
                  upcomingHolidays.slice(0, 2).map(e => (
                    <div key={`h-${e.id}`} className="db-widget-section-item">
                      <span className="db-widget-section-dot blue" />
                      <span className="db-widget-section-copy">
                        <strong>{e.title}</strong>
                        <small>{formatDateRange(e.start_date, e.end_date)}</small>
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Company Events */}
              <div className="db-widget-section">
                <h3 className="db-widget-section-title">Events</h3>
                {loading ? (
                  <div className="db-widget-skeleton" />
                ) : upcomingCompanyEvents.length === 0 ? (
                  <div className="db-widget-empty-text">No upcoming events</div>
                ) : (
                  upcomingCompanyEvents.slice(0, 2).map(e => (
                    <div key={`ce-${e.id}`} className="db-widget-section-item">
                      <span className="db-widget-section-dot purple" />
                      <span className="db-widget-section-copy">
                        <strong>{e.title}</strong>
                        <small>{formatDateRange(e.start_date, e.end_date)}</small>
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Task Deadlines */}
              <div className="db-widget-section">
                <h3 className="db-widget-section-title">Task Deadlines</h3>
                {loading ? (
                  <div className="db-widget-skeleton" />
                ) : upcomingDeadlines.length === 0 ? (
                  <div className="db-widget-empty-text">No task deadlines</div>
                ) : (
                  upcomingDeadlines.slice(0, 3).map(d => (
                    <Link key={`d-${d.source}-${d.id}`} to={d.source === "task" ? "/dashboard/tasks" : "/dashboard/calendar"} className="db-widget-section-item link">
                      <span className="db-widget-section-dot orange" />
                      <span className="db-widget-section-copy">
                        <strong>{d.title}</strong>
                        <small>{formatDueDate(d.date)} · {d.project || formatLabel(d.source)}</small>
                      </span>
                      <ArrowRight size={11} />
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Column 2: Milestones & Risks */}
          <div className="db-card db-column-widget-card">
            <div className="db-card-header">
              <div>
                <h2 className="db-card-title">Milestones & Risks</h2>
                <p className="db-card-sub">Project warnings and achievements</p>
              </div>
              <Target size={15} className="db-card-icon-accent" />
            </div>
            <div className="db-column-widget-content">
              {/* Risks */}
              <div className="db-widget-section">
                <h3 className="db-widget-section-title">Projects at Risk</h3>
                {loading ? (
                  <div className="db-widget-skeleton" />
                ) : (!overview?.projects_at_risk || overview.projects_at_risk.length === 0) ? (
                  <div className="db-widget-empty-text text-green">All projects healthy</div>
                ) : (
                  overview.projects_at_risk.slice(0, 3).map(p => {
                    const hs = getHealthStyle(p.health_label);
                    return (
                      <Link key={`risk-${p.id}`} to={`/dashboard/projects/${p.id}`} className="db-widget-section-item link">
                        <span className="db-widget-section-dot red" />
                        <span className="db-widget-section-copy">
                          <strong>{p.name}</strong>
                          <small style={{ color: hs.color }}>{p.health_label || "At Risk"}</small>
                        </span>
                        <ArrowRight size={11} />
                      </Link>
                    );
                  })
                )}
              </div>

              {/* Upcoming Milestones */}
              <div className="db-widget-section">
                <h3 className="db-widget-section-title">Upcoming Milestones</h3>
                {loading ? (
                  <div className="db-widget-skeleton" />
                ) : (!overview?.upcoming_milestones || overview.upcoming_milestones.length === 0) ? (
                  <div className="db-widget-empty-text">No upcoming milestones</div>
                ) : (
                  overview.upcoming_milestones.slice(0, 3).map(m => (
                    <Link key={`um-${m.id}`} to={`/dashboard/projects/${m.project_id}`} className="db-widget-section-item link">
                      <span className="db-widget-section-dot purple" />
                      <span className="db-widget-section-copy">
                        <strong>{m.title}</strong>
                        <small>{formatDueDate(m.target_date)} · {m.project_name}</small>
                      </span>
                      <ArrowRight size={11} />
                    </Link>
                  ))
                )}
              </div>

              {/* Completed Milestones */}
              <div className="db-widget-section">
                <h3 className="db-widget-section-title">Completed Milestones</h3>
                {loading ? (
                  <div className="db-widget-skeleton" />
                ) : (!overview?.completed_milestones || overview.completed_milestones.length === 0) ? (
                  <div className="db-widget-empty-text">No milestones completed recently</div>
                ) : (
                  overview.completed_milestones.slice(0, 2).map(m => (
                    <Link key={`cm-${m.id}`} to={`/dashboard/projects/${m.project_id}`} className="db-widget-section-item link">
                      <span className="db-widget-section-dot green" />
                      <span className="db-widget-section-copy">
                        <strong>{m.title}</strong>
                        <small>{formatDueDate(m.target_date)} · {m.project_name}</small>
                      </span>
                      <ArrowRight size={11} />
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Column 3: Absence & Approvals */}
          <div className="db-card db-column-widget-card">
            <div className="db-card-header">
              <div>
                <h2 className="db-card-title">Absence & Approvals</h2>
                <p className="db-card-sub">Leave tracking and approval queue</p>
              </div>
              <PlaneTakeoff size={15} className="db-card-icon-accent" />
            </div>
            <div className="db-column-widget-content">
              {/* Approvals */}
              {canReviewLeave && (
                <div className="db-widget-section">
                  <h3 className="db-widget-section-title">Approvals Queue</h3>
                  {loading ? (
                    <div className="db-widget-skeleton" />
                  ) : (
                    <Link to="/dashboard/leave" className="db-leave-approvals-banner">
                      <div className="db-leave-banner-number">
                        {overview?.pending_leave_requests ?? 0}
                      </div>
                      <div className="db-leave-banner-text">
                        <strong>Pending Leave Requests</strong>
                        <small>Review leave approval requests</small>
                      </div>
                      <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              )}

              {/* People on Leave Today */}
              <div className="db-widget-section">
                <h3 className="db-widget-section-title">Out of Office Today</h3>
                {loading ? (
                  <div className="db-widget-skeleton" />
                ) : peopleOnLeave.length === 0 ? (
                  <div className="db-widget-empty-text">Everyone is present today</div>
                ) : (
                  peopleOnLeave.slice(0, 4).map(l => (
                    <div key={`leave-${l.id}`} className="db-widget-section-item">
                      <span className="db-widget-section-dot green" />
                      <span className="db-widget-section-copy">
                        <strong>{l.employee?.name || l.employee?.email || "Team member"}</strong>
                        <small>{l.leave_type_label || "Approved leave"} · {formatDateRange(l.start_date, l.end_date)}</small>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ══ TEAM WORKLOAD TABLE & CHART ROW ════════════════════════ */}
        <div className="db-workload-row">
          <section className="db-card db-workload-table-card">
            <div className="db-card-header">
              <div>
                <h2 className="db-card-title">Team Workload</h2>
                <p className="db-card-sub">{user?.role === "employee" ? "Your current assignment load" : "Assignment distribution across the organization"}</p>
              </div>
              <Users size={15} className="db-card-icon-accent" />
            </div>
            <div className="db-workload-table-wrap">
              <table className="db-workload-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Assigned</th>
                    <th>Completed</th>
                    <th>Overdue</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [1,2,3].map(i => <tr key={i}><td colSpan={5}><div className="db-table-skeleton" /></td></tr>)
                  ) : teamWorkloadMembers.length === 0 ? (
                    <tr><td colSpan={5} className="db-table-empty">No workload data available</td></tr>
                  ) : (
                    teamWorkloadMembers.map(member => {
                      const ws = getWorkloadStyle(member.workload_status);
                      return (
                        <tr key={member.id || member.name}>
                          <td className="db-workload-name">{member.name}</td>
                          <td>{member.active_tasks ?? member.assigned_tasks ?? 0}</td>
                          <td>{member.completed_tasks ?? 0}</td>
                          <td>{member.overdue_tasks ?? 0}</td>
                          <td><span className="db-workload-status" style={{ background: ws.bg, color: ws.color }}>{member.workload_label || "Balanced"}</span></td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="db-card db-workload-chart-card">
            <div className="db-card-header">
              <div><h2 className="db-card-title">Workload Chart</h2><p className="db-card-sub">Assignments per member</p></div>
              <Sparkles size={14} className="db-card-icon-accent" />
            </div>
            <div className="db-workload-chart-wrap">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={teamWorkload} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(23,25,28,0.05)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize:10, fill:"#a3a6af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:10, fill:"#a3a6af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<GlassTooltip />} />
                  <Bar dataKey="tasks" name="Active" radius={[5,5,0,0]} barSize={22}>
                    {teamWorkload.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* ══ BOTTOM ROW: Recent Tasks + Project Progress & Activity ══ */}
        <div className="db-bottom-layout">
          {/* Recent Tasks Table */}
          <div className="db-card db-recent-tasks-card">
            <div className="db-card-header">
              <div><h2 className="db-card-title">Recent Tasks</h2><p className="db-card-sub">Latest activity across all projects</p></div>
              <Link to="/dashboard/tasks" className="db-link-btn">View all <ArrowRight size={11} /></Link>
            </div>
            <div className="db-table-wrap">
              <table className="db-table">
                <thead>
                  <tr><th>Task</th><th>Project</th><th>Priority</th><th>Status</th><th>Assignee</th><th>Due</th></tr>
                </thead>
                <tbody>
                  {loading ? (
                    [1,2,3].map(i => <tr key={i}><td colSpan={6}><div className="db-table-skeleton" /></td></tr>)
                  ) : recentTasks.length === 0 ? (
                    <tr><td colSpan={6} className="db-table-empty">No recent tasks found</td></tr>
                  ) : (
                    recentTasks.slice(0, 6).map(row => (
                      <tr key={row.id}>
                        <td className="db-task-name">{row.task}</td>
                        <td className="db-task-project">{row.project}</td>
                        <td><span className="db-priority-tag" style={{ color: row.priorityColor, background: `${row.priorityColor}14`, borderColor: `${row.priorityColor}30` }}><span className="db-priority-dot" style={{ background: row.priorityColor }} />{row.priority}</span></td>
                        <td><span className="db-status-tag" style={{ background: row.statusBg, color: row.statusColor }}>{row.status}</span></td>
                        <td><div className="db-assignee-chip" style={{ background: row.assigneeBg }}>{row.assignee}</div></td>
                        <td className="db-due-date">{row.due}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right side stack: Project Progress and Activity Feed */}
          <div className="db-bottom-sidebar-stack">
            {/* Project Progress */}
            <div className="db-card db-project-progress-card">
              <div className="db-card-header">
                <div><h2 className="db-card-title">Project Progress</h2><p className="db-card-sub">Milestone completion</p></div>
                <Target size={14} className="db-card-icon-accent" />
              </div>
              <div className="db-progress-list">
                {projectProgress.length === 0 ? (
                  <div className="db-feed-empty"><p>No project data yet</p></div>
                ) : (
                  projectProgress.slice(0, 3).map(p => {
                    const hs = getHealthStyle(p.health);
                    const row = (
                      <div className="db-progress-item">
                        <div className="db-progress-meta">
                          <span className="db-progress-name">
                            {p.name}
                            {p.health && <em className="db-progress-health" style={{ color: hs.color, background: hs.bg }}>{p.health}</em>}
                          </span>
                          <span className="db-progress-pct" style={{ color: p.color }}>{p.pct}%</span>
                        </div>
                        {p.lead && <small className="db-progress-lead">Lead: {p.lead}</small>}
                        <div className="db-progress-track">
                          <div className="db-progress-fill" style={{ width: `${p.pct}%`, background: `linear-gradient(90deg, ${p.color}, ${p.color}cc)` }} />
                        </div>
                      </div>
                    );
                    return p.id ? <Link key={p.id} to={`/dashboard/projects/${p.id}`} className="db-progress-link">{row}</Link> : <div key={p.name}>{row}</div>;
                  })
                )}
              </div>
            </div>

            {/* Activity feed */}
            <div className="db-card db-activity-feed-card">
              <div className="db-card-header">
                <div><h2 className="db-card-title">Activity Feed</h2><p className="db-card-sub">Recent workspace updates</p></div>
                <Link to="/dashboard/activity" className="db-link-btn">View all <ArrowRight size={11} /></Link>
              </div>
              <div className="db-feed-list">
                {activitiesLoading ? (
                  [1,2,3].map(i => <div key={i} className="db-feed-skeleton" />)
                ) : activityFeed.length === 0 ? (
                  <div className="db-feed-empty"><Zap size={20} /><p>No recent activity</p></div>
                ) : (
                  activityFeed.slice(0, 4).map(item => (
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
        </div>

      </div>
    </div>
  );
}