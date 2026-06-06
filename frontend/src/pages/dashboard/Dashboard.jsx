import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Search,
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
  pending:     { label: "Pending",     bg: "#F5E6DA", color: "#B55636" },
  in_progress: { label: "In Progress", bg: "#D6E4F0", color: "#3D6E8E" },
  inprogress:  { label: "In Progress", bg: "#D6E4F0", color: "#3D6E8E" },
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
  default:         "#9E9E9E",
};

const STATUS_DISTRIBUTION_CONFIG = [
  { key: "backlog",     name: "Backlog",     color: "#C4C4C4" },
  { key: "in_progress", name: "In Progress", color: "#5B8CB8" },
  { key: "review",      name: "Review",      color: "#8B7BA8" },
  { key: "done",        name: "Done",        color: "#3D9A5F" },
];

const CARD_GRADIENTS = [
  { from: "#C96442", to: "#D4835E", icon: FolderOpen,    shadow: "rgba(201,100,66,0.22)" },
  { from: "#5B8CB8", to: "#7BA8CC", icon: CheckSquare,   shadow: "rgba(91,140,184,0.22)" },
  { from: "#D4835E", to: "#E0A07A", icon: Clock,         shadow: "rgba(212,131,94,0.22)"  },
  { from: "#3D9A5F", to: "#5DB87A", icon: CheckSquare,   shadow: "rgba(61,154,95,0.22)"   },
  { from: "#5C5C5C", to: "#7A7A7A", icon: Users,         shadow: "rgba(92,92,92,0.18)"   },
  { from: "#A34A30", to: "#C96442", icon: AlertTriangle, shadow: "rgba(163,74,48,0.22)"   },
  { from: "#4A7A9B", to: "#6BA3B8", icon: ShieldCheck,   shadow: "rgba(74,122,155,0.22)"  },
  { from: "#3D9A5F", to: "#5DB87A", icon: UserCheck,     shadow: "rgba(61,154,95,0.22)"  },
  { from: "#8B7BA8", to: "#A898C4", icon: Mail,          shadow: "rgba(139,123,168,0.22)"  },
];

/* ─── HELPERS ─────────────────────────────────────────────────────────── */
const formatLabel  = (v) => !v ? "None" : String(v).replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const formatDueDate = (v) => { if (!v) return "No date"; const d = new Date(v); return isNaN(d) ? v : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); };
const formatDashboardDateRange = (startValue, endValue) => {
  const start = formatDueDate(startValue);
  const end = formatDueDate(endValue || startValue);
  return start === end ? start : `${start} - ${end}`;
};
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

const AVATAR_COLORS = ["#C96442", "#5B8CB8", "#3D9A5F", "#8B7BA8", "#5C5C5C", "#A34A30", "#4A7A9B", "#D4835E"];

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

function CompanyCard({ company, loading }) {
  const companyName = getCompanyName(company, "Company profile");

  return (
    <section className="db-company-card">
      <div className="db-company-main">
        <div className="db-company-logo">
          {company?.logo ? (
            <img src={company.logo} alt="" />
          ) : (
            getCompanyInitials(company, "PF")
          )}
        </div>
        <div className="db-company-copy">
          <span className="db-company-kicker">Company</span>
          <h2>{loading ? "Loading company..." : companyName}</h2>
          <p>{company?.industry || "Industry not set"}</p>
        </div>
      </div>

      <div className="db-company-meta">
        <a
          href={company?.website || undefined}
          target="_blank"
          rel="noreferrer"
          className={!company?.website ? "is-disabled" : ""}
        >
          <Globe2 size={15} />
          {formatWebsite(company?.website)}
        </a>
        <span>
          <Users size={15} />
          {loading ? "..." : `${company?.employee_count ?? 0} employees`}
        </span>
        <span>
          <ShieldCheck size={15} />
          {loading ? "..." : `${company?.manager_count ?? 0} managers`}
        </span>
      </div>
    </section>
  );
}

function DashboardWidget({ title, subtitle, icon: Icon, items, emptyText, to, loading, tone, count }) {
  return (
    <section className={`db-card db-calendar-widget db-calendar-widget--${tone}`}>
      <div className="db-card-header">
        <div>
          <h2 className="db-card-title">{title}</h2>
          <p className="db-card-sub">{subtitle}</p>
        </div>
        <div className="db-widget-icon">
          <Icon size={16} />
        </div>
      </div>

      {typeof count === "number" && (
        <div className="db-widget-count">
          <strong>{loading ? "..." : count}</strong>
          <span>{title}</span>
        </div>
      )}

      <div className="db-widget-list">
        {loading ? (
          [1, 2, 3].map((item) => <div key={item} className="db-widget-skeleton" />)
        ) : items.length === 0 ? (
          <div className="db-widget-empty">{emptyText}</div>
        ) : (
          items.map((item) => (
            <Link key={item.id} to={item.to || to} className="db-widget-item">
              <span className="db-widget-dot" />
              <span className="db-widget-copy">
                <strong>{item.title}</strong>
                <small>{item.meta}</small>
                {item.extra && <em>{item.extra}</em>}
              </span>
              <ArrowRight size={13} />
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

/* ─── GREETING ────────────────────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const pluralize = (count, label) => `${count} ${label}${count === 1 ? "" : "s"}`;

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
      } catch (err) {
        console.error(err);
      }
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
      } catch (err) {
        console.error(err);
      }
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

  const teamWorkloadMembers = useMemo(() => {
    if (Array.isArray(overview?.team_workload_members)) {
      return overview.team_workload_members;
    }
    if (Array.isArray(overview?.team_workload) && overview.team_workload[0]?.workload_status) {
      return overview.team_workload;
    }
    if (overview?.my_workload) {
      return [overview.my_workload];
    }
    return [];
  }, [overview]);

  const teamWorkload = useMemo(() => {
    if (teamWorkloadMembers.length) {
      return teamWorkloadMembers.map((item, i) => ({
        name: item.name || "Member",
        tasks: Number(item.active_tasks ?? item.tasks ?? 0),
        color: AVATAR_COLORS[i % AVATAR_COLORS.length],
      }));
    }
    if (Array.isArray(overview?.team_workload)) {
      return overview.team_workload.map((item, i) => ({
        name: item.name || "Unassigned",
        tasks: Number(item.tasks ?? item.count ?? 0),
        color: AVATAR_COLORS[i % AVATAR_COLORS.length],
      }));
    }
    const acc = {};
    rawRecentTasks.forEach(t => { const n = getAssigneeName(t); acc[n] = (acc[n] || 0) + 1; });
    return Object.entries(acc).map(([name, tasks], i) => ({ name, tasks, color: AVATAR_COLORS[i % AVATAR_COLORS.length] }));
  }, [overview, rawRecentTasks, teamWorkloadMembers]);

  const projectSummaries = useMemo(
    () => (Array.isArray(overview?.project_summaries) ? overview.project_summaries : []),
    [overview]
  );

  const projectProgress = useMemo(() => {
    if (projectSummaries.length) {
      return projectSummaries.map((p, i) => ({
        id: p.id,
        name: p.name,
        pct: p.milestone_progress ?? 0,
        health: p.health_label,
        lead: p.project_lead?.name,
        color: AVATAR_COLORS[i % AVATAR_COLORS.length],
      }));
    }
    const projects = {};
    rawRecentTasks.forEach(t => {
      const name = getProjectName(t);
      if (!projects[name]) projects[name] = { total: 0, done: 0 };
      projects[name].total++;
      if (normalizeStatus(t.status) === "done") projects[name].done++;
    });
    return Object.entries(projects).map(([name, d], i) => ({
      name,
      pct: d.total > 0 ? Math.round((d.done / d.total) * 100) : 0,
      color: AVATAR_COLORS[i % AVATAR_COLORS.length],
    }));
  }, [projectSummaries, rawRecentTasks]);

  const canViewProjectWidgets = user?.role === "admin" || user?.role === "manager";

  const projectWidgets = useMemo(() => {
    if (!canViewProjectWidgets) return [];
    return [
      {
        title: "Projects At Risk",
        subtitle: "Needs immediate attention",
        icon: AlertTriangle,
        tone: "red",
        to: "/dashboard/projects",
        emptyText: "No projects at risk.",
        items: (overview?.projects_at_risk || []).map((p) => ({
          id: p.id,
          title: p.name,
          meta: p.health_label || "At Risk",
          extra: p.project_lead?.name ? `Lead: ${p.project_lead.name}` : "No lead assigned",
          to: `/dashboard/projects/${p.id}`,
        })),
      },
      {
        title: "Upcoming Milestones",
        subtitle: "Next project milestones",
        icon: Target,
        tone: "purple",
        to: "/dashboard/projects",
        emptyText: "No upcoming milestones.",
        items: (overview?.upcoming_milestones || []).map((m) => ({
          id: m.id,
          title: m.title,
          meta: formatDueDate(m.target_date),
          extra: m.project_name,
          to: `/dashboard/projects/${m.project_id}`,
        })),
      },
      {
        title: "Completed Milestones",
        subtitle: "Recently finished milestones",
        icon: CheckCircle2,
        tone: "green",
        to: "/dashboard/projects",
        emptyText: "No completed milestones yet.",
        items: (overview?.completed_milestones || []).map((m) => ({
          id: m.id,
          title: m.title,
          meta: formatDueDate(m.target_date),
          extra: m.project_name,
          to: `/dashboard/projects/${m.project_id}`,
        })),
      },
    ];
  }, [canViewProjectWidgets, overview]);

  const statCards = useMemo(() => [
    { value: overview?.total_projects  ?? 0, label: "Total Projects",  trend: "Workspace projects",   up: true,  ...CARD_GRADIENTS[0] },
    { value: overview?.total_tasks     ?? 0, label: "Total Tasks",      trend: "All tracked tasks",    up: true,  ...CARD_GRADIENTS[1] },
    { value: overview?.pending_tasks   ?? 0, label: "Pending",          trend: "Awaiting completion",  up: false, ...CARD_GRADIENTS[2] },
    { value: overview?.completed_tasks ?? 0, label: "Completed",        trend: "Finished tasks",       up: true,  ...CARD_GRADIENTS[3] },
    { value: overview?.team_members    ?? 0, label: "Total Members",    trend: "Active members",       up: null,  ...CARD_GRADIENTS[4] },
    { value: overview?.overdue_tasks   ?? 0, label: "Overdue",          trend: "Need attention",       up: false, ...CARD_GRADIENTS[5] },
    { value: overview?.managers        ?? 0, label: "Managers",         trend: "Team leads",           up: null,  ...CARD_GRADIENTS[6] },
    { value: overview?.employees       ?? 0, label: "Employees",        trend: "Contributors",         up: null,  ...CARD_GRADIENTS[7] },
    { value: overview?.pending_invitations ?? 0, label: "Pending Invitations", trend: "Awaiting signup", up: null, ...CARD_GRADIENTS[8] },
  ], [overview]);

  const firstName = user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "there";
  const completionPct = useMemo(() => {
    const total = overview?.total_tasks || 0;
    const done  = overview?.completed_tasks || 0;
    return total > 0 ? Math.round((done / total) * 100) : 0;
  }, [overview]);

  const openTasks = Math.max(
    0,
    Number(overview?.total_tasks || 0) - Number(overview?.completed_tasks || 0)
  );

  const focusItems = useMemo(() => [
    {
      label: "Overdue work",
      value: overview?.overdue_tasks ?? 0,
      copy: "Tasks that need a manager check-in",
      tone: "danger",
      to: "/dashboard/tasks",
    },
    {
      label: "Pending queue",
      value: overview?.pending_tasks ?? 0,
      copy: "Planned work still waiting to move",
      tone: "warning",
      to: "/dashboard/tasks",
    },
    {
      label: "Open workload",
      value: openTasks,
      copy: "Tasks not completed yet",
      tone: "brand",
      to: "/dashboard/tasks",
    },
  ], [openTasks, overview]);

  const quickActions = useMemo(() => [
    { label: "Create project", copy: "Start a new workspace initiative", to: "/dashboard/projects" },
    user?.role === "admin"
      ? { label: "Invite member", copy: "Add teammates to the organization", to: "/dashboard/team" }
      : null,
    { label: "Review issues", copy: "Triage reported blockers", to: "/dashboard/issues" },
  ].filter(Boolean), [user?.role]);

  const company = overview?.company || user?.company_information;
  const canReviewLeave = ["admin", "manager"].includes(user?.role);

  const upcomingHolidays = useMemo(() => (
    Array.isArray(overview?.upcoming_holidays) ? overview.upcoming_holidays : []
  ), [overview]);

  const upcomingCompanyEvents = useMemo(() => (
    Array.isArray(overview?.upcoming_company_events) ? overview.upcoming_company_events : []
  ), [overview]);

  const peopleOnLeave = useMemo(() => (
    Array.isArray(overview?.people_currently_on_leave) ? overview.people_currently_on_leave : []
  ), [overview]);

  const upcomingDeadlines = useMemo(() => (
    Array.isArray(overview?.upcoming_deadlines)
      ? [...overview.upcoming_deadlines].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5)
      : []
  ), [overview]);

  const calendarWidgets = useMemo(() => {
    const widgets = [
      {
        title: "Upcoming Holidays",
        subtitle: "Company holidays",
        icon: CalendarDays,
        tone: "blue",
        to: "/dashboard/calendar",
        emptyText: "No upcoming holidays.",
        items: upcomingHolidays.map((event) => ({
          id: `holiday-${event.id}`,
          title: event.title,
          meta: formatDashboardDateRange(event.start_date, event.end_date),
        })),
      },
      {
        title: "Upcoming Company Events",
        subtitle: "Shared organization events",
        icon: Sparkles,
        tone: "purple",
        to: "/dashboard/calendar",
        emptyText: "No upcoming company events.",
        items: upcomingCompanyEvents.map((event) => ({
          id: `event-${event.id}`,
          title: event.title,
          meta: formatDashboardDateRange(event.start_date, event.end_date),
        })),
      },
      {
        title: "People On Leave",
        subtitle: "Approved leave today",
        icon: PlaneTakeoff,
        tone: "green",
        to: "/dashboard/leave",
        emptyText: "Nobody is on leave today.",
        items: peopleOnLeave.map((leave) => ({
          id: `leave-${leave.id}`,
          title: leave.employee?.name || leave.employee?.email || "Team member",
          meta: leave.leave_type_label || "Approved leave",
          extra: formatDashboardDateRange(leave.start_date, leave.end_date),
        })),
      },
      {
        title: "Upcoming Deadlines",
        subtitle: "Tasks, deadlines, and milestones",
        icon: Flag,
        tone: "orange",
        to: "/dashboard/calendar",
        emptyText: "No upcoming deadlines.",
        items: upcomingDeadlines.map((item) => ({
          id: `deadline-${item.source}-${item.id}`,
          title: item.title,
          meta: formatDueDate(item.date),
          extra: item.project || formatLabel(item.source),
          to: item.source === "task" ? "/dashboard/tasks" : "/dashboard/calendar",
        })),
      },
    ];

    if (canReviewLeave) {
      widgets.push({
        title: "Pending Leave Requests",
        subtitle: "Awaiting review",
        icon: ClipboardList,
        tone: "red",
        to: "/dashboard/leave",
        count: overview?.pending_leave_requests ?? 0,
        emptyText: "No pending leave requests.",
        items: (overview?.pending_leave_requests ?? 0) > 0
          ? [{
              id: "pending-leave",
              title: pluralize(overview.pending_leave_requests, "request"),
              meta: "Review approval queue",
            }]
          : [],
      });
    }

    return widgets;
  }, [
    canReviewLeave,
    overview,
    peopleOnLeave,
    upcomingCompanyEvents,
    upcomingDeadlines,
    upcomingHolidays,
  ]);

  /* ── Render ── */
  return (
    <div className="db-page">

      {/* ══ TOPBAR ══════════════════════════════════════════════════ */}
      <header className="db-topbar">
        <div className="db-topbar-left">
          <div className="db-search-wrap">
            <Search size={14} className="db-search-icon" />
            <input className="db-search-input" placeholder="Search projects, tasks, people..." />
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
              {getGreeting()}, {firstName}
            </h1>
            <p className="db-hero-sub">
              {overview?.overdue_tasks > 0
                ? `You have ${overview.overdue_tasks} overdue task${overview.overdue_tasks > 1 ? "s" : ""} that need attention.`
                : "Everything looks steady. Here is the latest workspace overview."}
            </p>

            {/* Quick stats strip */}
            <div className="db-hero-strip">
              <div className="db-hero-strip-item">
                <span className="db-hero-strip-val">{loading ? "..." : (overview?.total_projects ?? 0)}</span>
                <span className="db-hero-strip-label">Projects</span>
              </div>
              <div className="db-hero-strip-div" />
              <div className="db-hero-strip-item">
                <span className="db-hero-strip-val">{loading ? "..." : (overview?.total_tasks ?? 0)}</span>
                <span className="db-hero-strip-label">Total Tasks</span>
              </div>
              <div className="db-hero-strip-div" />
              <div className="db-hero-strip-item">
                <span className="db-hero-strip-val">{loading ? "..." : `${completionPct}%`}</span>
                <span className="db-hero-strip-label">Completion</span>
              </div>
              <div className="db-hero-strip-div" />
              <div className="db-hero-strip-item">
                <span className="db-hero-strip-val">{loading ? "..." : (overview?.team_members ?? 0)}</span>
                <span className="db-hero-strip-label">Members</span>
              </div>
            </div>
          </div>

          {/* Completion ring */}
          <div className="db-hero-ring-wrap">
            <svg viewBox="0 0 120 120" className="db-ring-svg">
              <defs>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%"   stopColor="#C96442" />
                  <stop offset="100%" stopColor="#D4835E" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(201,100,66,0.1)" strokeWidth="7" />
              <circle
                cx="60" cy="60" r="50"
                fill="none"
                stroke="url(#ringGrad)"
                strokeWidth="7"
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
                  <div className="db-stat-value">{loading ? "-" : card.value}</div>
                  <div className="db-stat-label">{card.label}</div>
                  <div className={`db-stat-trend ${card.up === false ? "down" : card.up === null ? "neutral" : "up"}`}>
                    {card.up === true  && <TrendingUp  size={11} />}
                    {card.up === false && <TrendingDown size={11} />}
                    {card.up === null  && <span style={{ fontSize: 10 }}>{"->"}</span>}
                    {card.trend}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── MID ROW: Area Chart + Activity Feed ── */}
        <CompanyCard company={company} loading={loading} />

        <div className="db-calendar-widget-grid">
          {calendarWidgets.map((widget) => (
            <DashboardWidget
              key={widget.title}
              {...widget}
              loading={loading}
            />
          ))}
        </div>

        {projectWidgets.length > 0 && (
          <div className="db-calendar-widget-grid">
            {projectWidgets.map((widget) => (
              <DashboardWidget
                key={widget.title}
                {...widget}
                loading={loading}
              />
            ))}
          </div>
        )}

        <section className="db-card db-team-workload-widget">
          <div className="db-card-header">
            <div>
              <h2 className="db-card-title">Team Workload</h2>
              <p className="db-card-sub">
                {user?.role === "employee"
                  ? "Your current assignment load"
                  : "Assignment distribution across the organization"}
              </p>
            </div>
            <Users size={16} className="db-card-icon-accent" />
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
                  [1, 2, 3].map((i) => (
                    <tr key={i}>
                      <td colSpan={5}><div className="db-table-skeleton" /></td>
                    </tr>
                  ))
                ) : teamWorkloadMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="db-table-empty">No workload data available</td>
                  </tr>
                ) : (
                  teamWorkloadMembers.map((member) => {
                    const ws = getWorkloadStyle(member.workload_status);
                    return (
                      <tr key={member.id || member.name}>
                        <td className="db-workload-name">{member.name}</td>
                        <td>{member.active_tasks ?? member.assigned_tasks ?? 0}</td>
                        <td>{member.completed_tasks ?? 0}</td>
                        <td>{member.overdue_tasks ?? 0}</td>
                        <td>
                          <span
                            className="db-workload-status"
                            style={{ background: ws.bg, color: ws.color }}
                          >
                            {member.workload_label || "Balanced"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="db-command-grid">
          <section className="db-card db-focus-card">
            <div className="db-card-header">
              <div>
                <h2 className="db-card-title">Today&apos;s Focus</h2>
                <p className="db-card-sub">Highest signal items for admins</p>
              </div>
              <Target size={16} className="db-card-icon-accent" />
            </div>

            <div className="db-focus-list">
              {focusItems.map((item) => (
                <Link key={item.label} to={item.to} className={`db-focus-item db-focus-item--${item.tone}`}>
                  <span className="db-focus-value">{loading ? "..." : item.value}</span>
                  <span className="db-focus-copy">
                    <strong>{item.label}</strong>
                    <small>{item.copy}</small>
                  </span>
                  <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          </section>

          <section className="db-card db-pulse-card">
            <div className="db-card-header">
              <div>
                <h2 className="db-card-title">Team Pulse</h2>
                <p className="db-card-sub">Capacity and completion at a glance</p>
              </div>
              <Sparkles size={15} className="db-card-icon-accent" />
            </div>

            <div className="db-pulse-stack">
              <div className="db-pulse-row">
                <span>Completion rate</span>
                <strong>{loading ? "..." : `${completionPct}%`}</strong>
              </div>
              <div className="db-pulse-meter">
                <span style={{ width: `${completionPct}%` }} />
              </div>
              <div className="db-pulse-meta">
                <span>{pluralize(overview?.completed_tasks ?? 0, "task")} completed</span>
                <span>{pluralize(openTasks, "task")} open</span>
              </div>
              <div className="db-pulse-foot">
                <Users size={15} />
                {loading ? "Loading members..." : `${overview?.team_members ?? 0} active team members`}
              </div>
            </div>
          </section>

          <section className="db-card db-actions-card">
            <div className="db-card-header">
              <div>
                <h2 className="db-card-title">Quick Actions</h2>
                <p className="db-card-sub">Common admin workflows</p>
              </div>
              <Zap size={15} className="db-card-icon-accent" />
            </div>

            <div className="db-action-list">
              {quickActions.map((action) => (
                <Link key={action.label} to={action.to} className="db-action-item">
                  <span>
                    <strong>{action.label}</strong>
                    <small>{action.copy}</small>
                  </span>
                  <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          </section>
        </div>

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
                    <stop offset="5%"  stopColor="#C96442" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#C96442" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<GlassTooltip />} />
                <Area
                  type="monotone"
                  dataKey="tasks"
                  name="Tasks"
                  stroke="#C96442"
                  strokeWidth={2}
                  fill="url(#areaGrad)"
                  dot={{ r: 3, fill: "#C96442", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#C96442", stroke: "#fff", strokeWidth: 2 }}
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

          {/* Donut - Task Distribution */}
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
                    stroke="#FAFAFA"
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
                    <span className="db-legend-val">{loading ? "..." : s.value}</span>
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
                projectProgress.map(p => {
                  const healthStyle = getHealthStyle(p.health);
                  const row = (
                    <div className="db-progress-item">
                      <div className="db-progress-meta">
                        <span className="db-progress-name">
                          {p.name}
                          {p.health && (
                            <em
                              className="db-progress-health"
                              style={{ color: healthStyle.color, background: healthStyle.bg }}
                            >
                              {p.health}
                            </em>
                          )}
                        </span>
                        <span className="db-progress-pct" style={{ color: p.color }}>{p.pct}%</span>
                      </div>
                      {p.lead && <small className="db-progress-lead">Lead: {p.lead}</small>}
                      <div className="db-progress-track">
                        <div
                          className="db-progress-fill"
                          style={{ width: `${p.pct}%`, background: `linear-gradient(90deg, ${p.color}, ${p.color}cc)` }}
                        />
                      </div>
                    </div>
                  );
                  return p.id ? (
                    <Link key={p.id} to={`/dashboard/projects/${p.id}`} className="db-progress-link">
                      {row}
                    </Link>
                  ) : (
                    <div key={p.name}>{row}</div>
                  );
                })
              )}
            </div>
          </div>

          {/* Team Workload Bar Chart */}
          <div className="db-card db-workload-card">
            <div className="db-card-header">
              <div>
                <h2 className="db-card-title">Workload Chart</h2>
                <p className="db-card-sub">Active assignments per member</p>
              </div>
              <Sparkles size={15} className="db-card-icon-accent" />
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={teamWorkload} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<GlassTooltip />} />
                <Bar dataKey="tasks" name="Active" radius={[6, 6, 0, 0]} barSize={26}>
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
