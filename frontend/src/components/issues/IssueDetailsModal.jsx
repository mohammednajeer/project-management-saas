import { useMemo, useState } from "react";
import { AlertCircle, FileImage, FileText, Layers, Loader2, Save, UserRound, X } from "lucide-react";
import useIssues from "../../context/issues/useIssues";
import { useAuth } from "../../context/AuthContext";
import IssuePriorityBadge from "./IssuePriorityBadge";
import IssueStatusBadge from "./IssueStatusBadge";
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  formatIssueDate,
  formatIssueLabel,
  getErrorMessage,
  getUserInitials,
} from "./issueUtils";

function DetailPerson({ label, user }) {
  return (
    <div className="issue-detail-person">
      <span>{user ? getUserInitials(user) : <UserRound size={16} />}</span>
      <div>
        <small>{label}</small>
        <strong>{user?.name || "Unassigned"}</strong>
        {user?.email && <p>{user.email}</p>}
      </div>
    </div>
  );
}

function isImage(file = "") {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file);
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

function getReferenceName(item, fallback) {
  return item?.name || item?.title || fallback || "None";
}

export default function IssueDetailsModal({ issue, onClose, onUpdate }) {
  const { canManageIssues, teamMembers, updateIssue } = useIssues();
  const { user } = useAuth();
  const [currentIssue, setCurrentIssue] = useState(issue);
  const [form, setForm] = useState({
    status: issue?.status || "open",
    priority: issue?.priority || "medium",
    assigned_to: issue?.assigned_to_data?.id || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isAssignedToMe = currentIssue?.assigned_to_data?.id && String(currentIssue.assigned_to_data.id) === String(user?.id);

  const dirty = useMemo(
    () =>
      currentIssue &&
      (form.status !== currentIssue.status ||
        form.priority !== currentIssue.priority ||
        form.assigned_to !== (currentIssue.assigned_to_data?.id || "")),
    [currentIssue, form]
  );

  if (!issue || !currentIssue) return null;

  const handleUpdate = async () => {
    try {
      setSaving(true);
      setError("");

      const updated = await updateIssue(currentIssue.id, {
        status: form.status,
        priority: form.priority,
        assigned_to: form.assigned_to || null,
      });

      setCurrentIssue(updated);
      onUpdate?.(updated);
    } catch (err) {
      console.log(err);
      setError(getErrorMessage(err, "Issue could not be updated."));
    } finally {
      setSaving(false);
    }
  };

  const handleEmployeeStatusUpdate = async (newStatus) => {
    try {
      setSaving(true);
      setError("");

      const updated = await updateIssue(currentIssue.id, {
        status: newStatus,
      });

      setCurrentIssue(updated);
      onUpdate?.(updated);
    } catch (err) {
      console.log(err);
      setError(getErrorMessage(err, "Issue could not be updated."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="issue-modal-backdrop" onClick={onClose}>
      <section className="issue-modal issue-details-modal" onClick={(event) => event.stopPropagation()}>
        <header className="issue-modal-header">
          <div>
            <span>Issue details</span>
            <h2>{currentIssue.title}</h2>
          </div>
          <button type="button" className="issue-icon-button" onClick={onClose} aria-label="Close issue details">
            <X size={18} />
          </button>
        </header>

        <div className="issue-details-badges">
          <IssueStatusBadge status={currentIssue.status} />
          <IssuePriorityBadge priority={currentIssue.priority} />
          {(currentIssue.task || currentIssue.subtask) && (
            <span className="issue-task-badge">
              <Layers size={12} />
              Issue task
            </span>
          )}
        </div>

        {error && (
          <div className="issue-alert" role="alert">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="issue-details-layout">
          <div className="issue-details-main">
            <section>
              <span className="issue-section-label">Description</span>
              <p className="issue-full-description">{currentIssue.description || "No description provided."}</p>
            </section>

            <div className="issue-reference-grid">
              <div>
                <span>Project</span>
                <strong>{getReferenceName(currentIssue.project_data, currentIssue.project)}</strong>
              </div>
              <div>
                <span>Task</span>
                <strong>{getReferenceName(currentIssue.task_data, currentIssue.task)}</strong>
              </div>
              <div>
                <span>Subtask</span>
                <strong>{getReferenceName(currentIssue.subtask_data, currentIssue.subtask)}</strong>
              </div>
            </div>

            <div className="issue-timeline-grid">
              <div>
                <span>Created</span>
                <strong>{formatIssueDate(currentIssue.created_at)}</strong>
              </div>
              <div>
                <span>Last updated</span>
                <strong>{formatIssueDate(currentIssue.updated_at)}</strong>
              </div>
            </div>

            <section>
              <span className="issue-section-label">Evidence</span>
              <div className="issue-evidence-grid">
                {(currentIssue.attachments || []).map((attachment) => (
                  <a
                    key={attachment.id}
                    className="issue-evidence-card"
                    href={attachment.file}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>
                      {isImage(attachment.file) ? (
                        <FileImage size={17} />
                      ) : (
                        <FileText size={17} />
                      )}
                    </span>
                    <strong>{attachment.original_name}</strong>
                    <small>
                      {formatBytes(attachment.file_size)} · {attachment.uploaded_by_data?.name}
                    </small>
                    {isImage(attachment.file) && <img src={attachment.file} alt="" />}
                  </a>
                ))}
                {!currentIssue.attachments?.length && (
                  <div className="issue-evidence-empty">No evidence files attached.</div>
                )}
              </div>
            </section>
          </div>

          <aside className="issue-details-side">
            <DetailPerson label="Raised by" user={currentIssue.raised_by_data} />
            <DetailPerson label="Assigned to" user={currentIssue.assigned_to_data} />

            {canManageIssues && (
              <div className="issue-manager-panel">
                <span className="issue-section-label">Manager controls</span>
                <label>
                  <span>Status</span>
                  <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                    {ISSUE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {formatIssueLabel(status)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Priority</span>
                  <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
                    {ISSUE_PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {formatIssueLabel(priority)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Assign user</span>
                  <select
                    value={form.assigned_to}
                    onChange={(event) => setForm({ ...form, assigned_to: event.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {teamMembers
                      .filter(member => member.role !== "admin" && member.role !== "manager")
                      .map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                  </select>
                </label>
                <button type="button" className="issue-primary-button" disabled={!dirty || saving} onClick={handleUpdate}>
                  {saving ? <Loader2 size={16} className="issue-spin" /> : <Save size={16} />}
                  {saving ? "Updating" : "Update Issue"}
                </button>
              </div>
            )}

            {!canManageIssues && isAssignedToMe && (
              <div className="issue-manager-panel">
                <span className="issue-section-label">Actions</span>
                {currentIssue.status === "open" && (
                  <button
                    type="button"
                    className="issue-primary-button"
                    disabled={saving}
                    onClick={() => handleEmployeeStatusUpdate("investigating")}
                  >
                    {saving ? <Loader2 size={16} className="issue-spin" /> : null}
                    Start Investigation
                  </button>
                )}
                {currentIssue.status === "investigating" && (
                  <button
                    type="button"
                    className="issue-primary-button"
                    disabled={saving}
                    onClick={() => handleEmployeeStatusUpdate("resolved")}
                  >
                    {saving ? <Loader2 size={16} className="issue-spin" /> : null}
                    Mark as Resolved
                  </button>
                )}
                {["resolved", "closed"].includes(currentIssue.status) && (
                  <p className="issue-employee-status-message">
                    Status updates for {currentIssue.status} issues are restricted to managers.
                  </p>
                )}
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
