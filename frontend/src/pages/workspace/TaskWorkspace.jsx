import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileImage,
  FileText,
  Flag,
  GitBranch,
  Hash,
  Layers,
  Lock,
  MessageCircle,
  Paperclip,
  Send,
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
import "./TaskWorkspace.css";

/* ─── CONSTANTS ──────────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  todo:        { label: "Todo",        color: "#B45309", bg: "#fbe1d1", border: "rgba(180,83,9,0.18)",  accent: "#D4835E" },
  in_progress: { label: "In Progress", color: "#1E3A8A", bg: "#d3e3fc", border: "rgba(30,58,138,0.18)",   accent: "#5B8CB8" },
  review:      { label: "Review",      color: "#5B21B6", bg: "#e8def8", border: "rgba(91,33,182,0.18)",  accent: "#8B7BA8" },
  done:        { label: "Done",        color: "#166534", bg: "#d8f3dc", border: "rgba(22,101,52,0.18)",   accent: "#3D9A5F" },
};

const PRIORITY_CONFIG = {
  critical: { label: "Critical", color: "#991B1B", bg: "#f8d7da",  border: "rgba(153,27,27,0.2)",   dot: "#A34A30",  cardTint: "rgba(248,215,218,0.6)"  },
  high:     { label: "High",     color: "#854D0E", bg: "#fff3cd",  border: "rgba(133,77,14,0.2)",   dot: "#D4835E",  cardTint: "rgba(255,243,205,0.6)"  },
  medium:   { label: "Medium",   color: "#1E3A8A", bg: "#d3e3fc",  border: "rgba(30,58,138,0.2)",  dot: "#5B8CB8",  cardTint: "rgba(211,227,252,0.5)"  },
  low:      { label: "Low",      color: "#374151", bg: "#F1F5F9",  border: "rgba(55,65,81,0.15)", dot: "#94A3B8",  cardTint: "rgba(241,245,249,0.5)"  },
};

const CARD_PALETTE = {
  todo:        "#fbe1d1",
  in_progress: "#d3e3fc",
  review:      "#e8def8",
  done:        "#d8f3dc",
};

const ACTIVITY_COLORS = {
  comment_added:   "#3B82F6",
  file_uploaded:   "#059669",
  status_changed:  "#7C3AED",
  issue_created:   "#EF4444",
  subtask_updated: "#F59E0B",
};

/* ─── HELPERS ────────────────────────────────────────────────────────────── */
function fmt(val) {
  if (!val) return "No date";
  return new Date(val).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function rel(val) {
  if (!val) return "";
  const d = Date.now() - new Date(val).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtBytes(b) {
  if (!b) return "";
  const u = ["B", "KB", "MB", "GB"];
  let s = b, i = 0;
  while (s >= 1024 && i < u.length - 1) { s /= 1024; i++; }
  return `${s.toFixed(i ? 1 : 0)} ${u[i]}`;
}

function isImg(name = "") { return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name); }

function initials(u) {
  const v = u?.name || u?.email || "U";
  return v.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

function statusProgress(s) {
  return { todo: 8, in_progress: 45, review: 75, done: 100 }[s] || 8;
}

/* ─── ATOMS ──────────────────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.todo;
  return (
    <span className="tw-status-badge" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
      <span className="tw-badge-dot" style={{ background: cfg.accent }} />
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const k   = (priority || "low").toLowerCase();
  const cfg = PRIORITY_CONFIG[k] || PRIORITY_CONFIG.low;
  return (
    <span className="tw-priority-badge" style={{ color: cfg.color, background: cfg.bg }}>
      <span className="tw-badge-dot" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

function AvatarStack({ users = [], max = 4 }) {
  if (!users.length) return <span className="tw-unassigned">Unassigned</span>;
  return (
    <div className="tw-avatars">
      {users.slice(0, max).map(u => (
        <span key={u.id} className="tw-avatar" title={u.name || u.email}>
          {u.profile_picture ? <img src={u.profile_picture} alt="" /> : initials(u)}
        </span>
      ))}
      {users.length > max && (
        <span className="tw-avatar tw-avatar--more">+{users.length - max}</span>
      )}
    </div>
  );
}

function FileChip({ file }) {
  const url  = file.file || file.file_url;
  const name = file.original_name || file.name || "File";
  return (
    <a className="tw-file-chip" href={url} target="_blank" rel="noreferrer" title={name}>
      {isImg(url || name) ? <FileImage size={13} /> : <FileText size={13} />}
      <span>{name}</span>
      <small>{fmtBytes(file.file_size)}</small>
    </a>
  );
}

function Skeleton() {
  return (
    <div className="tw-page">
      <div className="tw-skel tw-skel--hero" />
      <div className="tw-skel-row">
        {[1, 2, 3, 4].map(i => <div key={i} className="tw-skel tw-skel--stat" />)}
      </div>
      <div className="tw-skel-shell">
        <div className="tw-skel tw-skel--main" />
        <div className="tw-skel tw-skel--side" />
      </div>
    </div>
  );
}

/* ─── ISSUE MODAL ────────────────────────────────────────────────────────── */
function IssueModal({ subtask, task, onClose, onSuccess }) {
  const [form,  setForm]  = useState({ title: "", description: "", priority: "medium" });
  const [files, setFiles] = useState([]);
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState("");
  const dropRef = useRef();

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title",       form.title.trim());
      fd.append("description", form.description.trim());
      fd.append("priority",    form.priority);
      fd.append("project",     task?.project_data?.id || "");
      fd.append("task",        task?.id || "");
      fd.append("subtask",     subtask?.id || "");
      files.forEach(f => fd.append("attachments", f));
      await api.post("/issues/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      onSuccess?.();
      onClose();
    } catch (err) {
      setErr(err.response?.data?.message || "Could not create issue.");
    } finally {
      setBusy(false);
    }
  };

  const addFiles = list => setFiles(prev => [...prev, ...Array.from(list || [])]);

  return (
    <div className="tw-modal-backdrop" onClick={onClose}>
      <form className="tw-modal" onSubmit={submit} onClick={e => e.stopPropagation()}>
        <div className="tw-modal-head">
          <div>
            <h2>Raise Issue</h2>
            <p>Linked to: <strong>{subtask?.title}</strong></p>
          </div>
          <button type="button" className="tw-icon-btn" onClick={onClose}><X size={15} /></button>
        </div>

        {err && <div className="tw-modal-err">{err}</div>}

        <input
          className="tw-field"
          placeholder="Issue title"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          required
        />
        <textarea
          className="tw-field tw-field--ta"
          placeholder="Describe the blocker or issue in detail…"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={4}
          required
        />
        <select
          className="tw-field tw-field--select"
          value={form.priority}
          onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
        >
          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <div
          className="tw-dropzone"
          ref={dropRef}
          onClick={() => dropRef.current?.querySelector("input")?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        >
          <UploadCloud size={20} />
          <strong>Drop evidence here</strong>
          <span>Screenshots · Logs · Images · PDFs</span>
          <input hidden multiple type="file" onChange={e => addFiles(e.target.files)} />
        </div>

        {files.length > 0 && (
          <div className="tw-draft-list">
            {files.map((f, i) => (
              <div key={`${f.name}-${i}`} className="tw-draft-file">
                <Paperclip size={11} />
                <span>{f.name}</span>
                <button type="button" onClick={() => setFiles(fl => fl.filter((_, j) => j !== i))}>
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="tw-modal-footer">
          <button type="button" className="tw-btn tw-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="tw-btn tw-btn--danger" disabled={busy}>
            {busy ? "Creating…" : "Create Issue"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT — Mission Control Hub
   ═══════════════════════════════════════════════════════════════════════════ */
export default function TaskWorkspace() {
  const { taskId }         = useParams();
  const navigate           = useNavigate();
  const [searchParams]     = useSearchParams();
  const highlightedId      = searchParams.get("subtask");

  const [workspace,    setWorkspace]    = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [comment,      setComment]      = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [issueDraft,   setIssueDraft]   = useState(null);  // { subtask }
  const [activeTab,    setActiveTab]    = useState("overview"); // overview | comments | files | activity

  /* ── Load ────────────────────────────────────────────────────────────── */
  const loadWorkspace = useCallback(async () => {
    try {
      setError("");
      const res = await api.get(`/workspace/task/${taskId}/`);
      setWorkspace(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load this workspace.");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

  /*
   * WebSocket integration point — plug into your existing WS infrastructure:
   *
   *   ws.on("subtask_status_changed", data => {
   *     if (String(data.task_id) === String(taskId)) {
   *       setWorkspace(prev => ({
   *         ...prev,
   *         subtasks: prev.subtasks.map(s =>
   *           String(s.id) === String(data.subtask_id) ? { ...s, status: data.status } : s
   *         ),
   *       }));
   *     }
   *   });
   *
   *   ws.on("task_comment_added", data => {
   *     if (String(data.task_id) === String(taskId)) {
   *       setWorkspace(prev => ({
   *         ...prev,
   *         comments: [...(prev.comments || []), data.comment],
   *       }));
   *     }
   *   });
   *
   *   ws.on("issue_created", data => {
   *     if (String(data.task_id) === String(taskId)) loadWorkspace();
   *   });
   */

  /* ── Derived ─────────────────────────────────────────────────────────── */
  const task         = workspace?.task;
  const subtasks     = workspace?.subtasks    || [];
  const taskFiles    = workspace?.attachments || [];
  const issues       = workspace?.issues      || [];

  const editableIds  = useMemo(() => new Set(workspace?.permissions?.editable_subtasks || []), [workspace?.permissions?.editable_subtasks]);
  const taskComments = useMemo(() => (workspace?.comments  || []).filter(c => !c.subtask), [workspace]);
  const allActivity  = useMemo(() => (workspace?.activities || []).slice(0, 8), [workspace]);

  const activeIssues = useMemo(() => {
    const issuesList = workspace?.issues || [];
    return issuesList.filter(i => i.status !== "resolved" && i.status !== "closed");
  }, [workspace?.issues]);

  const stats = useMemo(() => {
    const subtasksList = workspace?.subtasks || [];
    const issuesList   = workspace?.issues || [];
    const total   = subtasksList.length;
    const done    = subtasksList.filter(s => s.status === "done").length;
    const inProg  = subtasksList.filter(s => s.status === "in_progress").length;
    const review  = subtasksList.filter(s => s.status === "review").length;
    const pct     = total > 0 ? Math.round((done / total) * 100) : 0;
    const blockers = issuesList.filter(i => i.status !== "resolved").length;
    return { total, done, inProg, review, blockers, pct };
  }, [workspace?.subtasks, workspace?.issues]);

  /* ── Status update (optimistic) ─────────────────────────────────────── */
  // eslint-disable-next-line no-unused-vars
  const updateStatus = async (subtaskId, newStatus) => {
    const snap = workspace;
    setWorkspace(prev => ({
      ...prev,
      subtasks: prev.subtasks.map(s => s.id === subtaskId ? { ...s, status: newStatus } : s),
    }));
    try {
      await api.patch(`/workspace/subtasks/${subtaskId}/`, { status: newStatus });
    } catch (err) {
      setWorkspace(snap);
      setError(err.response?.data?.message || "Could not update status.");
    }
  };

  /* ── Comment ─────────────────────────────────────────────────────────── */
  const submitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/tasks/comments/${taskId}/`, { message: comment.trim(), subtask: null });
      setComment("");
      await loadWorkspace();
    } catch (err) {
      setError(err.response?.data?.message || "Could not post comment.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Navigation ──────────────────────────────────────────────────────── */
  const openSubtask = (subtask) => {
    if (!editableIds.has(subtask.id)) return;
    navigate(`/workspace/subtask/${subtask.id}`);
  };

  /* ─────────────────────────────────────────────────────────────────────── */
  if (loading) return <Skeleton />;

  if (error && !workspace) {
    return (
      <div className="tw-page">
        <div className="tw-error-banner">{error}</div>
      </div>
    );
  }

  const circ = 2 * Math.PI * 30;

  return (
    <div className="tw-page">

      {/* ── Back nav ── */}
      <button className="tw-back-btn" onClick={() => navigate(-1)}>
        <ArrowLeft size={14} />
        My Work
      </button>

      {error && <div className="tw-error-inline">{error}</div>}

      {activeIssues.length > 0 && (
        <div className="tw-blocked-banner">
          <AlertTriangle size={16} className="tw-blocked-banner-icon" />
          <div className="tw-blocked-banner-content">
            <strong>Blockage Alert:</strong> This workspace has {activeIssues.length} active issue{activeIssues.length > 1 ? "s" : ""} blocking progress.
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          HERO — Premium task context header
          ════════════════════════════════════════════════════════════════ */}
      <header className="tw-hero">
        <div className="tw-hero-body">
          <div className="tw-hero-eyebrow">
            <span className="tw-live-dot" />
            <Sparkles size={11} />
            Employee Workspace
          </div>

          <h1 className="tw-hero-title">{task?.title}</h1>

          {task?.description && (
            <p className="tw-hero-desc">{task.description}</p>
          )}

          <div className="tw-hero-meta">
            <span className="tw-meta-chip">
              <Layers size={11} />
              {task?.project_data?.name || "—"}
            </span>
            <span className="tw-meta-chip">
              <CalendarDays size={11} />
              Due {fmt(task?.due_date)}
            </span>
            <span className="tw-meta-chip">
              <UserRound size={11} />
              {task?.created_by_data?.name || "Manager"}
            </span>
            <StatusBadge   status={task?.status} />
            <PriorityBadge priority={task?.priority} />
          </div>

          {/* Team avatars */}
          <div className="tw-hero-team">
            <AvatarStack users={workspace?.team || []} max={6} />
            {workspace?.team?.length > 0 && (
              <span className="tw-hero-team-label">{workspace.team.length} collaborators</span>
            )}
          </div>
        </div>

        {/* Progress ring */}
        <div className="tw-hero-ring">
          <svg width="76" height="76" viewBox="0 0 76 76">
            <defs>
              <linearGradient id="tw-ring-g" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#d3e3fc" />
                <stop offset="100%" stopColor="#e8def8" />
              </linearGradient>
            </defs>
            <circle cx="38" cy="38" r="30" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="6" />
            <circle
              cx="38" cy="38" r="30"
              fill="none"
              stroke="url(#tw-ring-g)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ - (stats.pct / 100) * circ}
              transform="rotate(-90 38 38)"
              className="tw-ring-animated"
            />
          </svg>
          <div className="tw-ring-label">
            <span className="tw-ring-pct">{stats.pct}</span>
            <span className="tw-ring-unit">%</span>
          </div>
          <p className="tw-ring-caption">Complete</p>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════
          QUICK STATS ROW
          ════════════════════════════════════════════════════════════════ */}
      <div className="tw-stats-row">
        {[
          { value: stats.total,   label: "Total Subtasks",  color: "#6366F1", bg: "#EEF2FF", icon: GitBranch   },
          { value: stats.inProg,  label: "In Progress",     color: "#2563EB", bg: "#EFF6FF", icon: Zap          },
          { value: stats.review,  label: "In Review",       color: "#7C3AED", bg: "#F5F3FF", icon: Target       },
          { value: stats.done,    label: "Completed",       color: "#059669", bg: "#ECFDF5", icon: CheckCircle2 },
          { value: stats.blockers,label: "Open Issues",     color: "#DC2626", bg: "#FEF2F2", icon: AlertTriangle},
        ].map(({ value, label, color, bg, icon: Icon }) => (
          <div key={label} className="tw-stat-chip" style={{ "--sc": color, "--sb": bg }}>
            <div className="tw-stat-icon"><Icon size={14} /></div>
            <div className="tw-stat-body">
              <span className="tw-stat-value">{value}</span>
              <span className="tw-stat-label">{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          MAIN SHELL — 2-col layout
          ════════════════════════════════════════════════════════════════ */}
      <div className="tw-shell">

        {/* ── LEFT: main content ── */}
        <div className="tw-main-col">

          {/* Section tabs */}
          <nav className="tw-tabs">
            {[
              { key: "overview",  label: "Subtasks",  icon: GitBranch    },
              { key: "comments",  label: "Comments",  icon: MessageCircle, count: taskComments.length },
              { key: "files",     label: "Files",     icon: Paperclip,     count: taskFiles.length    },
              { key: "activity",  label: "Activity",  icon: TrendingUp,    count: allActivity.length  },
            ].map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                className={`tw-tab ${activeTab === key ? "tw-tab--active" : ""}`}
                onClick={() => setActiveTab(key)}
              >
                <Icon size={12} />
                {label}
                {count > 0 && (
                  <span className="tw-tab-count">{count}</span>
                )}
              </button>
            ))}
          </nav>

          {/* ── OVERVIEW: Subtask cards ── */}
          {activeTab === "overview" && (
            <div className="tw-overview-grid tw-anim">
              {subtasks.length === 0 && (
                <div className="tw-empty-state">
                  <GitBranch size={28} />
                  <p>No subtasks in this workspace yet.</p>
                </div>
              )}

              {subtasks.map(sub => {
                const isEditable = editableIds.has(sub.id);
                const isHighlighted = String(sub.id) === String(highlightedId);
                const pal  = CARD_PALETTE[sub.status] || CARD_PALETTE.todo;
                const sCfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.todo;
                const isBlocked = issues.some(
                  i => String(i.subtask) === String(sub.id) && i.status !== "resolved" && i.status !== "closed"
                );

                return (
                  <article
                    key={sub.id}
                    className={`tw-sub-card ${isEditable ? "tw-sub-card--mine" : "tw-sub-card--locked"} ${isHighlighted ? "tw-sub-card--highlighted" : ""}`}
                    style={isEditable ? {
                      background: pal,
                    } : {}}
                    onClick={() => openSubtask(sub)}
                    role="button"
                    tabIndex={isEditable ? 0 : -1}
                    onKeyDown={e => e.key === "Enter" && openSubtask(sub)}
                  >

                    {/* Lock overlay for non-editable */}
                    {!isEditable && (
                      <div className="tw-sub-lock">
                        <Lock size={11} />
                        Read Only
                      </div>
                    )}

                    {/* Badge Container */}
                    {(isEditable || isBlocked) && (
                      <div className="tw-sub-badge-container">
                        {isEditable && (
                          <div className="tw-sub-mine-badge">
                            <span className="tw-live-dot tw-live-dot--sm" />
                            Assigned to you
                          </div>
                        )}
                        {isBlocked && (
                          <div className="tw-sub-blocked-badge">
                            <AlertTriangle size={9} />
                            Blocked
                          </div>
                        )}
                      </div>
                    )}

                    {/* Title */}
                    <h3 className="tw-sub-title">{sub.title}</h3>

                    {sub.description && (
                      <p className="tw-sub-desc">{sub.description}</p>
                    )}

                    {/* Badges */}
                    <div className="tw-sub-badges">
                      <StatusBadge   status={sub.status} />
                      <PriorityBadge priority={sub.priority} />
                    </div>

                    {/* Progress bar */}
                    <div className="tw-sub-progress">
                      <div className="tw-sub-progress-fill"
                        style={{ width: `${statusProgress(sub.status)}%`, background: sCfg.accent }}
                      />
                    </div>

                    {/* Footer */}
                    <div className="tw-sub-footer">
                      <div className="tw-sub-meta">
                        <span className="tw-sub-date">
                          <CalendarDays size={10} />
                          {fmt(sub.due_date)}
                        </span>
                        <AvatarStack users={sub.assigned_users || []} max={3} />
                      </div>
                      <div className="tw-sub-counts">
                        {sub.comments_count > 0 && (
                          <span className="tw-count-chip">
                            <MessageCircle size={9} />
                            {sub.comments_count}
                          </span>
                        )}
                        {sub.attachments_count > 0 && (
                          <span className="tw-count-chip">
                            <Paperclip size={9} />
                            {sub.attachments_count}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Open CTA */}
                    {isEditable && (
                      <div className="tw-sub-cta">
                        <span>Open workspace</span>
                        <ArrowRight size={12} />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {/* ── COMMENTS ── */}
          {activeTab === "comments" && (
            <div className="tw-section tw-anim">
              <div className="tw-section-head">
                <h2>
                  <MessageCircle size={14} />
                  Task Discussion
                </h2>
                <p>Broad team updates and coordination. Subtask-specific comments live on each subtask.</p>
              </div>

              {/* Input */}
              <form className="tw-comment-form" onSubmit={submitComment}>
                <div className="tw-comment-input-row">
                  <div className="tw-comment-avatar">Me</div>
                  <div className="tw-comment-field">
                    <textarea
                      className="tw-comment-ta"
                      placeholder="Share a status update, question, or announcement…"
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      rows={3}
                      onKeyDown={e => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitComment(e);
                      }}
                    />
                    <div className="tw-comment-actions-row">
                      <span className="tw-comment-hint">Ctrl+Enter to post</span>
                      <button
                        type="submit"
                        className="tw-btn tw-btn--primary"
                        disabled={submitting || !comment.trim()}
                      >
                        <Send size={12} />
                        {submitting ? "Posting…" : "Post"}
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Comment list */}
              {taskComments.length === 0 ? (
                <div className="tw-empty-state">
                  <MessageCircle size={26} />
                  <p>No task-level comments yet. Start the conversation.</p>
                </div>
              ) : (
                <div className="tw-comment-list">
                  {taskComments.map(c => (
                    <article key={c.id} className="tw-comment">
                      <div className="tw-comment-ava">{initials(c.user_data)}</div>
                      <div className="tw-comment-body">
                        <div className="tw-comment-meta-row">
                          <strong>{c.user_data?.name || "Team Member"}</strong>
                          {c.user_data?.role && (
                            <span className="tw-role-tag">{c.user_data.role}</span>
                          )}
                          <time>{rel(c.created_at)}</time>
                        </div>
                        <p>{c.message}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── FILES ── */}
          {activeTab === "files" && (
            <div className="tw-section tw-anim">
              <div className="tw-section-head">
                <h2><Paperclip size={14} /> Task Resources</h2>
                <p>Manager-uploaded documentation, references, and requirements. Read-only.</p>
              </div>

              {taskFiles.length === 0 ? (
                <div className="tw-empty-state">
                  <Paperclip size={26} />
                  <p>No resources uploaded yet.</p>
                </div>
              ) : (
                <div className="tw-file-grid">
                  {taskFiles.map(f => <FileChip key={f.id} file={f} />)}
                </div>
              )}

              {/* Subtask file summary */}
              {subtasks.some(s => (s.attachments_count || 0) > 0) && (
                <div className="tw-section-sub-head">
                  <h3>Subtask Files</h3>
                  <p>Upload files directly inside each subtask workspace.</p>
                </div>
              )}
              <div className="tw-subtask-file-rows">
                {subtasks.filter(s => (s.attachments_count || 0) > 0).map(s => (
                  <div key={s.id} className="tw-sf-row">
                    <Hash size={11} />
                    <span className="tw-sf-title">{s.title}</span>
                    <span className="tw-sf-count">
                      <Paperclip size={10} />
                      {s.attachments_count} file{s.attachments_count !== 1 ? "s" : ""}
                    </span>
                    {editableIds.has(s.id) && (
                      <button
                        className="tw-sf-open"
                        onClick={() => navigate(`/workspace/subtask/${s.id}`)}
                      >
                        Open <ArrowRight size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── ACTIVITY ── */}
          {activeTab === "activity" && (
            <div className="tw-section tw-anim">
              <div className="tw-section-head">
                <h2><TrendingUp size={14} /> Activity Timeline</h2>
                <p>All task and subtask updates across the workspace.</p>
              </div>

              {allActivity.length === 0 ? (
                <div className="tw-empty-state">
                  <TrendingUp size={26} />
                  <p>No activity recorded yet.</p>
                </div>
              ) : (
                <div className="tw-timeline">
                  {allActivity.map((item) => {
                    const color = ACTIVITY_COLORS[item.type] || ACTIVITY_COLORS[item.action] || "#6366F1";
                    return (
                      <article key={item.id} className="tw-tl-item">
                        <div className="tw-tl-spine" />
                        <div className="tw-tl-dot" style={{ background: color }} />
                        <div className="tw-tl-body">
                          <div className="tw-tl-row">
                            <div className="tw-tl-ava">{initials(item.user_data)}</div>
                            <strong>{item.user_data?.name || "System"}</strong>
                            <time>{rel(item.created_at)}</time>
                          </div>
                          <p>{item.message}</p>
                          {item.subtask_data?.title && (
                            <span className="tw-tl-subtask-tag">
                              <Hash size={9} />
                              {item.subtask_data.title}
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <aside className="tw-sidebar">

          {/* ── Project Context ── */}
          <section className="tw-panel">
            <div className="tw-panel-head">
              <Layers size={13} className="tw-panel-icon" />
              <h3>Project</h3>
            </div>
            <div className="tw-project-ctx">
              <strong>{task?.project_data?.name}</strong>
              {task?.project_data?.description && (
                <p>{task.project_data.description}</p>
              )}
              <div className="tw-ctx-badges">
                <StatusBadge   status={task?.project_data?.status} />
                <PriorityBadge priority={task?.project_data?.priority} />
              </div>
              <div className="tw-ctx-row">
                <CalendarDays size={11} />
                <span>Deadline {fmt(task?.project_data?.due_date)}</span>
              </div>
            </div>
          </section>

          {/* ── Subtask progress bars ── */}
          <section className="tw-panel">
            <div className="tw-panel-head">
              <GitBranch size={13} className="tw-panel-icon" />
              <h3>Subtask Progress</h3>
            </div>
            <div className="tw-sb-progress-list">
              {Object.entries(STATUS_CONFIG).map(([k, v]) => {
                const count  = subtasks.filter(s => s.status === k).length;
                const pct    = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={k} className="tw-sb-prog-row">
                    <span className="tw-sb-prog-label" style={{ color: v.color }}>{v.label}</span>
                    <div className="tw-sb-prog-track">
                      <div className="tw-sb-prog-fill"
                        style={{ width: `${pct}%`, background: v.accent }}
                      />
                    </div>
                    <span className="tw-sb-prog-count">{count}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Team ── */}
          {(workspace?.team?.length > 0) && (
            <section className="tw-panel">
              <div className="tw-panel-head">
                <Users size={13} className="tw-panel-icon" />
                <h3>Team</h3>
              </div>
              <div className="tw-team-list">
                {workspace.team.map(member => (
                  <div key={member.id} className="tw-team-row">
                    <div className="tw-team-ava">
                      {member.profile_picture
                        ? <img src={member.profile_picture} alt="" />
                        : initials(member)}
                    </div>
                    <div className="tw-team-info">
                      <strong>{member.name}</strong>
                      <small>{member.role} · {member.assigned_subtasks_count || 0} subtasks</small>
                    </div>
                    <span className={`tw-presence tw-presence--${member.work_status || "available"}`} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Open Issues ── */}
          {issues.length > 0 && (
            <section className="tw-panel tw-panel--warn">
              <div className="tw-panel-head">
                <AlertTriangle size={13} style={{ color: "#DC2626" }} />
                <h3 style={{ color: "#DC2626" }}>Open Issues</h3>
                <span className="tw-issues-count">{issues.filter(i => i.status !== "resolved").length}</span>
              </div>
              <div className="tw-issues-list">
                {issues.slice(0, 4).map(issue => (
                  <div key={issue.id} className="tw-issue-row">
                    <PriorityBadge priority={issue.priority} />
                    <span className="tw-issue-title">{issue.title}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Recent Activity ── */}
          <section className="tw-panel">
            <div className="tw-panel-head">
              <Clock3 size={13} className="tw-panel-icon" />
              <h3>Recent</h3>
              <RouterLink to="/workspace/activity" className="tw-panel-link">All</RouterLink>
            </div>
            {allActivity.slice(0, 4).length === 0 ? (
              <p className="tw-panel-empty">No recent activity.</p>
            ) : (
              <div className="tw-mini-feed">
                {allActivity.slice(0, 4).map(item => {
                  const color = ACTIVITY_COLORS[item.type] || ACTIVITY_COLORS[item.action] || "#6366F1";
                  return (
                    <div key={item.id} className="tw-feed-item">
                      <span className="tw-feed-dot" style={{ background: color }} />
                      <div className="tw-feed-body">
                        <p>{item.message}</p>
                        <time>{rel(item.created_at)}</time>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Raise Issue shortcut ── */}
          <section className="tw-panel tw-panel--cta">
            <Flag size={16} className="tw-cta-icon" />
            <div>
              <strong>Have a blocker?</strong>
              <p>Open a subtask and raise an issue directly from your workspace.</p>
            </div>
            <RouterLink to="/workspace/my-tasks" className="tw-btn tw-btn--ghost tw-btn--sm">
              <ExternalLink size={11} />
              My Tasks
            </RouterLink>
          </section>

        </aside>
      </div>

      {/* ── Issue Modal ── */}
      {issueDraft && (
        <IssueModal
          subtask={issueDraft}
          task={task}
          onClose={() => setIssueDraft(null)}
          onSuccess={() => loadWorkspace()}
        />
      )}
    </div>
  );
}