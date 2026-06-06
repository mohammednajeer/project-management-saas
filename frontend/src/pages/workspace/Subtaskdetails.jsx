import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Download,
  Eye,
  FileImage,
  FilePlus,
  FileText,
  FileUp,
  Flag,
  GitBranch,
  History,
  Layers,
  Lock,
  MessageCircle,
  Paperclip,
  Play,
  Send,
  Sparkles,
  Target,
  UploadCloud,
  UserRound,
  Users,
  X,
  Zap,
} from "lucide-react";

import api from "../../services/api";
import "./SubtaskDetails.css";

/* ─── CONSTANTS ──────────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  todo:        { label: "Todo",        color: "#8A87A0", bg: "#F2F0F8", border: "rgba(138,135,160,0.2)" },
  in_progress: { label: "In Progress", color: "#3B82F6", bg: "#EFF6FF", border: "rgba(59,130,246,0.2)"  },
  review:      { label: "Review",      color: "#8B5CF6", bg: "#F5F3FF", border: "rgba(139,92,246,0.2)"  },
  done:        { label: "Done",        color: "#16A34A", bg: "#F0FDF4", border: "rgba(22,163,74,0.2)"   },
};

const PRIORITY_CONFIG = {
  critical: { label: "Critical", color: "#DC2626", bg: "rgba(220,38,38,0.08)",   dot: "#DC2626" },
  high:     { label: "High",     color: "#F59E0B", bg: "rgba(245,158,11,0.08)",  dot: "#F59E0B" },
  medium:   { label: "Medium",   color: "#8B5CF6", bg: "rgba(139,92,246,0.08)",  dot: "#8B5CF6" },
  low:      { label: "Low",      color: "#8A87A0", bg: "rgba(138,135,160,0.08)", dot: "#B8B5CC" },
};

const STATUS_ACTIONS = [
  { value: "in_progress", label: "In Progress",    icon: Play         },
  { value: "review",      label: "Send to Review", icon: Eye          },
  { value: "done",        label: "Mark Done",      icon: CheckCircle2 },
];

const ACTIVITY_COLORS = {
  comment_added:   "#3B82F6",
  file_uploaded:   "#16A34A",
  status_changed:  "#8B5CF6",
  issue_created:   "#EF4444",
  subtask_updated: "#F59E0B",
};

const SECTIONS = [
  { key: "comments",    label: "Comments",    icon: MessageCircle },
  { key: "attachments", label: "Attachments", icon: Paperclip     },
  { key: "resources",   label: "Resources",   icon: FileText      },
  { key: "issues",      label: "Issues",      icon: AlertTriangle },
  { key: "activity",    label: "Activity",    icon: Activity      },
];

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
function formatDate(val) {
  if (!val) return "No date";
  return new Date(val).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatRelative(val) {
  if (!val) return "";
  const diff = Date.now() - new Date(val).getTime();
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

function initials(user) {
  const v = user?.name || user?.email || "U";
  return v.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

function statusProgress(status) {
  return { todo: 5, in_progress: 45, review: 75, done: 100 }[status] || 0;
}

/* ─── SMALL ATOMS ────────────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.todo;
  return (
    <span className="sd-badge" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const key = (priority || "low").toLowerCase();
  const cfg = PRIORITY_CONFIG[key] || PRIORITY_CONFIG.low;
  return (
    <span className="sd-badge" style={{ color: cfg.color, background: cfg.bg }}>
      <span className="sd-badge-dot" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function AvatarStack({ users = [], max = 4 }) {
  if (!users.length) return <span className="sd-muted-text">Unassigned</span>;
  return (
    <div className="sd-avatars">
      {users.slice(0, max).map(u => (
        <span key={u.id} className="sd-avatar" title={u.name || u.email}>
          {u.profile_picture
            ? <img src={u.profile_picture} alt="" />
            : initials(u)}
        </span>
      ))}
      {users.length > max && (
        <span className="sd-avatar sd-avatar--more">+{users.length - max}</span>
      )}
    </div>
  );
}

function FileCard({ file }) {
  const url  = file.file || file.file_url;
  const name = file.original_name || file.name || "File";
  const who  = file.uploaded_by_data?.name || file.user_data?.name || "Team";
  const isImg = isImageFile(url || name);
  return (
    <a className="sd-file-card" href={url} target="_blank" rel="noreferrer">
      <div className="sd-file-icon">
        {isImg ? <FileImage size={15} /> : <FileText size={15} />}
      </div>
      <div className="sd-file-body">
        <strong>{name}</strong>
        <small>{who} · {formatRelative(file.created_at || file.uploaded_at)} · {formatBytes(file.file_size)}</small>
      </div>
      {isImg && url && <img className="sd-file-thumb" src={url} alt={name} />}
      <Download size={13} className="sd-file-dl" />
    </a>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="sd-empty">
      <Icon size={26} />
      <p>{text}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="sd-page">
      <div className="sd-skel sd-skel--header" />
      <div className="sd-shell">
        <div className="sd-main-col">
          <div className="sd-skel sd-skel--block" />
          <div className="sd-skel sd-skel--block" style={{ height: 52 }} />
          <div className="sd-skel sd-skel--block" style={{ height: 320 }} />
        </div>
        <div className="sd-skel sd-skel--side" />
      </div>
    </div>
  );
}

/* ─── ISSUE MODAL ────────────────────────────────────────────────────────── */
function IssueModal({ subtask, task, project, onClose, onSuccess }) {
  const [form, setForm]         = useState({ title: "", description: "", priority: "medium" });
  const [files, setFiles]       = useState([]);
  const [submitting, setSub]    = useState(false);
  const [formError, setFormErr] = useState("");
  const dropRef = useRef();

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setSub(true);
    try {
      const fd = new FormData();
      fd.append("title",       form.title.trim());
      fd.append("description", form.description.trim());
      fd.append("priority",    form.priority);
      fd.append("project",     project?.id || "");
      fd.append("task",        task?.id || "");
      fd.append("subtask",     subtask?.id || "");
      files.forEach(f => fd.append("attachments", f));
      await api.post("/issues/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      onSuccess?.();
      onClose();
    } catch (err) {
      setFormErr(err.response?.data?.message || "Could not create issue.");
    } finally {
      setSub(false);
    }
  };

  const addFiles = (incoming) =>
    setFiles(prev => [...prev, ...Array.from(incoming || [])]);

  return (
    <div className="sd-modal-backdrop" onClick={onClose}>
      <form
        className="sd-modal"
        onSubmit={submit}
        onClick={e => e.stopPropagation()}
      >
        <div className="sd-modal-head">
          <div>
            <h2>Raise Issue</h2>
            <p>Linked to: <strong>{subtask?.title}</strong></p>
          </div>
          <button type="button" className="sd-icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {formError && <div className="sd-error-sm">{formError}</div>}

        <input
          className="sd-input"
          placeholder="Issue title"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          required
        />
        <textarea
          className="sd-textarea"
          placeholder="Describe the blocker or problem in detail…"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={4}
          required
        />
        <select
          className="sd-select"
          value={form.priority}
          onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
        >
          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <div
          className="sd-dropzone"
          ref={dropRef}
          onClick={() => dropRef.current?.querySelector("input")?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        >
          <UploadCloud size={22} />
          <strong>Drop evidence here</strong>
          <span>Screenshots · Logs · Images · PDFs</span>
          <input hidden multiple type="file" onChange={e => addFiles(e.target.files)} />
        </div>

        {files.length > 0 && (
          <div className="sd-draft-list">
            {files.map((f, i) => (
              <div key={`${f.name}-${i}`} className="sd-draft-file">
                <Paperclip size={12} />
                <span>{f.name}</span>
                <button
                  type="button"
                  onClick={() => setFiles(fl => fl.filter((_, j) => j !== i))}
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="sd-modal-actions">
          <button type="button" className="sd-btn sd-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="sd-btn sd-btn--danger" disabled={submitting}>
            {submitting ? "Creating…" : "Create Issue"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function SubtaskDetails() {
  const { subtaskId } = useParams();
  const navigate      = useNavigate();

  const [subtask,    setSubtask]    = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [comment,    setComment]    = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [uploadingFile,     setUploadingFile]     = useState(false);
  const [showIssueModal,    setShowIssueModal]    = useState(false);
  const [activeSection,     setActiveSection]     = useState("comments");

  /* ── Load ────────────────────────────────────────────────────────────── */
  const loadSubtask = useCallback(async () => {
    try {
      const [subtaskRes, attachRes] = await Promise.all([
        api.get(`/workspace/subtasks/${subtaskId}/`),
        api.get(`/tasks/subtasks/${subtaskId}/attachments/`),
      ]);
      setSubtask(subtaskRes.data);
      const raw = attachRes.data;
      setAttachments(Array.isArray(raw) ? raw : raw?.results || []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load subtask.");
    } finally {
      setLoading(false);
    }
  }, [subtaskId]);

  useEffect(() => { loadSubtask(); }, [loadSubtask]);

  /*
   * WebSocket integration point — connect to your existing WS infrastructure:
   *
   *   ws.on("subtask_comment_added", data => {
   *     if (String(data.subtask_id) === String(subtaskId)) {
   *       setSubtask(prev => ({
   *         ...prev,
   *         comments: [...(prev.comments || []), data.comment],
   *       }));
   *     }
   *   });
   *
   *   ws.on("subtask_status_changed", data => {
   *     if (String(data.subtask_id) === String(subtaskId)) {
   *       setSubtask(prev => ({ ...prev, status: data.status }));
   *     }
   *   });
   *
   *   ws.on("subtask_attachment_uploaded", data => {
   *     if (String(data.subtask_id) === String(subtaskId)) {
   *       setAttachments(prev => [data.attachment, ...prev]);
   *     }
   *   });
   *
   *   ws.on("subtask_issue_created", data => {
   *     if (String(data.subtask_id) === String(subtaskId)) {
   *       setSubtask(prev => ({
   *         ...prev,
   *         issues: [...(prev.issues || []), data.issue],
   *       }));
   *     }
   *   });
   */

  /* ── Status update (optimistic) ─────────────────────────────────────── */
  const updateStatus = useCallback(async (newStatus) => {
    const snapshot = subtask;
    setSubtask(s => ({ ...s, status: newStatus }));
    try {
      await api.patch(`/workspace/subtasks/${subtaskId}/`, { status: newStatus });
      // WS will push the activity; reload only to sync comments/activity
      await loadSubtask();
    } catch (err) {
      setSubtask(snapshot);
      setError(err.response?.data?.message || "Could not update status.");
    }
  }, [subtask, subtaskId, loadSubtask]);

  /* ── Comment ─────────────────────────────────────────────────────────── */
  const submitComment = useCallback(async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmittingComment(true);
    const taskId = subtask?.task_data?.id || subtask?.task;
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
      setSubmittingComment(false);
    }
  }, [comment, subtask, subtaskId, loadSubtask]);

  /* ── Upload ──────────────────────────────────────────────────────────── */
  const uploadFile = useCallback(async (file) => {
    if (!file) return;
    setUploadingFile(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api.post(
        `/tasks/subtasks/${subtaskId}/attachments/upload/`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      const res = await api.get(`/tasks/subtasks/${subtaskId}/attachments/`);
      const raw = res.data;
      setAttachments(Array.isArray(raw) ? raw : raw?.results || []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not upload file.");
    } finally {
      setUploadingFile(false);
    }
  }, [subtaskId]);

  /* ── Derived ─────────────────────────────────────────────────────────── */
  const task      = subtask?.task_data;
  const project   = subtask?.project_data;
  const comments  = useMemo(() => subtask?.comments  || [], [subtask]);
  const issues    = useMemo(() => subtask?.issues    || [], [subtask]);
  const activeIssuesCount = useMemo(() => {
    return issues.filter(i => i.status !== "resolved" && i.status !== "closed").length;
  }, [issues]);
  const issueAttachmentsCount = useMemo(() => {
    return issues.reduce((acc, issue) => acc + (issue.attachments?.length || 0), 0);
  }, [issues]);
  const activities= useMemo(() => subtask?.activities|| [], [subtask]);
  const siblings  = useMemo(() => subtask?.sibling_subtasks || [], [subtask]);
  const taskFiles = useMemo(
    () => subtask?.task_attachments || task?.attachments || [],
    [subtask, task]
  );
  const progress  = statusProgress(subtask?.status);

  const sectionCounts = {
    comments:    comments.length,
    attachments: attachments.length + issueAttachmentsCount,
    resources:   taskFiles.length,
    issues:      issues.length,
    activity:    activities.length,
  };

  /* ── Guards ──────────────────────────────────────────────────────────── */
  if (loading) return <Skeleton />;

  if (error && !subtask) {
    return (
      <div className="sd-page">
        <div className="sd-error-full">{error}</div>
      </div>
    );
  }

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="sd-page">

      {/* ═══════════════════════════════════════════════════════════════
          STICKY CONTEXT HEADER
          ═══════════════════════════════════════════════════════════════ */}
      <header className="sd-header sd-glass">

        {/* Breadcrumb */}
        <div className="sd-breadcrumb">
          <button className="sd-back-btn" onClick={() => navigate(-1)} title="Back">
            <ArrowLeft size={14} />
          </button>
          <span className="sd-crumb">{project?.name || "Project"}</span>
          <ChevronRight size={11} className="sd-crumb-sep" />
          <span className="sd-crumb">{task?.title || "Task"}</span>
          <ChevronRight size={11} className="sd-crumb-sep" />
          <span className="sd-crumb sd-crumb--current">{subtask?.title}</span>
        </div>

        {/* Main header row */}
        <div className="sd-header-body">
          <div className="sd-header-left">
            <div className="sd-eyebrow">
              <span className="sd-live-dot" />
              Employee Workspace
            </div>
            <h1 className="sd-header-title">{subtask?.title}</h1>
            <div className="sd-header-meta">
              <StatusBadge  status={subtask?.status} />
              <PriorityBadge priority={subtask?.priority} />
              <span className="sd-meta-pill">
                <CalendarDays size={11} />
                {formatDate(subtask?.due_date)}
              </span>
              <span className="sd-meta-pill">
                <Users size={11} />
                <AvatarStack users={subtask?.assigned_users || []} />
              </span>
              {activeIssuesCount > 0 && (
                <span className="sd-blocked-badge">
                  <AlertTriangle size={11} />
                  Blocked ({activeIssuesCount})
                </span>
              )}
            </div>
          </div>

          <div className="sd-header-right">
            {/* Progress bar */}
            <div className="sd-hdr-progress">
              <div className="sd-hdr-progress-labels">
                <span>Progress</span>
                <strong>{progress}%</strong>
              </div>
              <div className="sd-hdr-progress-track">
                <div
                  className="sd-hdr-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Quick status actions */}
            <div className="sd-hdr-actions">
              {STATUS_ACTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  className={`sd-hdr-action-btn ${subtask?.status === value ? "sd-hdr-action-btn--active" : ""}`}
                  onClick={() => updateStatus(value)}
                  disabled={subtask?.status === value}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {error && <div className="sd-error-inline">{error}</div>}

      {activeIssuesCount > 0 && (
        <div className="sd-blocked-banner">
          <AlertTriangle size={16} className="sd-blocked-banner-icon" />
          <div className="sd-blocked-banner-content">
            <strong>Blockage Alert:</strong> This subtask has {activeIssuesCount} active issue{activeIssuesCount > 1 ? "s" : ""} blocking progress. You can view details in the Issues tab below.
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MAIN SHELL
          ═══════════════════════════════════════════════════════════════ */}
      <div className="sd-shell">

        {/* ──────────────────── LEFT / MAIN COLUMN ─────────────────── */}
        <div className="sd-main-col">

          {/* ── Work Area ── */}
          <section className="sd-panel sd-glass sd-work-panel">
            <div className="sd-panel-head">
              <div>
                <h2>
                  <Sparkles size={14} className="sd-panel-head-icon" />
                  Work Area
                </h2>
                <p>{subtask?.description || "No description provided."}</p>
              </div>
              <span className="sd-status-live">
                <span className="sd-live-dot" />
                Active
              </span>
            </div>

            <div className="sd-work-actions">
              {STATUS_ACTIONS.map(({ value, label, icon: Icon }) => {
                const cfg    = STATUS_CONFIG[value];
                const active = subtask?.status === value;
                return (
                  <button
                    key={value}
                    className={`sd-work-btn ${active ? "sd-work-btn--current" : ""}`}
                    style={active
                      ? { background: cfg.bg, color: cfg.color, borderColor: cfg.border }
                      : {}}
                    onClick={() => updateStatus(value)}
                    disabled={active}
                  >
                    <Icon size={14} />
                    {label}
                    {active && <CheckCircle2 size={12} className="sd-work-check" />}
                  </button>
                );
              })}

              <label className={`sd-work-btn sd-work-btn--upload ${uploadingFile ? "sd-work-btn--busy" : ""}`}>
                <FileUp size={14} />
                {uploadingFile ? "Uploading…" : "Upload Work"}
                <input
                  type="file"
                  hidden
                  multiple
                  onChange={e => { uploadFile(e.target.files?.[0]); e.target.value = ""; }}
                />
              </label>

              <button
                className="sd-work-btn sd-work-btn--issue"
                onClick={() => setShowIssueModal(true)}
              >
                <Flag size={14} />
                Raise Issue
              </button>
            </div>
          </section>

          {/* ── Section Tabs ── */}
          <nav className="sd-tabs">
            {SECTIONS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                className={`sd-tab ${activeSection === key ? "sd-tab--active" : ""}`}
                onClick={() => setActiveSection(key)}
              >
                <Icon size={13} />
                {label}
                {sectionCounts[key] > 0 && (
                  <span className="sd-tab-count">{sectionCounts[key]}</span>
                )}
              </button>
            ))}
          </nav>

          {/* ── COMMENTS ── */}
          {activeSection === "comments" && (
            <section className="sd-panel sd-glass sd-anim">
              <div className="sd-panel-head">
                <div>
                  <h2><MessageCircle size={14} className="sd-panel-head-icon" /> Comments</h2>
                  <p>Subtask-specific discussion and updates</p>
                </div>
              </div>

              {/* Input */}
              <form className="sd-comment-form" onSubmit={submitComment}>
                <div className="sd-comment-row">
                  <div className="sd-avatar sd-avatar--me">Me</div>
                  <div className="sd-comment-field">
                    <textarea
                      className="sd-textarea-comment"
                      placeholder="Share an update, progress note, or handoff message…"
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      rows={3}
                      onKeyDown={e => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitComment(e);
                      }}
                    />
                    <div className="sd-comment-footer">
                      <span className="sd-comment-hint">Ctrl + Enter to submit</span>
                      <button
                        type="submit"
                        className="sd-btn sd-btn--primary"
                        disabled={submittingComment || !comment.trim()}
                      >
                        <Send size={13} />
                        {submittingComment ? "Posting…" : "Comment"}
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* List */}
              {comments.length === 0
                ? <EmptyState icon={MessageCircle} text="No comments yet. Start the discussion." />
                : (
                  <div className="sd-comment-list">
                    {comments.map(c => (
                      <article key={c.id} className="sd-comment">
                        <div className="sd-avatar sd-avatar--sm">{initials(c.user_data)}</div>
                        <div className="sd-comment-body">
                          <div className="sd-comment-head-row">
                            <strong>{c.user_data?.name || "Team Member"}</strong>
                            {c.user_data?.role && (
                              <span className="sd-role-pill">{c.user_data.role}</span>
                            )}
                            <time>{formatRelative(c.created_at)}</time>
                          </div>
                          <p>{c.message}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
            </section>
          )}

          {/* ── ATTACHMENTS ── */}
          {activeSection === "attachments" && (
            <div className="sd-attachments-view">
              <section className="sd-panel sd-glass sd-anim">
                <div className="sd-panel-head">
                  <div>
                    <h2><Paperclip size={14} className="sd-panel-head-icon" /> Subtask Attachments</h2>
                    <p>Files uploaded for this subtask only</p>
                  </div>
                  <label className="sd-upload-label">
                    <FilePlus size={13} />
                    Upload
                    <input
                      type="file"
                      hidden
                      multiple
                      onChange={e => { uploadFile(e.target.files?.[0]); e.target.value = ""; }}
                    />
                  </label>
                </div>

                {attachments.length === 0
                  ? <EmptyState icon={Paperclip} text="No attachments yet. Upload your work files here." />
                  : (
                    <div className="sd-file-list">
                      {attachments.map(f => <FileCard key={f.id} file={f} />)}
                    </div>
                  )}
              </section>

              {issues.some(issue => issue.attachments?.length > 0) && (
                <section className="sd-panel sd-glass sd-anim sd-issue-attachments-section" style={{ marginTop: "16px" }}>
                  <div className="sd-panel-head">
                    <div>
                      <h2><AlertTriangle size={14} className="sd-panel-head-icon" color="#DC2626" /> Issue Attachments</h2>
                      <p>Files attached to issues raised on this subtask</p>
                    </div>
                  </div>
                  <div className="sd-file-list">
                    {issues.flatMap(issue =>
                      (issue.attachments || []).map(f => (
                        <FileCard 
                          key={f.id} 
                          file={{
                            ...f,
                            original_name: `[Issue: ${issue.title}] ${f.original_name || f.name || "File"}`
                          }} 
                        />
                      ))
                    )}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ── TASK RESOURCES ── */}
          {activeSection === "resources" && (
            <section className="sd-panel sd-glass sd-anim">
              <div className="sd-panel-head">
                <div>
                  <h2><FileText size={14} className="sd-panel-head-icon" /> Task Resources</h2>
                  <p>Manager-uploaded documentation and references</p>
                </div>
                <span className="sd-readonly-badge">
                  <Lock size={11} /> Read Only
                </span>
              </div>

              {taskFiles.length === 0
                ? <EmptyState icon={FileText} text="No task resources uploaded by manager yet." />
                : (
                  <div className="sd-file-list">
                    {taskFiles.map(f => <FileCard key={f.id} file={f} />)}
                  </div>
                )}
            </section>
          )}

          {/* ── ISSUES ── */}
          {activeSection === "issues" && (
            <section className="sd-panel sd-glass sd-anim">
              <div className="sd-panel-head">
                <div>
                  <h2><AlertTriangle size={14} className="sd-panel-head-icon" /> Issues & Blockers</h2>
                  <p>Issues raised and linked to this subtask</p>
                </div>
                <button
                  className="sd-btn sd-btn--danger-soft"
                  onClick={() => setShowIssueModal(true)}
                >
                  <Flag size={13} /> Raise Issue
                </button>
              </div>

              {issues.length === 0
                ? <EmptyState icon={AlertTriangle} text="No issues raised. All clear!" />
                : (
                  <div className="sd-issue-list">
                    {issues.map(issue => (
                      <article key={issue.id} className="sd-issue-card">
                        <div className="sd-issue-header">
                          <PriorityBadge priority={issue.priority} />
                          <StatusBadge   status={issue.status} />
                          <time className="sd-issue-time">
                            {formatRelative(issue.created_at)}
                          </time>
                        </div>
                        <strong className="sd-issue-title">{issue.title}</strong>
                        {issue.description && (
                          <p className="sd-issue-desc">{issue.description}</p>
                        )}
                        {issue.attachments?.length > 0 && (
                          <span className="sd-meta-pill" style={{ marginTop: 4 }}>
                            <Paperclip size={11} />
                            {issue.attachments.length} file{issue.attachments.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </article>
                    ))}
                  </div>
                )}
            </section>
          )}

          {/* ── ACTIVITY ── */}
          {activeSection === "activity" && (
            <section className="sd-panel sd-glass sd-anim">
              <div className="sd-panel-head">
                <div>
                  <h2><History size={14} className="sd-panel-head-icon" /> Activity Timeline</h2>
                  <p>All updates and changes for this subtask</p>
                </div>
              </div>

              {activities.length === 0
                ? <EmptyState icon={Activity} text="No activity recorded yet." />
                : (
                  <div className="sd-timeline">
                    {activities.map((item) => {
                      const color = ACTIVITY_COLORS[item.type]
                        || ACTIVITY_COLORS[item.action]
                        || "#6C53B3";
                      return (
                        <article key={item.id} className="sd-tl-item">
                          <div className="sd-tl-spine" />
                          <div className="sd-tl-dot" style={{ background: color }}>
                            <Circle size={5} />
                          </div>
                          <div className="sd-tl-body">
                            <div className="sd-tl-head">
                              <div className="sd-tl-avatar">{initials(item.user_data)}</div>
                              <strong>{item.user_data?.name || "System"}</strong>
                              <time>{formatRelative(item.created_at)}</time>
                            </div>
                            <p>{item.message}</p>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
            </section>
          )}
        </div>

        {/* ──────────────────── RIGHT SIDEBAR ──────────────────────── */}
        <aside className="sd-sidebar">

          {/* ── Related / Sibling Subtasks ── */}
          <section className="sd-panel sd-glass">
            <div className="sd-panel-head">
              <div>
                <h2><GitBranch size={13} className="sd-panel-head-icon" /> Related Subtasks</h2>
                <p>Siblings in this task</p>
              </div>
            </div>

            {siblings.length === 0
              ? <p className="sd-sb-empty">No sibling subtasks.</p>
              : (
                <div className="sd-siblings">
                  {siblings.map(sib => {
                    const isCurrent = String(sib.id) === String(subtaskId);
                    const cfg = STATUS_CONFIG[sib.status] || STATUS_CONFIG.todo;
                    const prog = statusProgress(sib.status);
                    return (
                      <div
                        key={sib.id}
                        className={`sd-sibling ${isCurrent ? "sd-sibling--current" : "sd-sibling--muted"}`}
                      >
                        {isCurrent && <div className="sd-sibling-glow" />}
                        {!isCurrent && <Lock size={10} className="sd-sibling-lock" />}
                        <div className="sd-sibling-body">
                          <span className="sd-sibling-title">{sib.title}</span>
                          <div className="sd-sibling-meta">
                            <span className="sd-sibling-status" style={{ color: cfg.color }}>
                              {cfg.label}
                            </span>
                            <div className="sd-sibling-bar">
                              <div
                                className="sd-sibling-fill"
                                style={{ width: `${prog}%`, background: cfg.color }}
                              />
                            </div>
                            <span className="sd-sibling-pct">{prog}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </section>

          {/* ── Project / Task Context ── */}
          <section className="sd-panel sd-glass">
            <div className="sd-panel-head">
              <div>
                <h2><Layers size={13} className="sd-panel-head-icon" /> Project Context</h2>
              </div>
            </div>

            <div className="sd-ctx">
              <div className="sd-ctx-project">
                <div className="sd-ctx-icon">
                  <Target size={15} />
                </div>
                <div className="sd-ctx-project-body">
                  <strong>{project?.name || "—"}</strong>
                  <p>{project?.description || "No description."}</p>
                </div>
              </div>

              <div className="sd-ctx-badges">
                <StatusBadge   status={project?.status} />
                <PriorityBadge priority={project?.priority} />
              </div>

              <div className="sd-ctx-row">
                <CalendarDays size={12} />
                <span>Deadline {formatDate(project?.due_date)}</span>
              </div>

              <div className="sd-ctx-divider" />

              <div className="sd-ctx-task">
                <span className="sd-ctx-label">Parent Task</span>
                <strong className="sd-ctx-task-title">{task?.title}</strong>
                <div className="sd-ctx-task-bar">
                  <div
                    className="sd-ctx-task-fill"
                    style={{ width: `${task?.progress || 0}%` }}
                  />
                </div>
                <span className="sd-ctx-pct">{task?.progress || 0}% complete</span>
              </div>
            </div>
          </section>

          {/* ── Assigned Team ── */}
          {(subtask?.assigned_users?.length > 0) && (
            <section className="sd-panel sd-glass">
              <div className="sd-panel-head">
                <div>
                  <h2><Users size={13} className="sd-panel-head-icon" /> Assigned Team</h2>
                </div>
              </div>
              <div className="sd-team">
                {subtask.assigned_users.map(u => (
                  <div key={u.id} className="sd-team-member">
                    <div className="sd-team-avatar">
                      {u.profile_picture
                        ? <img src={u.profile_picture} alt="" />
                        : initials(u)}
                    </div>
                    <div className="sd-team-body">
                      <strong>{u.name || u.email}</strong>
                      <small>{u.role || "member"}</small>
                    </div>
                    <span className="sd-presence" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Issue shortcut ── */}
          <section className="sd-panel sd-glass sd-issue-cta">
            <Flag size={18} className="sd-issue-cta-icon" />
            <div>
              <strong>Facing a blocker?</strong>
              <p>Raise an issue to alert your manager.</p>
            </div>
            <button
              className="sd-btn sd-btn--danger-soft sd-issue-cta-btn"
              onClick={() => setShowIssueModal(true)}
            >
              Raise Issue
            </button>
          </section>
        </aside>
      </div>

      {/* ── Issue Modal ── */}
      {showIssueModal && (
        <IssueModal
          subtask={subtask}
          task={task}
          project={project}
          onClose={() => setShowIssueModal(false)}
          onSuccess={() => loadSubtask()}
        />
      )}
    </div>
  );
}