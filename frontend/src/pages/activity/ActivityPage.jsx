import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Clock,
  FolderOpen,
  RefreshCw,
  Radio,
} from "lucide-react";
import api from "../../services/api";
import "./ActivityPage.css";

const ACTIVITY_COLOR_CLASSES = {
  task_created: "task-created",
  task_updated: "task-updated",
  subtask_created: "subtask-created",
  subtask_updated: "subtask-updated",
  comment_added: "comment-added",
  project_created: "project-created",
};

function getActivityColor(action) {
  return ACTIVITY_COLOR_CLASSES[action] || "default";
}

function formatRelativeTime(value) {
  if (!value) return "Just now";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

function buildActivityText(activity) {
  if (activity.message) return activity.message;
  return String(activity.action || "Activity recorded")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildInitials(user) {
  const source = user?.name || user?.email || "Unknown";
  return String(source)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function formatRole(role) {
  if (!role) return "Member";
  return String(role)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function ActivitySkeleton() {
  return (
    <div className="activity-center-skeleton-list" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((item) => (
        <div key={item} className="activity-center-skeleton-card">
          <div className="activity-center-skeleton-dot" />
          <div className="activity-center-skeleton-avatar" />
          <div className="activity-center-skeleton-body">
            <span className="activity-center-skeleton-line short" />
            <span className="activity-center-skeleton-line" />
            <span className="activity-center-skeleton-line medium" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ActivityPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchActivities = async ({ showLoading = true } = {}) => {
    try {
      if (showLoading) setLoading(true);
      setError("");

      const response = await api.get("/activities/");
      setActivities(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.log(err);
      setError("Unable to load workspace activity.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadActivities = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/activities/");
        if (mounted) setActivities(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        console.log(err);
        if (mounted) setError("Unable to load workspace activity.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadActivities();

    return () => {
      mounted = false;
    };
  }, []);

  const latestActivityTime = useMemo(() => {
    if (activities.length === 0) return "No updates yet";
    return formatRelativeTime(activities[0]?.created_at);
  }, [activities]);

  return (
    <main className="activity-center-page">
      <section className="activity-center-header">
        <div className="activity-center-title-block">
          <div className="activity-center-eyebrow">
            <Radio size={13} />
            Live Workspace Audit
          </div>
          <h1>Activity Center</h1>
          <p>Track all workspace activity and collaboration in real time.</p>
        </div>

        <div className="activity-center-summary">
          <div className="activity-center-summary-item">
            <span>Total Activity</span>
            <strong>{loading ? "..." : activities.length}</strong>
          </div>
          <div className="activity-center-summary-item">
            <span>Latest Update</span>
            <strong>{latestActivityTime}</strong>
          </div>
          <div className="activity-center-live">
            <span className="activity-center-live-dot" />
            Live
          </div>
        </div>
      </section>

      <section className="activity-center-panel">
        <div className="activity-center-panel-header">
          <div>
            <h2>Workspace Timeline</h2>
            <p>Company-wide project, task, subtask, and comment history.</p>
          </div>

          <button
            type="button"
            className="activity-center-refresh"
            onClick={() => fetchActivities({ showLoading: false })}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {loading ? (
          <ActivitySkeleton />
        ) : error ? (
          <div className="activity-center-state activity-center-state--error">
            <AlertCircle size={24} />
            <h3>Activity could not be loaded</h3>
            <p>{error}</p>
            <button type="button" onClick={() => fetchActivities()}>
              Try Again
            </button>
          </div>
        ) : activities.length === 0 ? (
          <div className="activity-center-state">
            <Activity size={28} />
            <h3>No workspace activity yet</h3>
            <p>New task, project, subtask, and comment updates will appear here.</p>
          </div>
        ) : (
          <div className="activity-center-timeline">
            {activities.map((activity) => {
              const colorClass = getActivityColor(activity.action);
              const user = activity.user_data || {};
              const userName = user.name || user.email || "Unknown user";
              const role = formatRole(user.role);
              const projectName = activity.project_data?.name;
              const taskTitle = activity.task_data?.title;
              const subtaskTitle = activity.subtask_data?.title;

              return (
                <article key={activity.id} className="activity-center-item">
                  <div className="activity-center-rail">
                    <span className={`activity-center-dot activity-center-dot--${colorClass}`} />
                  </div>

                  <div className="activity-center-card">
                    <div className="activity-center-card-top">
                      <div className="activity-center-user">
                        <div className="activity-center-avatar">
                          {buildInitials(user)}
                        </div>
                        <div>
                          <div className="activity-center-user-name">{userName}</div>
                          <span className="activity-center-role">{role}</span>
                        </div>
                      </div>

                      <time className="activity-center-time">
                        <Clock size={13} />
                        {formatRelativeTime(activity.created_at)}
                      </time>
                    </div>

                    <div className="activity-center-message-block">
                      <span className={`activity-center-action activity-center-action--${colorClass}`}>
                        {formatRole(activity.action || "activity")}
                      </span>
                      <p>{buildActivityText(activity)}</p>
                    </div>

                    <div className="activity-center-context">
                      {projectName && (
                        <span className="activity-center-context-pill primary">
                          <FolderOpen size={12} />
                          Project: {projectName}
                        </span>
                      )}
                      {taskTitle && (
                        <span className="activity-center-context-pill">
                          Task: {taskTitle}
                        </span>
                      )}
                      {subtaskTitle && (
                        <span className="activity-center-context-pill">
                          Subtask: {subtaskTitle}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
