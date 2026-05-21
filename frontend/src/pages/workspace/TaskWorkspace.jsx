import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink, useParams, useSearchParams,useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clipboard,
  Clock3,
  FileImage,
  FileText,
  FileUp,
  Flag,
  GitBranch,
  History,
  Layers,
  Link,
  Lock,
  MessageCircle,
  Paperclip,
  Send,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserRound,
  Users,
  X,
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

const STATUS_ACTIONS = [
  ["in_progress", "Mark In Progress"],
  ["review", "Send To Review"],
  ["done", "Mark Done"],
];

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

function formatBytes(bytes) {
  if (!bytes) return "Unknown size";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(unit ? 1 : 0)} ${units[unit]}`;
}

function isImage(file = "") {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file);
}

function initials(user) {
  const value = user?.name || user?.email || "U";
  return value.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.todo;
  return <span className="tw-badge" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>;
}

function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.low;
  return <span className="tw-badge" style={{ color: cfg.color, background: cfg.bg }}>{cfg.label}</span>;
}

function AvatarStack({ users = [] }) {
  if (!users.length) return <span className="tw-muted">Unassigned</span>;
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

function FileCard({ file, label, source }) {
  const url = file.file;
  const name = file.original_name || label || "Attachment";
  return (
    <a className="tw-file-card" href={url} target="_blank" rel="noreferrer">
      <span className="tw-file-icon">
        {isImage(url || name) ? <FileImage size={17} /> : <FileText size={17} />}
      </span>
      <span>
        <strong>{name}</strong>
        <small>{source || file.uploaded_by_data?.name || file.user_data?.name || "Workspace file"}</small>
      </span>
      <em>{formatBytes(file.file_size)}</em>
      {isImage(url || name) && <img src={url} alt="" />}
    </a>
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightedSubtaskId = searchParams.get("subtask");
  const highlightedRef = useRef(null);
  const issueFileRef = useRef(null);

  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [focusSubtaskId, setFocusSubtaskId] = useState(highlightedSubtaskId || "");
  const [selectedSubtaskId, setSelectedSubtaskId] = useState(highlightedSubtaskId || "");
  const [comment, setComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [issueDraft, setIssueDraft] = useState(null);
  const [issueFiles, setIssueFiles] = useState([]);
  const [copied, setCopied] = useState(false);

  const loadWorkspace = useCallback(async () => {
    try {
      setError("");
      const res = await api.get(`/workspace/task/${taskId}/`);
      const firstEditable = res.data?.permissions?.editable_subtasks?.[0] || "";
      const nextFocus = highlightedSubtaskId || firstEditable || res.data?.subtasks?.[0]?.id || "";
      setWorkspace(res.data);
      setFocusSubtaskId((current) => current || nextFocus);
      setSelectedSubtaskId(nextFocus);
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
  const editableIds = useMemo(() => new Set(permissions.editable_subtasks || []), [permissions.editable_subtasks]);
  const focusedSubtask = subtasks.find((item) => item.id === focusSubtaskId) || subtasks[0];
  const canEditFocused = focusedSubtask && editableIds.has(focusedSubtask.id);

  useEffect(() => {
    if (focusedSubtask?.id) {
      setSelectedSubtaskId(focusedSubtask.id);
    }
  }, [focusedSubtask?.id]);

  const focusedComments = useMemo(
    () => (workspace?.comments || []).filter((item) => item.subtask === focusedSubtask?.id),
    [workspace?.comments, focusedSubtask?.id]
  );

  const focusedIssues = useMemo(
    () => (workspace?.issues || []).filter((item) => item.subtask === focusedSubtask?.id),
    [workspace?.issues, focusedSubtask?.id]
  );

  const focusedActivity = useMemo(
    () => (workspace?.activities || []).filter((item) => item.subtask_data?.id === focusedSubtask?.id),
    [workspace?.activities, focusedSubtask?.id]
  );

  const activityPreview = useMemo(
    () => (workspace?.activities || []).slice(0, 5),
    [workspace?.activities]
  );

  const commentsBySubtask = useMemo(() => {
    const map = new Map();
    subtasks.forEach((item) => map.set(item.id, { subtask: item, comments: [] }));
    (workspace?.comments || []).forEach((item) => {
      const key = item.subtask || "task";
      if (!map.has(key)) map.set(key, { subtask: null, comments: [] });
      map.get(key).comments.push(item);
    });
    return Array.from(map.values()).filter((group) => group.comments.length);
  }, [workspace?.comments, subtasks]);

  const stats = useMemo(() => {
    const total = subtasks.length;
    const done = subtasks.filter((item) => item.status === "done").length;
    const review = subtasks.filter((item) => item.status === "review").length;
    const overdue = workspace?.insights?.overdue_subtasks || 0;
    return { total, done, review, overdue };
  }, [subtasks, workspace?.insights]);

  const updateSubtaskStatus = async (subtaskId, statusValue) => {
    const previous = workspace;
    setWorkspace((current) => ({
      ...current,
      subtasks: current.subtasks.map((item) => item.id === subtaskId ? { ...item, status: statusValue } : item),
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
    if (subtasks.length > 1 && !selectedSubtaskId) {
      setError("Choose the subtask this comment belongs to.");
      return;
    }

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

  const openIssue = (subtask) => {
    setIssueFiles([]);
    setIssueDraft({
      subtaskId: subtask.id,
      subtaskTitle: subtask.title,
      title: "",
      description: "",
      priority: "medium",
    });
  };

  const submitIssue = async (event) => {
    event.preventDefault();
    if (!issueDraft?.title?.trim() || !issueDraft?.description?.trim()) return;
    const formData = new FormData();
    formData.append("title", issueDraft.title.trim());
    formData.append("description", issueDraft.description.trim());
    formData.append("priority", issueDraft.priority);
    formData.append("project", task.project_data.id);
    formData.append("task", task.id);
    formData.append("subtask", issueDraft.subtaskId);
    issueFiles.forEach((file) => formData.append("attachments", file));

    try {
      await api.post("/issues/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setIssueDraft(null);
      setIssueFiles([]);
      await loadWorkspace();
    } catch (err) {
      setError(err.response?.data?.message || "Could not raise issue.");
    }
  };

  const copyTaskLink = async () => {
    await navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  if (loading) return <Skeleton />;

  if (error && !workspace) {
    return <div className="tw-page"><div className="tw-error">{error}</div></div>;
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
          <div className="tw-eyebrow"><Sparkles size={13} /> Employee task workspace</div>
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
          <div className="tw-progress-ring"><span>{task.progress || 0}%</span></div>
          <div className="tw-progress-track"><span style={{ width: `${task.progress || 0}%` }} /></div>
          <div className="tw-badge-row"><StatusBadge status={task.status} /><PriorityBadge priority={task.priority} /></div>
          <div className="tw-readonly-note"><Lock size={13} /> Task details are read-only</div>
        </div>
      </section>

      <div className="tw-stats">
        <div className="tw-stat"><strong>{stats.total}</strong><span>Subtasks</span></div>
        <div className="tw-stat"><strong>{stats.done}</strong><span>Completed</span></div>
        <div className="tw-stat"><strong>{stats.review}</strong><span>In review</span></div>
        <div className="tw-stat"><strong>{workspace?.insights?.blockers_count || 0}</strong><span>Open blockers</span></div>
      </div>

      {focusedSubtask && (
        <section className={`tw-focus tw-glass ${canEditFocused ? "is-live" : "is-readonly"}`}>
          <div className="tw-focus-main">
            <div className="tw-focus-kicker">
              <span className="tw-live-dot" />
              {canEditFocused ? "Your active workspace" : "Subtask context"}
            </div>
            <h2>{focusedSubtask.title}</h2>
            <p>{focusedSubtask.description || "No subtask description provided."}</p>
            <div className="tw-focus-meta">
              <StatusBadge status={focusedSubtask.status} />
              <PriorityBadge priority={focusedSubtask.priority} />
              <span><CalendarDays size={13} /> {formatDate(focusedSubtask.due_date)}</span>
              <span><Users size={13} /> <AvatarStack users={focusedSubtask.assigned_users} /></span>
            </div>
            <div className="tw-focus-progress">
              <span style={{ width: focusedSubtask.status === "done" ? "100%" : focusedSubtask.status === "review" ? "75%" : focusedSubtask.status === "in_progress" ? "45%" : "12%" }} />
            </div>
          </div>

          <div className="tw-focus-actions">
            {STATUS_ACTIONS.map(([value, label]) => (
              <button key={value} disabled={!canEditFocused} type="button" onClick={() => updateSubtaskStatus(focusedSubtask.id, value)}>
                <CheckCircle2 size={15} />
                {label}
              </button>
            ))}
            <label className={`tw-file-button ${!canEditFocused ? "is-disabled" : ""}`}>
              <FileUp size={15} />
              Upload File
              <input type="file" disabled={!canEditFocused} onChange={(event) => uploadSubtaskFile(focusedSubtask.id, event.target.files?.[0])} />
            </label>
            <button disabled={!canEditFocused} type="button" onClick={() => openIssue(focusedSubtask)}>
              <Flag size={15} />
              Raise Blocker
            </button>
            <button type="button" onClick={copyTaskLink}>
              <Link size={15} />
              {copied ? "Copied" : "Copy Link"}
            </button>
          </div>

          <div className="tw-focus-grid">
            <div>
              <h3>Focused comments</h3>
              {focusedComments.slice(0, 3).map((item) => (
                <article key={item.id} className="tw-mini-comment">
                  <span className="tw-avatar">{initials(item.user_data)}</span>
                  <div><strong>{item.user_data?.name}</strong><p>{item.message}</p></div>
                </article>
              ))}
              {!focusedComments.length && <div className="tw-empty is-compact">No comments on this subtask yet.</div>}
            </div>
            <div>
              <h3>Evidence and blockers</h3>
              <div className="tw-focus-pills">
                <span><Paperclip size={13} /> {focusedSubtask.attachments?.length || 0} files</span>
                <span><AlertTriangle size={13} /> {focusedIssues.length} issues</span>
                <span><History size={13} /> {focusedActivity.length} updates</span>
              </div>
            </div>
          </div>
        </section>
      )}

      <main className="tw-shell">
        <section className="tw-main-column">
          <section className="tw-panel tw-glass">
            <div className="tw-panel-head is-sticky">
              <div><h2>Subtasks</h2><p>Pick a subtask to change focus. Assigned subtasks stay fully interactive.</p></div>
              <GitBranch size={18} />
            </div>
            <div className="tw-subtask-list">
              {subtasks.map((subtask) => {
                const isEditable = editableIds.has(subtask.id);
                const isFocused = focusedSubtask?.id === subtask.id;
                return (
                  <article
                    key={subtask.id}
                    ref={highlightedSubtaskId === subtask.id ? highlightedRef : null}
                    className={`tw-subtask ${isEditable ? "is-editable" : "is-locked"} ${isFocused ? "is-highlighted" : ""}`}
                   onClick={() => {
                      if (!isEditable) return;

                      setFocusSubtaskId(subtask.id);
                      navigate(`/workspace/subtask/${subtask.id}`);
                    }}
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
                      <div className="tw-subtask-badges"><PriorityBadge priority={subtask.priority} /><StatusBadge status={subtask.status} /></div>
                    </div>
                    <div className="tw-subtask-meta">
                      <span><CalendarDays size={13} /> {formatDate(subtask.due_date)}</span>
                      <span><MessageCircle size={13} /> {subtask.comments_count || 0}</span>
                      <span><Paperclip size={13} /> {subtask.attachments_count || 0}</span>
                      <AvatarStack users={subtask.assigned_users} />
                    </div>
                    <div className={isEditable ? "tw-action-row" : "tw-action-row is-blurred"}>
                      <select value={subtask.status} disabled={!isEditable} onClick={(event) => event.stopPropagation()} onChange={(event) => updateSubtaskStatus(subtask.id, event.target.value)}>
                        {Object.entries(STATUS_CONFIG).map(([value, cfg]) => <option key={value} value={value}>{cfg.label}</option>)}
                      </select>
                      <label className={`tw-file-button ${!isEditable ? "is-disabled" : ""}`} onClick={(event) => event.stopPropagation()}>
                        <FileUp size={14} /> Upload
                        <input type="file" disabled={!isEditable} onChange={(event) => uploadSubtaskFile(subtask.id, event.target.files?.[0])} />
                      </label>
                      <button type="button" disabled={!isEditable} onClick={(event) => { event.stopPropagation(); openIssue(subtask); }}>
                        <Flag size={14} /> Raise Issue
                      </button>
                    </div>
                    {!isEditable && <div className="tw-lock-overlay"><Lock size={15} /> Read-only subtask</div>}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="tw-panel tw-glass tw-collab-panel">
            <div className="tw-panel-head is-sticky">
              <div>
                <h2>Collaboration</h2>
                <p>Commenting on: <strong>{subtasks.find((item) => item.id === selectedSubtaskId)?.title || "Select a subtask"}</strong></p>
              </div>
              <MessageCircle size={18} />
            </div>

            <form className="tw-comment-form" onSubmit={submitComment}>
              <select value={selectedSubtaskId} required={subtasks.length > 1} onChange={(event) => setSelectedSubtaskId(event.target.value)}>
                <option value="" disabled={subtasks.length > 1}>Select subtask</option>
                {subtasks.map((subtask) => <option key={subtask.id} value={subtask.id}>{subtask.title}</option>)}
              </select>
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Share an update, blocker, or handoff note..." />
              <div className="tw-comment-actions">
                <button type="submit" disabled={submittingComment || !comment.trim()}><Send size={15} /> Comment</button>
              </div>
            </form>

            <div className="tw-comment-groups">
              {commentsBySubtask.map((group) => (
                <section key={group.subtask?.id || "task"} className="tw-comment-group">
                  <h3>{group.subtask?.title || "Task level comments"}</h3>
                  {group.comments.map((item) => (
                    <article key={item.id} className="tw-comment">
                      <span className="tw-avatar">{initials(item.user_data)}</span>
                      <div>
                        <div className="tw-comment-head">
                          <strong>{item.user_data?.name}</strong>
                          <span>{item.user_data?.role || "member"}</span>
                          <time>{formatRelative(item.created_at)}</time>
                          <em>Original</em>
                        </div>
                        {item.subtask_data && <span className="tw-linked-subtask">{item.subtask_data.title}</span>}
                        <p>{item.message}</p>
                      </div>
                    </article>
                  ))}
                </section>
              ))}
              {!workspace.comments?.length && <div className="tw-empty">No comments yet. Start with a focused handoff note.</div>}
            </div>
          </section>
        </section>

        <aside className="tw-side-column">
          <section className="tw-panel tw-glass">
            <div className="tw-panel-head"><div><h2>Project Context</h2><p>{task.project_data?.organization}</p></div><Layers size={18} /></div>
            <div className="tw-context-card">
              <strong>{task.project_data?.name}</strong>
              <p>{task.project_data?.description || "No project description available."}</p>
              <div className="tw-badge-row"><PriorityBadge priority={task.project_data?.priority} /><StatusBadge status={task.project_data?.status} /></div>
              <span><CalendarDays size={13} /> Deadline {formatDate(task.project_data?.due_date)}</span>
            </div>
          </section>

          <section className="tw-panel tw-glass">
            <div className="tw-panel-head"><div><h2>Team</h2><p>Assigned collaborators</p></div><Users size={18} /></div>
            <div className="tw-team-list">
              {(workspace.team || []).map((member) => (
                <article key={member.id} className="tw-team-member">
                  <span className="tw-avatar">{initials(member)}</span>
                  <div><strong>{member.name}</strong><small>{member.role} · {member.assigned_subtasks_count} subtasks</small></div>
                  <i className={`tw-presence is-${member.work_status || "available"}`} />
                </article>
              ))}
            </div>
          </section>

          <section className="tw-panel tw-glass">
            <div className="tw-panel-head"><div><h2>Task Files</h2><p>Manager and task-level files</p></div><Paperclip size={18} /></div>
            <div className="tw-file-list">
              {(workspace.attachments || []).map((file) => <FileCard key={file.id} file={file} label="Task attachment" source="Task Files" />)}
              {!workspace.attachments?.length && <div className="tw-empty is-compact">No task files.</div>}
            </div>
          </section>

          <section className="tw-panel tw-glass">
            <div className="tw-panel-head"><div><h2>Subtask Files</h2><p>Files stay grouped by subtask</p></div><Clipboard size={18} /></div>
            <div className="tw-subtask-files">
              {subtasks.map((subtask) => (
                <section key={subtask.id}>
                  <h3>{subtask.title}</h3>
                  {(subtask.attachments || []).map((file) => <FileCard key={file.id} file={file} source={subtask.title} />)}
                  {!subtask.attachments?.length && <div className="tw-empty is-compact">No files.</div>}
                </section>
              ))}
            </div>
          </section>

          <section className="tw-panel tw-glass">
            <div className="tw-panel-head"><div><h2>Issues</h2><p>Blockers and evidence</p></div><AlertTriangle size={18} /></div>
            <div className="tw-issue-list">
              {(workspace.issues || []).map((issue) => (
                <article key={issue.id} className="tw-issue">
                  <PriorityBadge priority={issue.priority} />
                  <strong>{issue.title}</strong>
                  <span>{issue.status} · {issue.attachments?.length || 0} files</span>
                </article>
              ))}
              {!workspace.issues?.length && <div className="tw-empty is-compact">No issues raised.</div>}
            </div>
          </section>

          <section className="tw-panel tw-glass">
            <div className="tw-panel-head">
              <div><h2>Activity</h2><p>Latest task timeline</p></div>
              <RouterLink to="/workspace/activity" className="tw-panel-action">View all</RouterLink>
            </div>
            <div className="tw-timeline">
              {activityPreview.map((activity) => (
                <article key={activity.id} className="tw-activity">
                  <span className="tw-activity-dot"><Circle size={9} /></span>
                  <div><strong>{activity.user_data?.name}</strong><p>{activity.message}</p><time><Clock3 size={12} /> {formatRelative(activity.created_at)}</time></div>
                </article>
              ))}
              {!activityPreview.length && <div className="tw-empty is-compact">No activity yet.</div>}
            </div>
          </section>
        </aside>
      </main>

      {issueDraft && (
        <div className="tw-modal-backdrop" onClick={() => setIssueDraft(null)}>
          <form className="tw-modal" onSubmit={submitIssue} onClick={(event) => event.stopPropagation()}>
            <h2>Raise Issue</h2>
            <p>{issueDraft.subtaskTitle}</p>
            <input value={issueDraft.title} onChange={(event) => setIssueDraft((draft) => ({ ...draft, title: event.target.value }))} placeholder="Issue title" />
            <textarea value={issueDraft.description} onChange={(event) => setIssueDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder="Describe the blocker" />
            <select value={issueDraft.priority} onChange={(event) => setIssueDraft((draft) => ({ ...draft, priority: event.target.value }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <div className="tw-dropzone" onClick={() => issueFileRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); setIssueFiles((files) => [...files, ...Array.from(event.dataTransfer.files || [])]); }}>
              <UploadCloud size={22} />
              <strong>Drop evidence here</strong>
              <span>Images, screenshots, logs, docs, PDFs, and videos</span>
              <input ref={issueFileRef} hidden multiple type="file" onChange={(event) => setIssueFiles((files) => [...files, ...Array.from(event.target.files || [])])} />
            </div>
            {issueFiles.length > 0 && (
              <div className="tw-draft-list">
                {issueFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="tw-draft-file">
                    <Paperclip size={14} /> {file.name}
                    <button type="button" onClick={() => setIssueFiles((files) => files.filter((_, itemIndex) => itemIndex !== index))}><X size={13} /></button>
                  </div>
                ))}
              </div>
            )}
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
