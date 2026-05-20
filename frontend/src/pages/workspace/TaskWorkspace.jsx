import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Circle,
  FileUp,
  Flag,
  GitBranch,
  History,
  Layers,
  Lock,
  MessageCircle,
  Paperclip,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

import api from "../../services/api";
import "./TaskWorkspace.css";

const STATUS_CONFIG = {
  todo: { label: "Todo", color: "#8A87A0", bg: "#F2F0F8" },
  in_progress: { label: "In Progress", color: "#3B82F6", bg: "#EFF6FF" },
  review: { label: "Review", color: "#8B5CF6", bg: "#F5F3FF" },
  done: { label: "Done", color: "#16A34A", bg: "#F0FDF4" },
};

const PRIORITY_CONFIG = {
  critical: { label: "Critical", color: "#DC2626", bg: "rgba(220,38,38,0.08)" },
  high: { label: "High", color: "#F59E0B", bg: "rgba(245,158,11,0.08)" },
  medium: { label: "Medium", color: "#8B5CF6", bg: "rgba(139,92,246,0.08)" },
  low: { label: "Low", color: "#8A87A0", bg: "rgba(138,135,160,0.08)" },
};

function formatDate(value) {
  if (!value) return "No date";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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

function initials(user) {
  const value = user?.name || user?.email || "U";
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.todo;
  return (
    <span className="tw-badge" style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.low;
  return (
    <span className="tw-badge" style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

function AvatarStack({ users = [] }) {
  if (!users.length) {
    return <span className="tw-muted">Unassigned</span>;
  }

  return (
    <div className="tw-avatars">
      {users.slice(0, 4).map((user) => (
        <span key={user.id} className="tw-avatar" title={user.name || user.email}>
          {initials(user)}
        </span>
      ))}
      {users.length > 4 && <span className="tw-avatar tw-avatar-more">+{users.length - 4}</span>}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="tw-page">
      <div className="tw-skeleton tw-skeleton-hero" />
      <div className="tw-shell">
        <div className="tw-skeleton tw-skeleton-main" />
        <div className="tw-skeleton tw-skeleton-side" />
      </div>
    </div>
  );
}

export default function TaskWorkspace() {
  const { taskId } = useParams();
  const [searchParams] = useSearchParams();
  const highlightedSubtaskId = searchParams.get("subtask");
  const highlightedRef = useRef(null);

  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSubtaskId, setSelectedSubtaskId] = useState(highlightedSubtaskId || "");
  const [comment, setComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [issueDraft, setIssueDraft] = useState(null);

  const loadWorkspace = useCallback(async () => {
    try {
      setError("");
      const res = await api.get(`/workspace/task/${taskId}/`);
      setWorkspace(res.data);
      const firstEditable = res.data?.permissions?.editable_subtasks?.[0] || "";
      setSelectedSubtaskId(highlightedSubtaskId || firstEditable);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load this task workspace.");
    } finally {
      setLoading(false);
    }
  }, [taskId, highlightedSubtaskId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (!loading && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [loading]);

  const permissions = workspace?.permissions || {};
  const task = workspace?.task;
  const subtasks = workspace?.subtasks || [];
  const editableIds = useMemo(
    () => new Set(permissions.editable_subtasks || []),
    [permissions.editable_subtasks]
  );

  const stats = useMemo(() => {
    const total = subtasks.length;
    const done = subtasks.filter((item) => item.status === "done").length;
    const review = subtasks.filter((item) => item.status === "review").length;
    const assigned = subtasks.filter((item) => editableIds.has(item.id)).length;
    return { total, done, review, assigned };
  }, [subtasks, editableIds]);

  const updateSubtaskStatus = async (subtaskId, statusValue) => {
    const previous = workspace;
    setWorkspace((current) => ({
      ...current,
      subtasks: current.subtasks.map((item) =>
        item.id === subtaskId ? { ...item, status: statusValue } : item
      ),
    }));

    try {
      await api.patch(`/workspace/subtasks/${subtaskId}/`, { status: statusValue });
      await loadWorkspace();
    } catch (err) {
      setWorkspace(previous);
      setError(err.response?.data?.message || "Could not update subtask status.");
    }
  };

  const uploadSubtaskFile = async (subtaskId, file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      await api.post(`/tasks/subtasks/${subtaskId}/attachments/upload/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await loadWorkspace();
    } catch (err) {
      setError(err.response?.data?.message || "Could not upload attachment.");
    }
  };

  const submitComment = async (event) => {
    event.preventDefault();
    if (!comment.trim()) return;

    setSubmittingComment(true);
    try {
      await api.post(`/tasks/comments/${taskId}/`, {
        message: comment.trim(),
        subtask: selectedSubtaskId || null,
      });
      setComment("");
      await loadWorkspace();
    } catch (err) {
      setError(err.response?.data?.message || "Could not add comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const submitIssue = async (event) => {
    event.preventDefault();
    if (!issueDraft?.title?.trim() || !issueDraft?.description?.trim()) return;

    try {
      await api.post("/issues/", {
        title: issueDraft.title.trim(),
        description: issueDraft.description.trim(),
        priority: issueDraft.priority,
        project: task.project_data.id,
        task: task.id,
        subtask: issueDraft.subtaskId,
      });
      setIssueDraft(null);
      await loadWorkspace();
    } catch (err) {
      setError(err.response?.data?.message || "Could not raise issue.");
    }
  };

  if (loading) return <Skeleton />;

  if (error && !workspace) {
    return (
      <div className="tw-page">
        <div className="tw-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="tw-page">
      <button className="tw-back" type="button" onClick={() => window.history.back()}>
        <ArrowLeft size={16} />
        My Work
      </button>

      {error && <div className="tw-error tw-error-inline">{error}</div>}

      <section className="tw-hero tw-glass">
        <div className="tw-hero-main">
          <div className="tw-eyebrow">
            <Sparkles size={13} />
            Employee task workspace
          </div>
          <h1>{task.title}</h1>
          <p>{task.description || "No task description provided."}</p>

          <div className="tw-meta-grid">
            <span><Layers size={13} /> {task.project_data?.name}</span>
            <span><ShieldCheck size={13} /> {task.project_data?.status}</span>
            <span><CalendarDays size={13} /> Due {formatDate(task.due_date)}</span>
            <span><UserRound size={13} /> Created by {task.created_by_data?.name}</span>
          </div>
        </div>

        <div className="tw-hero-side">
          <div className="tw-progress-ring">
            <span>{task.progress || 0}%</span>
          </div>
          <div className="tw-progress-track">
            <span style={{ width: `${task.progress || 0}%` }} />
          </div>
          <div className="tw-badge-row">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
          <div className="tw-readonly-note">
            <Lock size={13} />
            Task details are read-only
          </div>
        </div>
      </section>

      <div className="tw-stats">
        <div className="tw-stat"><strong>{stats.total}</strong><span>Subtasks</span></div>
        <div className="tw-stat"><strong>{stats.assigned}</strong><span>Assigned to you</span></div>
        <div className="tw-stat"><strong>{stats.review}</strong><span>In review</span></div>
        <div className="tw-stat"><strong>{stats.done}</strong><span>Done</span></div>
      </div>

      <main className="tw-shell">
        <section className="tw-main-column">
          <section className="tw-panel tw-glass">
            <div className="tw-panel-head">
              <div>
                <h2>Subtasks</h2>
                <p>All subtasks are visible. Only your assigned work is editable.</p>
              </div>
              <GitBranch size={18} />
            </div>

            <div className="tw-subtask-list">
              {subtasks.map((subtask) => {
                const isEditable = editableIds.has(subtask.id);
                const isHighlighted = highlightedSubtaskId === subtask.id;
                return (
                  <article
                    key={subtask.id}
                    ref={isHighlighted ? highlightedRef : null}
                    className={`tw-subtask ${isEditable ? "is-editable" : "is-locked"} ${isHighlighted ? "is-highlighted" : ""}`}
                  >
                    <div className="tw-subtask-top">
                      <div>
                        <div className="tw-subtask-kicker">
                          {isEditable ? <CheckCircle2 size={13} /> : <Lock size={13} />}
                          {isEditable ? "Assigned to you" : "Read Only"}
                        </div>
                        <h3>{subtask.title}</h3>
                        {subtask.description && <p>{subtask.description}</p>}
                      </div>
                      <div className="tw-subtask-badges">
                        <PriorityBadge priority={subtask.priority} />
                        <StatusBadge status={subtask.status} />
                      </div>
                    </div>

                    <div className="tw-subtask-meta">
                      <span><CalendarDays size={13} /> {formatDate(subtask.due_date)}</span>
                      <span><MessageCircle size={13} /> {subtask.comments_count || 0}</span>
                      <span><Paperclip size={13} /> {subtask.attachments_count || 0}</span>
                      <AvatarStack users={subtask.assigned_users} />
                    </div>

                    <div className={isEditable ? "tw-action-row" : "tw-action-row is-blurred"}>
                      <select
                        value={subtask.status}
                        disabled={!isEditable}
                        onChange={(event) => updateSubtaskStatus(subtask.id, event.target.value)}
                      >
                        {Object.entries(STATUS_CONFIG).map(([value, cfg]) => (
                          <option key={value} value={value}>{cfg.label}</option>
                        ))}
                      </select>

                      <label className={`tw-file-button ${!isEditable ? "is-disabled" : ""}`}>
                        <FileUp size={14} />
                        Upload
                        <input
                          type="file"
                          disabled={!isEditable}
                          onChange={(event) => uploadSubtaskFile(subtask.id, event.target.files?.[0])}
                        />
                      </label>

                      <button
                        type="button"
                        disabled={!isEditable}
                        onClick={() => setIssueDraft({
                          subtaskId: subtask.id,
                          subtaskTitle: subtask.title,
                          title: "",
                          description: "",
                          priority: "medium",
                        })}
                      >
                        <Flag size={14} />
                        Raise Issue
                      </button>
                    </div>

                    {!isEditable && (
                      <div className="tw-lock-overlay">
                        <Lock size={15} />
                        Read-only subtask
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="tw-panel tw-glass">
            <div className="tw-panel-head">
              <div>
                <h2>Collaboration</h2>
                <p>Comments can be linked to the task or a specific subtask.</p>
              </div>
              <MessageCircle size={18} />
            </div>

            <form className="tw-comment-form" onSubmit={submitComment}>
              <select
                value={selectedSubtaskId}
                onChange={(event) => setSelectedSubtaskId(event.target.value)}
              >
                <option value="">Task level comment</option>
                {subtasks.map((subtask) => (
                  <option key={subtask.id} value={subtask.id}>
                    {subtask.title}
                  </option>
                ))}
              </select>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Share an update, blocker, or handoff note..."
              />
              <button type="submit" disabled={submittingComment || !comment.trim()}>
                <Send size={15} />
                Comment
              </button>
            </form>

            <div className="tw-comment-list">
              {(workspace.comments || []).map((item) => (
                <article key={item.id} className="tw-comment">
                  <span className="tw-avatar">{initials(item.user_data)}</span>
                  <div>
                    <div className="tw-comment-head">
                      <strong>{item.user_data?.name}</strong>
                      <span>{item.user_data?.role}</span>
                      <time>{formatRelative(item.created_at)}</time>
                    </div>
                    {item.subtask_data && (
                      <span className="tw-linked-subtask">{item.subtask_data.title}</span>
                    )}
                    <p>{item.message}</p>
                  </div>
                </article>
              ))}
              {!workspace.comments?.length && (
                <div className="tw-empty">No comments yet.</div>
              )}
            </div>
          </section>
        </section>

        <aside className="tw-side-column">
          <section className="tw-panel tw-glass">
            <div className="tw-panel-head">
              <div>
                <h2>Files</h2>
                <p>Task and subtask attachments</p>
              </div>
              <Paperclip size={18} />
            </div>

            <div className="tw-file-list">
              {(workspace.attachments || []).map((file) => (
                <a key={file.id} href={file.file} className="tw-file" target="_blank" rel="noreferrer">
                  <Paperclip size={14} />
                  <span>Task attachment</span>
                  <small>{formatRelative(file.uploaded_at)}</small>
                </a>
              ))}
              {subtasks.flatMap((subtask) =>
                (subtask.attachments || []).map((file) => (
                  <a key={file.id} href={file.file} className="tw-file" target="_blank" rel="noreferrer">
                    <Paperclip size={14} />
                    <span>{file.original_name || "Attachment"}</span>
                    <small>{subtask.title}</small>
                  </a>
                ))
              )}
              {!workspace.attachments?.length &&
                !subtasks.some((subtask) => subtask.attachments?.length) && (
                  <div className="tw-empty">No attachments yet.</div>
                )}
            </div>
          </section>

          <section className="tw-panel tw-glass">
            <div className="tw-panel-head">
              <div>
                <h2>Issues</h2>
                <p>Raised blockers</p>
              </div>
              <AlertTriangle size={18} />
            </div>

            <div className="tw-issue-list">
              {(workspace.issues || []).map((issue) => (
                <article key={issue.id} className="tw-issue">
                  <PriorityBadge priority={issue.priority} />
                  <strong>{issue.title}</strong>
                  <span>{issue.status}</span>
                </article>
              ))}
              {!workspace.issues?.length && <div className="tw-empty">No issues raised.</div>}
            </div>
          </section>

          <section className="tw-panel tw-glass">
            <div className="tw-panel-head">
              <div>
                <h2>Activity</h2>
                <p>Latest task timeline</p>
              </div>
              <History size={18} />
            </div>

            <div className="tw-timeline">
              {(workspace.activities || []).map((activity) => (
                <article key={activity.id} className="tw-activity">
                  <span className="tw-activity-dot"><Circle size={9} /></span>
                  <div>
                    <strong>{activity.user_data?.name}</strong>
                    <p>{activity.message}</p>
                    <time>{formatRelative(activity.created_at)}</time>
                  </div>
                </article>
              ))}
              {!workspace.activities?.length && <div className="tw-empty">No activity yet.</div>}
            </div>
          </section>
        </aside>
      </main>

      {issueDraft && (
        <div className="tw-modal-backdrop" onClick={() => setIssueDraft(null)}>
          <form className="tw-modal" onSubmit={submitIssue} onClick={(event) => event.stopPropagation()}>
            <h2>Raise Issue</h2>
            <p>{issueDraft.subtaskTitle}</p>
            <input
              value={issueDraft.title}
              onChange={(event) => setIssueDraft((draft) => ({ ...draft, title: event.target.value }))}
              placeholder="Issue title"
            />
            <textarea
              value={issueDraft.description}
              onChange={(event) => setIssueDraft((draft) => ({ ...draft, description: event.target.value }))}
              placeholder="Describe the blocker"
            />
            <select
              value={issueDraft.priority}
              onChange={(event) => setIssueDraft((draft) => ({ ...draft, priority: event.target.value }))}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <div className="tw-modal-actions">
              <button type="button" onClick={() => setIssueDraft(null)}>Cancel</button>
              <button type="submit">Create Issue</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
