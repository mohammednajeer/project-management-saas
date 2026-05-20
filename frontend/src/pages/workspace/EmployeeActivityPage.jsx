import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Filter,
  Layers,
  MessageCircle,
  Search,
  Sparkles,
} from "lucide-react";

import api from "../../services/api";
import "./EmployeeActivityPage.css";

const ACTION_META = {
  issue_create: {
    label: "Issues",
    icon: AlertCircle,
    tone: "danger",
  },
  issue_assigned: {
    label: "Issue tasks",
    icon: AlertCircle,
    tone: "danger",
  },
  issue_updated: {
    label: "Issue updates",
    icon: AlertCircle,
    tone: "warning",
  },
  subtask_updated: {
    label: "Subtasks",
    icon: CheckCircle2,
    tone: "success",
  },
  comment_added: {
    label: "Comments",
    icon: MessageCircle,
    tone: "info",
  },
};

function formatRelative(value) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getMeta(action) {
  return ACTION_META[action] || {
    label: "Activity",
    icon: Activity,
    tone: "neutral",
  };
}

function ActivityRow({ item }) {
  const meta = getMeta(item.action);
  const Icon = meta.icon;

  return (
    <article className={`ea-row ea-row--${meta.tone}`}>
      <span className="ea-row-icon">
        <Icon size={16} />
      </span>
      <div className="ea-row-body">
        <div className="ea-row-top">
          <strong>{item.message}</strong>
          <time>
            <Clock3 size={13} />
            {formatRelative(item.created_at)}
          </time>
        </div>
        <div className="ea-row-meta">
          <span>{meta.label}</span>
          {item.project_data?.name && <span>{item.project_data.name}</span>}
          {item.task_data?.title && <span>{item.task_data.title}</span>}
          {item.subtask_data?.title && <span>{item.subtask_data.title}</span>}
        </div>
      </div>
    </article>
  );
}

export default function EmployeeActivityPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const load = async () => {
      try {
        setError("");
        const response = await api.get("/workspace/activity-feed/");
        setActivities(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setError(err.response?.data?.message || "Could not load activity.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const stats = useMemo(() => {
    const issueTasks = activities.filter((item) =>
      String(item.action || "").startsWith("issue")
    ).length;
    const comments = activities.filter((item) => item.action === "comment_added").length;
    const subtasks = activities.filter((item) => item.action === "subtask_updated").length;

    return {
      total: activities.length,
      issueTasks,
      comments,
      subtasks,
    };
  }, [activities]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return activities.filter((item) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "issues" && String(item.action || "").startsWith("issue")) ||
        item.action === filter;

      const haystack = [
        item.message,
        item.project_data?.name,
        item.task_data?.title,
        item.subtask_data?.title,
        item.user_data?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesFilter && (!search || haystack.includes(search));
    });
  }, [activities, filter, query]);

  return (
    <div className="ea-page">
      <header className="ea-hero">
        <div>
          <span className="ea-eyebrow">
            <Sparkles size={15} />
            Employee workspace
          </span>
          <h1>Activity Feed</h1>
          <p>All task updates, comments, blockers, and issue assignments connected to your work.</p>
        </div>
        <div className="ea-hero-card">
          <strong>{stats.total}</strong>
          <span>Total updates</span>
        </div>
      </header>

      <section className="ea-stats">
        <article>
          <Activity size={17} />
          <strong>{stats.total}</strong>
          <span>All activity</span>
        </article>
        <article>
          <AlertCircle size={17} />
          <strong>{stats.issueTasks}</strong>
          <span>Issue tasks</span>
        </article>
        <article>
          <MessageCircle size={17} />
          <strong>{stats.comments}</strong>
          <span>Comments</span>
        </article>
        <article>
          <CheckCircle2 size={17} />
          <strong>{stats.subtasks}</strong>
          <span>Subtask updates</span>
        </article>
      </section>

      <section className="ea-toolbar">
        <label className="ea-search">
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search activity"
          />
        </label>
        <label className="ea-filter">
          <Filter size={15} />
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All updates</option>
            <option value="issues">Issue tasks</option>
            <option value="subtask_updated">Subtasks</option>
            <option value="comment_added">Comments</option>
          </select>
        </label>
      </section>

      <main className="ea-layout">
        <section className="ea-feed">
          {error && <div className="ea-error">{error}</div>}
          {loading ? (
            Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="ea-skeleton" />
            ))
          ) : filtered.length ? (
            filtered.map((item) => <ActivityRow key={item.id} item={item} />)
          ) : (
            <div className="ea-empty">No activity matches this view.</div>
          )}
        </section>

        <aside className="ea-side">
          <section>
            <h2>Scope</h2>
            <p>Only activity from your assigned task context is shown here.</p>
          </section>
          <section>
            <h2>Issue Tasks</h2>
            <p>Issue assignment updates are marked separately so blockers do not look like normal task work.</p>
          </section>
          <section>
            <h2>
              <Layers size={15} />
              Connected Work
            </h2>
            <p>Task and subtask names appear on each update when available.</p>
          </section>
        </aside>
      </main>
    </div>
  );
}
