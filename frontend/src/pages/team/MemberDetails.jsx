import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  FolderOpen,
  Globe2,
  Mail,
  PlaneTakeoff,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { formatWebsite, getCompanyFromUser, getCompanyInitials, getCompanyName } from "../../utils/company";
import "./MemberDetails.css";

const ROLE_STYLE = {
  admin: { color: "#dc2626", bg: "#fff1f2", border: "#fca5a5" },
  manager: { color: "#4f6df5", bg: "#eff2ff", border: "#a5b4fc" },
  employee: { color: "#4b5563", bg: "#f9fafb", border: "#d1d5db" },
};

const ACTIVITY_COLORS = {
  task_created: "#22c55e",
  task_updated: "#3b82f6",
  task_deleted: "#ef4444",
  subtask_created: "#8b5cf6",
  subtask_updated: "#3b82f6",
  subtask_completed: "#22c55e",
  comment_added: "#f59e0b",
  member_added: "#06b6d4",
  project_created: "#4f6df5",
  issue_create: "#ef4444",
  issue_assigned: "#f97316",
  issue_updated: "#8b5cf6",
  default: "#94a3b8",
};

const titleCase = (value) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "";

const formatDate = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const formatCompactRange = (startValue, endValue) => {
  const start = formatDate(startValue);
  const end = formatDate(endValue || startValue);
  return start === end ? start : `${start} - ${end}`;
};

const formatRelativeTime = (value) => {
  if (!value) return "";

  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(Math.max(0, diff) / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  if (Math.floor(hours / 24) === 1) return "Yesterday";

  return `${Math.floor(hours / 24)}d ago`;
};

const getInitials = (member) => {
  const source = member?.name || member?.email || "?";
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

const buildActivityText = (activity) => {
  if (activity.message) return activity.message;

  const action = String(activity.action || "").replace(/_/g, " ");
  return action ? titleCase(action) : "Recorded activity";
};

function MetricCard({ icon: Icon, label, value, tone }) {
  return (
    <div className={`md-metric md-metric--${tone}`}>
      <div className="md-metric-icon">
        <Icon size={20} />
      </div>
      <div>
        <div className="md-metric-value">{value}</div>
        <div className="md-metric-label">{label}</div>
      </div>
    </div>
  );
}

export default function MemberDetails() {
  const { memberId } = useParams();
  const { user } = useAuth();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    const fetchMember = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await api.get(`/invitations/team/${memberId}/`);
        if (!ignore) setMember(res.data);
      } catch (err) {
        if (!ignore) {
          setError(err.response?.data?.message || "Failed to load member details.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchMember();

    return () => {
      ignore = true;
    };
  }, [memberId]);

  const roleStyle = ROLE_STYLE[member?.role] || ROLE_STYLE.employee;
  const company = getCompanyFromUser(user);
  const companyName = getCompanyName(company, user?.organization || "Company");

  const metrics = useMemo(() => [
    {
      icon: Clock3,
      label: "Active tasks",
      value: member?.active_tasks ?? 0,
      tone: "blue",
    },
    {
      icon: CheckCircle2,
      label: "Completed tasks",
      value: member?.completed_tasks ?? 0,
      tone: "green",
    },
    {
      icon: AlertTriangle,
      label: "Overdue tasks",
      value: member?.overdue_tasks ?? 0,
      tone: "red",
    },
    {
      icon: Briefcase,
      label: "Issues assigned",
      value: member?.issues_assigned ?? 0,
      tone: "orange",
    },
    {
      icon: FolderOpen,
      label: "Projects involved",
      value: member?.projects_involved ?? 0,
      tone: "purple",
    },
    {
      icon: PlaneTakeoff,
      label: "Leave requests count",
      value: member?.leave_requests_taken ?? 0,
      tone: "cyan",
    },
    {
      icon: CalendarCheck,
      label: "Approved leaves",
      value: member?.approved_leaves ?? 0,
      tone: "green",
    },
    {
      icon: Clock3,
      label: "Upcoming leave",
      value: member?.upcoming_leave
        ? formatCompactRange(
            member.upcoming_leave.start_date,
            member.upcoming_leave.end_date
          )
        : "None",
      tone: "teal",
    },
  ], [member]);

  return (
    <div className="md-page">
      <div className="md-topbar">
        <Link to="/dashboard/team" className="md-back-link">
          <ArrowLeft size={16} />
          Team
        </Link>
      </div>

      {loading ? (
        <div className="md-loading">
          <div className="md-profile-skeleton" />
          <div className="md-grid">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="md-card-skeleton" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="md-error">
          <AlertTriangle size={22} />
          <div>
            <h1>Member unavailable</h1>
            <p>{error}</p>
          </div>
        </div>
      ) : (
        <>
          <section className="md-profile">
            <div className="md-avatar">
              {member.profile_picture ? (
                <img src={member.profile_picture} alt="" />
              ) : (
                getInitials(member)
              )}
            </div>

            <div className="md-profile-main">
              <div className="md-name-row">
                <h1>{member.name || member.email}</h1>
                <span
                  className="md-role"
                  style={{
                    color: roleStyle.color,
                    background: roleStyle.bg,
                    borderColor: roleStyle.border,
                  }}
                >
                  <ShieldCheck size={14} />
                  {titleCase(member.role)}
                </span>
              </div>

              <div className="md-meta-row">
                <span>
                  <Mail size={15} />
                  {member.email}
                </span>
                <span>
                  <UserRound size={15} />
                  Joined {formatDate(member.joined_at)}
                </span>
              </div>
            </div>
          </section>

          <section className="md-company-card">
            <div className="md-company-logo">
              {company?.logo ? (
                <img src={company.logo} alt="" />
              ) : (
                getCompanyInitials(company, "PF")
              )}
            </div>
            <div className="md-company-body">
              <span>Company Information</span>
              <h2>{companyName}</h2>
              <div className="md-company-meta">
                <span>{company?.industry || "Industry not set"}</span>
                <a
                  href={company?.website || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className={!company?.website ? "is-disabled" : ""}
                >
                  <Globe2 size={14} />
                  {formatWebsite(company?.website)}
                </a>
              </div>
            </div>
          </section>

          <section className="md-grid">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </section>

          <section className="md-activity">
            <div className="md-section-header">
              <div>
                <h2>Recent Activity</h2>
                <p>Latest actions performed by this member</p>
              </div>
            </div>

            {member.recent_activity?.length > 0 ? (
              <div className="md-activity-list">
                {member.recent_activity.map((activity) => (
                  <div key={activity.id} className="md-activity-item">
                    <span
                      className="md-activity-dot"
                      style={{
                        background: ACTIVITY_COLORS[activity.action] || ACTIVITY_COLORS.default,
                      }}
                    />
                    <div>
                      <p>{buildActivityText(activity)}</p>
                      <time>{formatRelativeTime(activity.created_at)}</time>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="md-empty">
                <Clock3 size={24} />
                <p>No recent activity for this member.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
