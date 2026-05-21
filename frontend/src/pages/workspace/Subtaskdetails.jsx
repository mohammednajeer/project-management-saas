import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Eye,
  FileImage,
  FileBadge,
  FileText,
  FileUp,
  Flag,
  History,
  Layers,
  Lock,
  MessageCircle,
  Paperclip,
  Send,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  UploadCloud,
  UserRound,
  Users,
  X,
  Zap,
} from "lucide-react";

import api from "../../services/api";
import "./SubtaskDetails.css";

/* ─── CONSTANTS ───────────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  todo:        { label: "Todo",        color: "#8A87A0", bg: "rgba(138,135,160,0.10)", border: "rgba(138,135,160,0.22)" },
  in_progress: { label: "In Progress", color: "#3B82F6", bg: "rgba(59,130,246,0.10)",  border: "rgba(59,130,246,0.22)"  },
  review:      { label: "Review",      color: "#8B5CF6", bg: "rgba(139,92,246,0.10)",  border: "rgba(139,92,246,0.22)"  },
  done:        { label: "Done",        color: "#16A34A", bg: "rgba(22,163,74,0.10)",   border: "rgba(22,163,74,0.22)"   },
};

const PRIORITY_CONFIG = {
  critical: { label: "Critical", color: "#DC2626", bg: "rgba(220,38,38,0.09)",  dot: "#DC2626" },
  high:     { label: "High",     color: "#F59E0B", bg: "rgba(245,158,11,0.09)", dot: "#F59E0B" },
  medium:   { label: "Medium",   color: "#8B5CF6", bg: "rgba(139,92,246,0.09)", dot: "#8B5CF6" },
  low:      { label: "Low",      color: "#8A87A0", bg: "rgba(138,135,160,0.09)",dot: "#B8B5CC" },
};

const STATUS_ACTIONS = [
  { value: "in_progress", label: "Mark In Progress", icon: Zap,          color: "#3B82F6" },
  { value: "review",      label: "Send to Review",   icon: Eye,          color: "#8B5CF6" },
  { value: "done",        label: "Mark Done",        icon: CheckCircle2, color: "#16A34A" },
];

const ACTIVITY_ICONS = {
  comment_added:    MessageCircle,
  file_uploaded:    Paperclip,
  status_changed:   TrendingUp,
  issue_created:    AlertTriangle,
  subtask_updated:  CheckCircle2,
};

const ACTIVITY_COLORS = {
  comment_added:   "#3B82F6",
  file_uploaded:   "#16A34A",
  status_changed:  "#8B5CF6",
  issue_created:   "#EF4444",
  subtask_updated: "#6C53B3",
};

/* ─── HELPERS ─────────────────────────────────────────────────────────────── */
function formatDate(value) {
  if (!value) return "No date";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatRelative(value) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatBytes(bytes) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes, unit = 0;
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit++; }
  return `${size.toFixed(unit ? 1 : 0)} ${units[unit]}`;
}

function isImageFile(name = "") {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);
}

function isPdfFile(name = "") {
  return /\.pdf$/i.test(name);
}

function initials(user) {
  const val = user?.name || user?.email || "U";
  return val.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

function progressFromStatus(status) {
  return { todo: 5, in_progress: 45, review: 75, done: 100 }[status] || 5;
}

/* ─── SUB-COMPONENTS ──────────────────────────────────────────────────────── */
function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.todo;
  return (
    <span className="sd-pill" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
      {cfg.label}
    </span>
  );
}

function PriorityPill({ priority }) {
  const key = (priority || "low").toLowerCase();
  const cfg = PRIORITY_CONFIG[key] || PRIORITY_CONFIG.low;
  return (
    <span className="sd-pill" style={{ color: cfg.color, background: cfg.bg, borderColor: "transparent" }}>
      <span className="sd-dot" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function Avatar({ user, size = 28 }) {
  if (!user) return null;
  return (
    <span
      className="sd-avatar"
      title={user.name || user.email}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {user.profile_picture
        ? <img src={user.profile_picture} alt="" />
        : initials(user)}
    </span>
  );
}

function AvatarGroup({ users = [], max = 4 }) {
  if (!users.length) return <span className="sd-muted-text">Unassigned</span>;
  return (
    <div className="sd-avatar-group">
      {users.slice(0, max).map(u => <Avatar key={u.id} user={u} size={26} />)}
      {users.length > max && <span className="sd-avatar sd-avatar-more" style={{ width: 26, height: 26 }}>+{users.length - max}</span>}
    </div>
  );
}

function FileCard({ file }) {
  const name = file.original_name || file.file?.split("/").pop() || "Attachment";
  const url  = file.file;
  const isImg = isImageFile(name || url || "");
  const isPdf = isPdfFile(name || url || "");

  return (
    <a className="sd-file-card" href={url} target="_blank" rel="noreferrer">
      <div className="sd-file-icon">
        {isImg ? <FileImage size={16} /> : isPdf ? <FileBadge size={16} /> : <FileText size={16} />}
      </div>
      <div className="sd-file-body">
        <strong>{name}</strong>
        <span>
          {file.uploaded_by_data?.name || file.user_data?.name || "Uploaded"}
          {file.created_at && ` · ${formatRelative(file.created_at)}`}
          {file.file_size && ` · ${formatBytes(file.file_size)}`}
        </span>
      </div>
      {isImg && url && (
        <img className="sd-file-thumb" src={url} alt={name} loading="lazy" />
      )}
    </a>
  );
}

function Skeleton() {
  return (
    <div className="sd-page">
      <div className="sd-skeleton sd-sk-header" />
      <div className="sd-layout">
        <div className="sd-skeleton sd-sk-main" />
        <div className="sd-skeleton sd-sk-side" />
      </div>
    </div>
  );
}

/* ─── SIBLING SUBTASK CARD ────────────────────────────────────────────────── */
function SiblingCard({ subtask, isCurrent, onClick }) {
  const pct = progressFromStatus(subtask.status);
  const cfg = STATUS_CONFIG[subtask.status] || STATUS_CONFIG.todo;
  return (
    <button
      className={`sd-sibling ${isCurrent ? "sd-sibling--active" : ""}`}
      onClick={onClick}
      type="button"
    >
      {!isCurrent && <Lock size={10} className="sd-sibling-lock" />}
      {isCurrent && <span className="sd-sibling-live" />}
      <div className="sd-sibling-body">
        <p className="sd-sibling-title">{subtask.title}</p>
        <div className="sd-sibling-progress">
          <div className="sd-sibling-bar">
            <div className="sd-sibling-bar-fill" style={{ width: `${pct}%`, background: cfg.color }} />
          </div>
          <span style={{ color: cfg.color }}>{pct}%</span>
        </div>
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function SubtaskDetails() {
  const { subtaskId } = useParams();
  const navigate = useNavigate();

  const [subtask,      setSubtask]      = useState(null);
  const [attachments,  setAttachments]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [comment,      setComment]      = useState("");
  const [commenting,   setCommenting]   = useState(false);
  const [issueDraft,   setIssueDraft]   = useState(null);
  const [issueFiles,   setIssueFiles]   = useState([]);
  const [uploading,    setUploading]    = useState(false);

  const issueFileRef  = useRef(null);
  const uploadFileRef = useRef(null);

  /* ── Fetch ──────────────────────────────────────────────────────────── */
  const loadSubtask = useCallback(async () => {
    try {
      const [stRes, attRes] = await Promise.all([
        api.get(`/workspace/subtasks/${subtaskId}/`),
        api.get(`/tasks/subtasks/${subtaskId}/attachments/`),
      ]);
      setSubtask(stRes.data);
      setAttachments(Array.isArray(attRes.data) ? attRes.data : attRes.data?.results || []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load subtask.");
    } finally {
      setLoading(false);
    }
  }, [subtaskId]);

  useEffect(() => { loadSubtask(); }, [loadSubtask]);

  /* ── Status update ─────────────────────────────────────────────────── */
  const updateStatus = useCallback(async (newStatus) => {
    const prev = subtask;
    setSubtask(s => ({ ...s, status: newStatus }));
    try {
      await api.patch(`/workspace/subtasks/${subtaskId}/`, { status: newStatus });
      await loadSubtask();
    } catch {
      setSubtask(prev);
    }
  }, [subtask, subtaskId, loadSubtask]);

  /* ── Comment ────────────────────────────────────────────────────────── */
  const submitComment = useCallback(async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setCommenting(true);
    const taskId = subtask?.task?.id || subtask?.task;
    try {
      await api.post(`/tasks/comments/${taskId}/`, {
        message: comment.trim(),
        subtask: subtaskId,
      });
      setComment("");
      await loadSubtask();
    } catch (err) {
      setError(err.response?.data?.message || "Could not post comment.");
    } finally {
      setCommenting(false);
    }
  }, [comment, subtask, subtaskId, loadSubtask]);

  /* ── Upload ─────────────────────────────────────────────────────────── */
  const uploadFile = useCallback(async (file) => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api.post(`/tasks/subtasks/${subtaskId}/attachments/upload/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await loadSubtask();
      const attRes = await api.get(`/tasks/subtasks/${subtaskId}/attachments/`);
      setAttachments(Array.isArray(attRes.data) ? attRes.data : attRes.data?.results || []);
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }, [subtaskId, loadSubtask]);

  /* ── Issue ──────────────────────────────────────────────────────────── */
  const submitIssue = useCallback(async (e) => {
    e.preventDefault();
    if (!issueDraft?.title?.trim() || !issueDraft?.description?.trim()) return;
    const fd = new FormData();
    fd.append("title",       issueDraft.title.trim());
    fd.append("description", issueDraft.description.trim());
    fd.append("priority",    issueDraft.priority);
    fd.append("project",     subtask?.task?.project?.id || subtask?.task?.project_data?.id || "");
    fd.append("task",        subtask?.task?.id || subtask?.task || "");
    fd.append("subtask",     subtaskId);
    issueFiles.forEach(f => fd.append("attachments", f));
    try {
      await api.post("/issues/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setIssueDraft(null);
      setIssueFiles([]);
      await loadSubtask();
    } catch (err) {
      setError(err.response?.data?.message || "Could not raise issue.");
    }
  }, [issueDraft, issueFiles, subtask, subtaskId, loadSubtask]);

  /* ── Derived ────────────────────────────────────────────────────────── */
  const progress = useMemo(() => progressFromStatus(subtask?.status), [subtask?.status]);

  const comments    = useMemo(() => subtask?.comments    || [], [subtask]);
  const issues      = useMemo(() => subtask?.issues      || [], [subtask]);
  const activities  = useMemo(() => subtask?.activities  || [], [subtask]);
  const siblings    = useMemo(() => subtask?.sibling_subtasks || [], [subtask]);
  const taskResources = useMemo(() => subtask?.task_attachments || [], [subtask]);

  const statusCfg   = STATUS_CONFIG[subtask?.status]  || STATUS_CONFIG.todo;

  /* ── Guards ─────────────────────────────────────────────────────────── */
  if (loading) return <Skeleton />;

  if (error && !subtask) {
    return (
      <div className="sd-page">
        <div className="sd-error-banner">{error}</div>
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="sd-page">

      {/* ── BACK BUTTON ────────────────────────────────────────── */}
      <button className="sd-back" type="button" onClick={() => {
            if (subtask?.task?.id) {
                navigate(`/workspace/task/${subtask.task.id}`);
            } else {
                navigate(-1);
            }
            }}>
        <ArrowLeft size={14} />
        My Work
      </button>

      {error && <div className="sd-error-banner sd-error-inline">{error}</div>}

      {/* ── STICKY CONTEXT HEADER ──────────────────────────────── */}
      <header className="sd-header sd-glass">
        <div className="sd-header-breadcrumb">
          <Layers size={11} />
          <span>{subtask?.task?.project?.name || subtask?.task?.project_data?.name || "Project"}</span>
          <span className="sd-breadcrumb-sep">/</span>
          <span>{subtask?.task?.title || "Task"}</span>
          <span className="sd-breadcrumb-sep">/</span>
          <span className="sd-breadcrumb-active">{subtask?.title}</span>
        </div>
        <div className="sd-header-main">
          <div className="sd-header-left">
            <h1 className="sd-header-title">{subtask?.title}</h1>
            <div className="sd-header-meta">
              <StatusPill status={subtask?.status} />
              <PriorityPill priority={subtask?.priority} />
              <span className="sd-meta-chip">
                <CalendarDays size={11} />
                {formatDate(subtask?.due_date)}
              </span>
              <AvatarGroup users={subtask?.assigned_users || []} />
            </div>
          </div>
          <div className="sd-header-right">
            <div className="sd-header-progress">
              <div
                className="sd-header-progress-ring"
                style={{ "--progress": progress, "--color": statusCfg.color }}
              >
                <svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="28" cy="28" r="23" className="sd-ring-track" />
                  <circle
                    cx="28" cy="28" r="23"
                    className="sd-ring-fill"
                    style={{ strokeDashoffset: `${144.51 - (progress / 100) * 144.51}`, stroke: statusCfg.color }}
                  />
                </svg>
                <span>{progress}%</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN LAYOUT ────────────────────────────────────────── */}
      <div className="sd-layout">

        {/* ══ LEFT / MAIN ══════════════════════════════════════════ */}
        <main className="sd-main">

          {/* ACTION AREA */}
          <section className="sd-section sd-glass sd-workspace">
            <div className="sd-workspace-kicker">
              <span className="sd-live-dot" />
              Your focused workspace
            </div>
            <h2 className="sd-workspace-title">{subtask?.title}</h2>
            {subtask?.description && (
              <p className="sd-workspace-desc">{subtask.description}</p>
            )}

            {/* Progress bar */}
            <div className="sd-workspace-progress-wrap">
              <div className="sd-workspace-progress-track">
                <div
                  className="sd-workspace-progress-fill"
                  style={{ width: `${progress}%`, background: statusCfg.color }}
                />
              </div>
              <span style={{ color: statusCfg.color }}>{progress}%</span>
            </div>

            {/* Action buttons */}
            <div className="sd-actions">
              {STATUS_ACTIONS.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  className={`sd-action-btn ${subtask?.status === value ? "sd-action-btn--active" : ""}`}
                  style={{ "--btn-color": color }}
                  onClick={() => updateStatus(value)}
                  type="button"
                  disabled={subtask?.status === value}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}

              <label className={`sd-action-btn sd-action-btn--upload ${uploading ? "sd-action-btn--loading" : ""}`}>
                <FileUp size={14} />
                {uploading ? "Uploading…" : "Upload Work"}
                <input
                  ref={uploadFileRef}
                  type="file"
                  hidden
                  disabled={uploading}
                  onChange={e => uploadFile(e.target.files?.[0])}
                />
              </label>

              <button
                className="sd-action-btn sd-action-btn--issue"
                onClick={() => setIssueDraft({ title: "", description: "", priority: "medium" })}
                type="button"
              >
                <ShieldAlert size={14} />
                Raise Issue
              </button>
            </div>

            {/* Quick stats */}
            <div className="sd-workspace-stats">
              <div className="sd-ws-stat">
                <MessageCircle size={13} />
                <span>{comments.length} comment{comments.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="sd-ws-stat">
                <Paperclip size={13} />
                <span>{attachments.length} file{attachments.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="sd-ws-stat">
                <AlertTriangle size={13} />
                <span>{issues.length} issue{issues.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </section>

          {/* COMMENTS */}
          <section className="sd-section sd-glass">
            <div className="sd-section-head">
              <div>
                <h2 className="sd-section-title">Comments</h2>
                <p className="sd-section-sub">Collaborate on this subtask</p>
              </div>
              <MessageCircle size={17} className="sd-section-icon" />
            </div>

            {/* Comment form */}
            <form className="sd-comment-form" onSubmit={submitComment}>
              <textarea
                className="sd-comment-input"
                placeholder="Add a comment, update, or handoff note…"
                value={comment}
                rows={3}
                onChange={e => setComment(e.target.value)}
              />
              <div className="sd-comment-form-footer">
                <button
                  type="submit"
                  className="sd-submit-btn"
                  disabled={commenting || !comment.trim()}
                >
                  <Send size={13} />
                  {commenting ? "Sending…" : "Comment"}
                </button>
              </div>
            </form>

            {/* Comment list */}
            <div className="sd-comment-list">
              {comments.length === 0 && (
                <div className="sd-empty">No comments yet. Start the conversation.</div>
              )}
              {comments.map(c => (
                <article key={c.id} className="sd-comment">
                  <Avatar user={c.user_data} size={32} />
                  <div className="sd-comment-body">
                    <div className="sd-comment-head">
                      <strong>{c.user_data?.name || "Member"}</strong>
                      <span className="sd-comment-role">{c.user_data?.role || "member"}</span>
                      <time>{formatRelative(c.created_at)}</time>
                    </div>
                    <p>{c.message}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* SUBTASK ATTACHMENTS */}
          <section className="sd-section sd-glass">
            <div className="sd-section-head">
              <div>
                <h2 className="sd-section-title">Your Attachments</h2>
                <p className="sd-section-sub">Files uploaded to this subtask</p>
              </div>
              <Paperclip size={17} className="sd-section-icon" />
            </div>

            {attachments.length === 0 ? (
              <div className="sd-empty">No attachments uploaded yet.</div>
            ) : (
              <div className="sd-file-grid">
                {attachments.map(f => <FileCard key={f.id} file={f} />)}
              </div>
            )}

            <label className="sd-upload-zone">
              <UploadCloud size={20} />
              <strong>Drop files here or click to upload</strong>
              <span>Images, screenshots, PDFs, logs</span>
              <input
                type="file"
                hidden
                multiple
                disabled={uploading}
                onChange={e => {
                  const files = Array.from(e.target.files || []);
                  files.forEach(f => uploadFile(f));
                }}
              />
            </label>
          </section>

          {/* TASK RESOURCES (read-only) */}
          {taskResources.length > 0 && (
            <section className="sd-section sd-glass sd-resources">
              <div className="sd-section-head">
                <div>
                  <h2 className="sd-section-title">Task Resources</h2>
                  <p className="sd-section-sub">Manager-uploaded docs &amp; references — read only</p>
                </div>
                <Lock size={15} className="sd-section-icon" />
              </div>
              <div className="sd-file-grid">
                {taskResources.map(f => <FileCard key={f.id} file={f} />)}
              </div>
            </section>
          )}

          {/* ACTIVITY TIMELINE */}
          <section className="sd-section sd-glass">
            <div className="sd-section-head">
              <div>
                <h2 className="sd-section-title">Activity</h2>
                <p className="sd-section-sub">Subtask timeline</p>
              </div>
              <History size={17} className="sd-section-icon" />
            </div>

            {activities.length === 0 ? (
              <div className="sd-empty">No activity recorded yet.</div>
            ) : (
              <div className="sd-timeline">
                {activities.map((act, i) => {
                  const type = act.type || act.action || "subtask_updated";
                  const Icon = ACTIVITY_ICONS[type] || Circle;
                  const color = ACTIVITY_COLORS[type] || "#6C53B3";
                  return (
                    <article key={act.id || i} className="sd-timeline-item">
                      <div className="sd-timeline-connector">
                        <span className="sd-timeline-dot" style={{ background: color, boxShadow: `0 0 0 4px ${color}22` }}>
                          <Icon size={9} />
                        </span>
                        {i < activities.length - 1 && <span className="sd-timeline-line" />}
                      </div>
                      <div className="sd-timeline-body">
                        <div className="sd-timeline-head">
                          <Avatar user={act.user_data} size={22} />
                          <strong>{act.user_data?.name || "System"}</strong>
                          <time><Clock3 size={10} />{formatRelative(act.created_at)}</time>
                        </div>
                        <p>{act.message}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

        </main>

        {/* ══ RIGHT SIDEBAR ════════════════════════════════════════ */}
        <aside className="sd-sidebar">

          {/* RELATED SUBTASKS */}
          {siblings.length > 0 && (
            <section className="sd-panel sd-glass">
              <div className="sd-panel-head">
                <h3 className="sd-panel-title">Related Subtasks</h3>
                <Target size={14} className="sd-section-icon" />
              </div>
              <div className="sd-sibling-list">
                {siblings.map(s => (
                  <SiblingCard
                    key={s.id}
                    subtask={s}
                    isCurrent={s.id === subtaskId || s.id === parseInt(subtaskId)}
                    onClick={() => navigate(`/workspace/subtask/${s.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* PROJECT / TASK CONTEXT */}
          <section className="sd-panel sd-glass">
            <div className="sd-panel-head">
              <h3 className="sd-panel-title">Project Context</h3>
              <Layers size={14} className="sd-section-icon" />
            </div>
            <div className="sd-context-block">
              <div className="sd-context-row">
                <span className="sd-context-label">Project</span>
                <span className="sd-context-val">
                  {subtask?.task?.project?.name || subtask?.task?.project_data?.name || "—"}
                </span>
              </div>
              <div className="sd-context-row">
                <span className="sd-context-label">Task</span>
                <span className="sd-context-val">{subtask?.task?.title || "—"}</span>
              </div>
              <div className="sd-context-row">
                <span className="sd-context-label">Task Status</span>
                <StatusPill status={subtask?.task?.status} />
              </div>
              <div className="sd-context-row">
                <span className="sd-context-label">Task Due</span>
                <span className="sd-context-val">{formatDate(subtask?.task?.due_date)}</span>
              </div>
              {subtask?.task?.project_data?.description && (
                <p className="sd-context-desc">{subtask.task.project_data.description}</p>
              )}
            </div>
          </section>

          {/* TEAM */}
          {subtask?.task?.assigned_users?.length > 0 && (
            <section className="sd-panel sd-glass">
              <div className="sd-panel-head">
                <h3 className="sd-panel-title">Team</h3>
                <Users size={14} className="sd-section-icon" />
              </div>
              <div className="sd-team-list">
                {subtask.task.assigned_users.map(u => (
                  <div key={u.id} className="sd-team-member">
                    <Avatar user={u} size={30} />
                    <div className="sd-team-body">
                      <strong>{u.name || u.email}</strong>
                      <small>{u.role || "member"}</small>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* OPEN ISSUES */}
          {issues.length > 0 && (
            <section className="sd-panel sd-glass">
              <div className="sd-panel-head">
                <h3 className="sd-panel-title">Issues</h3>
                <Flag size={14} style={{ color: "#EF4444" }} />
              </div>
              <div className="sd-issue-list">
                {issues.map(issue => (
                  <div key={issue.id} className="sd-issue-card">
                    <PriorityPill priority={issue.priority} />
                    <strong>{issue.title}</strong>
                    <span className="sd-issue-status">{issue.status}</span>
                    {issue.description && <p>{issue.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* RAISE ISSUE PANEL */}
          <section className="sd-panel sd-glass sd-raise-panel">
            <div className="sd-panel-head">
              <h3 className="sd-panel-title">Raise Issue</h3>
              <ShieldAlert size={14} style={{ color: "#EF4444" }} />
            </div>
            <p className="sd-raise-desc">
              Blocked? Report a blocker, bug, or dependency directly from this subtask.
            </p>
            <button
              className="sd-raise-btn"
              type="button"
              onClick={() => setIssueDraft({ title: "", description: "", priority: "medium" })}
            >
              <Flag size={13} />
              Report Issue
            </button>
          </section>

        </aside>
      </div>

      {/* ── ISSUE MODAL ────────────────────────────────────────── */}
      {issueDraft && (
        <div className="sd-modal-backdrop" onClick={() => setIssueDraft(null)}>
          <form
            className="sd-modal"
            onSubmit={submitIssue}
            onClick={e => e.stopPropagation()}
          >
            <div className="sd-modal-header">
              <h2>Raise Issue</h2>
              <button type="button" className="sd-modal-close" onClick={() => setIssueDraft(null)}>
                <X size={15} />
              </button>
            </div>
            <p className="sd-modal-sub">Auto-linked to this subtask, task, and project</p>

            <input
              className="sd-modal-input"
              placeholder="Issue title"
              required
              value={issueDraft.title}
              onChange={e => setIssueDraft(d => ({ ...d, title: e.target.value }))}
            />

            <textarea
              className="sd-modal-textarea"
              placeholder="Describe the blocker, bug, or issue in detail…"
              required
              rows={4}
              value={issueDraft.description}
              onChange={e => setIssueDraft(d => ({ ...d, description: e.target.value }))}
            />

            <select
              className="sd-modal-select"
              value={issueDraft.priority}
              onChange={e => setIssueDraft(d => ({ ...d, priority: e.target.value }))}
            >
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
              <option value="critical">Critical</option>
            </select>

            <div
              className="sd-dropzone"
              onClick={() => issueFileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                setIssueFiles(prev => [...prev, ...Array.from(e.dataTransfer.files || [])]);
              }}
            >
              <UploadCloud size={20} />
              <strong>Attach evidence</strong>
              <span>Screenshots, logs, PDFs, images</span>
              <input
                ref={issueFileRef}
                type="file"
                multiple
                hidden
                onChange={e => setIssueFiles(prev => [...prev, ...Array.from(e.target.files || [])])}
              />
            </div>

            {issueFiles.length > 0 && (
              <div className="sd-file-chips">
                {issueFiles.map((f, i) => (
                  <div key={i} className="sd-file-chip">
                    <Paperclip size={11} />
                    <span>{f.name}</span>
                    <button type="button" onClick={() => setIssueFiles(prev => prev.filter((_, idx) => idx !== i))}>
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="sd-modal-actions">
              <button type="button" className="sd-modal-cancel" onClick={() => setIssueDraft(null)}>
                Cancel
              </button>
              <button type="submit" className="sd-modal-submit">
                <Flag size={13} />
                Create Issue
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}