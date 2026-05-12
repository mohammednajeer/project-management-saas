import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Flame,
  ListChecks,
  Target,
  TrendingUp,
} from "lucide-react";

import api from "../../services/api";

import "./WorkspacePage.css";

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

const statusLabels = {
  todo: "Todo",
  in_progress: "In Progress",
  review: "Review",
  done: "Done",
};

function formatDate(value) {
  if (!value) {
    return "No due date";
  }

  return new Date(value).toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}

export default function WorkspaceHome() {
  const [dashboard, setDashboard] =
    useState(initialDashboard);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get(
          "/workspace/dashboard/"
        );

        setDashboard({
          ...initialDashboard,
          ...response.data,
        });
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Could not load your dashboard."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const stats = useMemo(
    () => [
      {
        label: "Assigned Tasks",
        value: dashboard.assigned_tasks,
        icon: Target,
      },
      {
        label: "Assigned Subtasks",
        value: dashboard.assigned_subtasks,
        icon: ListChecks,
      },
      {
        label: "Completed",
        value: dashboard.completed_subtasks,
        icon: CheckCircle2,
      },
      {
        label: "Pending",
        value: dashboard.pending_subtasks,
        icon: Clock3,
      },
      {
        label: "Overdue",
        value: dashboard.overdue_subtasks,
        icon: AlertTriangle,
        danger: dashboard.overdue_subtasks > 0,
      },
      {
        label: "Completion Rate",
        value: `${dashboard.completion_rate}%`,
        icon: TrendingUp,
      },
    ],
    [dashboard]
  );

  if (loading) {
    return (
      <div className="workspace-page">
        <div className="workspace-loading">
          Loading productivity dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workspace-page">
        <div className="workspace-feedback workspace-feedback--error">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <div className="workspace-header workspace-header--split">
        <div>
          <h1>
            Productivity Dashboard
          </h1>
          <p>
            Your assigned work, deadlines, and progress at a glance
          </p>
        </div>
        <div className="workspace-progress-ring">
          <strong>
            {dashboard.completion_rate}%
          </strong>
          <span>
            complete
          </span>
        </div>
      </div>

      <section className="workspace-stats-grid">
        {stats.map((item) => {
          const Icon = item.icon;

          return (
            <article
              key={item.label}
              className={`workspace-stat-card ${
                item.danger
                  ? "workspace-stat-card--danger"
                  : ""
              }`}
            >
              <span className="workspace-stat-icon">
                <Icon size={19} />
              </span>
              <div>
                <p>
                  {item.label}
                </p>
                <strong>
                  {item.value}
                </strong>
              </div>
            </article>
          );
        })}
      </section>

      <section className="workspace-dashboard-grid">
        <article className="workspace-panel workspace-panel--priority">
          <div className="workspace-panel-header">
            <div>
              <h2>
                Priority Alert
              </h2>
              <p>
                High-impact work that needs attention
              </p>
            </div>
            <Flame size={20} />
          </div>

          {dashboard.high_priority_subtasks === 0 ? (
            <div className="workspace-empty">
              No high priority subtasks assigned.
            </div>
          ) : (
            <div className="workspace-priority-summary">
              <div>
                <span>
                  High or Critical
                </span>
                <strong>
                  {dashboard.high_priority_subtasks}
                </strong>
              </div>
              <div>
                <span>
                  Critical
                </span>
                <strong>
                  {dashboard.critical_subtasks}
                </strong>
              </div>
            </div>
          )}
        </article>

        <article className="workspace-panel">
          <div className="workspace-panel-header">
            <div>
              <h2>
                Upcoming Deadlines
              </h2>
              <p>
                Due within the next 7 days
              </p>
            </div>
            <CalendarClock size={20} />
          </div>

          {dashboard.upcoming_deadlines.length === 0 ? (
            <div className="workspace-empty">
              No upcoming deadlines.
            </div>
          ) : (
            <div className="workspace-list">
              {dashboard.upcoming_deadlines.map((subtask) => (
                <div
                  key={subtask.id}
                  className="workspace-list-item"
                >
                  <div>
                    <h3>
                      {subtask.title}
                    </h3>
                    <p>
                      Due {formatDate(subtask.due_date)}
                    </p>
                  </div>
                  <span className="workspace-status-pill">
                    {statusLabels[subtask.status] ||
                      subtask.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="workspace-panel">
        <div className="workspace-panel-header">
          <div>
            <h2>
              Recent Activity
            </h2>
            <p>
              Latest assigned subtasks
            </p>
          </div>
        </div>

        {dashboard.recent_subtasks.length === 0 ? (
          <div className="workspace-empty">
            No recent subtasks assigned.
          </div>
        ) : (
          <div className="workspace-list workspace-list--three">
            {dashboard.recent_subtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="workspace-list-item"
              >
                <div>
                  <h3>
                    {subtask.title}
                  </h3>
                  <p>
                    {subtask.description ||
                      "No description provided."}
                  </p>
                </div>
                <span className="workspace-status-pill">
                  {statusLabels[subtask.status] ||
                    subtask.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
