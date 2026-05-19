import { useMemo, useState } from "react";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  MessageSquare,
  AtSign,
  UserPlus,
  FolderOpen,
  ListTodo,
  AlertTriangle,
  Sparkles,
  Inbox,
} from "lucide-react";
import useNotifications from "../../context/useNotifications";
import "./Notifications.css";

/* ─── TYPE INFERENCE ─────────────────────────────────────────────────────── */
function inferType(notification) {
  const text = `${notification.title || ""} ${notification.message || ""}`.toLowerCase();
  if (text.includes("comment"))                                   return "comment";
  if (text.includes("mention") || text.includes("@"))            return "mention";
  if (text.includes("member") || text.includes("joined") || text.includes("invited")) return "member";
  if (text.includes("project"))                                   return "project";
  if (text.includes("task") || text.includes("subtask") || text.includes("assigned")) return "task";
  if (text.includes("complet") || text.includes("done") || text.includes("finish"))   return "success";
  if (text.includes("overdue") || text.includes("urgent") || text.includes("blocked")) return "warning";
  return "default";
}

const TYPE_META = {
  task:    { icon: <ListTodo size={15} />,      label: "Task",    iconClass: "nf-icon--task",    tagClass: "nf-tag--task" },
  comment: { icon: <MessageSquare size={15} />, label: "Comment", iconClass: "nf-icon--comment", tagClass: "nf-tag--comment" },
  mention: { icon: <AtSign size={15} />,        label: "Mention", iconClass: "nf-icon--mention", tagClass: "nf-tag--mention" },
  member:  { icon: <UserPlus size={15} />,      label: "Member",  iconClass: "nf-icon--member",  tagClass: "nf-tag--member" },
  project: { icon: <FolderOpen size={15} />,    label: "Project", iconClass: "nf-icon--project", tagClass: "nf-tag--project" },
  success: { icon: <CheckCircle2 size={15} />,  label: "Update",  iconClass: "nf-icon--success", tagClass: "nf-tag--success" },
  warning: { icon: <AlertTriangle size={15} />, label: "Alert",   iconClass: "nf-icon--warning", tagClass: "nf-tag--warning" },
  default: { icon: <Bell size={15} />,          label: "Info",    iconClass: "nf-icon--default", tagClass: "nf-tag--default" },
};

/* ─── TIME HELPERS ───────────────────────────────────────────────────────── */
function formatRelativeTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
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
  const today     = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString())     return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

/* ─── SKELETON ───────────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="nf-skeleton-list">
      {[0,1,2,3,4].map(i => (
        <div key={i} className="nf-skeleton-card">
          <div className="nf-skeleton-icon" />
          <div className="nf-skeleton-body">
            <span className="nf-skeleton-line w-30" />
            <span className="nf-skeleton-line w-85" />
            <span className="nf-skeleton-line w-60" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────── */
export default function Notifications() {
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();
  const [activeTab, setActiveTab] = useState("all");

  /* Counts */
  const unreadCount = useMemo(
    () => notifications.filter(n => !n.is_read).length,
    [notifications]
  );

  /* Filtered list */
  const filtered = useMemo(() => {
    if (activeTab === "all")    return notifications;
    if (activeTab === "unread") return notifications.filter(n => !n.is_read);
    return notifications;
  }, [notifications, activeTab]);

  /* Grouped by date */
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(n => {
      const key = formatDateGroup(n.created_at);
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });
    return Object.entries(groups);
  }, [filtered]);

  /* ── Loading ────────────────────────────────────────────────────────── */
  if (loading) return (
    <main className="notifications-page">
      <div className="nf-page-header">
        <div className="nf-header-inner">
          <div className="nf-header-left">
            <div className="nf-eyebrow"><span className="nf-eyebrow-dot" /> Inbox</div>
            <h1 className="nf-title">Notifications</h1>
            <p className="nf-subtitle">Stay updated with project activity.</p>
          </div>
        </div>
      </div>
      <Skeleton />
    </main>
  );

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <main className="notifications-page">

      {/* ── PAGE HEADER ───────────────────────────────────────────────── */}
      <div className="nf-page-header">
        <div className="nf-header-inner">
          <div className="nf-header-left">
            <div className="nf-eyebrow">
              <span className="nf-eyebrow-dot" />
              Inbox
            </div>
            <h1 className="nf-title">Notifications</h1>
            <p className="nf-subtitle">Stay updated with project activity.</p>
          </div>

          <div className="nf-header-right">
            {unreadCount > 0 && (
              <div className="nf-unread-badge">
                <Bell size={14} />
                <span className="nf-unread-count">{unreadCount}</span>
                unread
              </div>
            )}
            {markAllAsRead && (
              <button
                type="button"
                className="nf-mark-all-btn"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── FILTER TABS ───────────────────────────────────────────────── */}
      <div className="nf-filter-bar">
        <div className="nf-filter-tabs">
          <button
            type="button"
            className={`nf-tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            <Inbox size={12} />
            All
            <span className="nf-tab-count">{notifications.length}</span>
          </button>
          <button
            type="button"
            className={`nf-tab ${activeTab === "unread" ? "active" : ""}`}
            onClick={() => setActiveTab("unread")}
          >
            <Sparkles size={12} />
            Unread
            <span className="nf-tab-count">{unreadCount}</span>
          </button>
        </div>
      </div>

      {/* ── NOTIFICATION LIST ──────────────────────────────────────────── */}
      <div className="nf-list">
        {filtered.length === 0 ? (
          <div className="nf-empty">
            <div className="nf-empty-icon">🔔</div>
            <h3>{activeTab === "unread" ? "All caught up!" : "No notifications yet"}</h3>
            <p>
              {activeTab === "unread"
                ? "You have no unread notifications. Check back later."
                : "New activity across your projects will appear here."}
            </p>
          </div>
        ) : (
          grouped.map(([dateLabel, items]) => (
            <div key={dateLabel} className="nf-date-group">
              {/* Date separator */}
              <div className="nf-date-label">
                <span className="nf-date-label-text">{dateLabel}</span>
              </div>

              {/* Cards grouped in one panel */}
              <div className="nf-group-cards">
                {items.map(notification => {
                  const type = inferType(notification);
                  const meta = TYPE_META[type] || TYPE_META.default;

                  return (
                    <div
                      key={notification.id}
                      className={`notification-card ${notification.is_read ? "" : "unread"}`}
                      onClick={() => !notification.is_read && markAsRead(notification.id)}
                    >
                      {/* Left rail: type icon */}
                      <div className="nf-card-rail">
                        <div className={`nf-card-icon ${meta.iconClass}`}>
                          {meta.icon}
                        </div>
                      </div>

                      {/* Right: content */}
                      <div className="nf-card-content">
                        <div className="nf-card-top">
                          <div className="nf-card-title-row">
                            <h3 className="nf-card-title">{notification.title}</h3>
                            {!notification.is_read && <span className="nf-unread-dot" />}
                          </div>
                          <time className="nf-card-time">
                            {formatRelativeTime(notification.created_at)}
                          </time>
                        </div>

                        <p className="nf-card-message">{notification.message}</p>

                        <div className="nf-card-footer">
                          <span className={`nf-type-tag ${meta.tagClass}`}>
                            {meta.icon}
                            {meta.label}
                          </span>
                          {notification.is_read && (
                            <span className="nf-read-label">Read</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

    </main>
  );
}