import { useMemo, useState } from "react";
import { AlertCircle, Loader2, Save, UserRound, X } from "lucide-react";
import useIssues from "../../context/issues/useIssues";
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

export default function IssueDetailsModal({ issue, onClose }) {
  const { canManageIssues, teamMembers, updateIssue } = useIssues();
  const [currentIssue, setCurrentIssue] = useState(issue);
  const [form, setForm] = useState({
    status: issue?.status || "open",
    priority: issue?.priority || "medium",
    assigned_to: issue?.assigned_to_data?.id || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
                <strong>{currentIssue.project || "None"}</strong>
              </div>
              <div>
                <span>Task</span>
                <strong>{currentIssue.task || "None"}</strong>
              </div>
              <div>
                <span>Subtask</span>
                <strong>{currentIssue.subtask || "None"}</strong>
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
                    {teamMembers.map((member) => (
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
          </aside>
        </div>
      </section>
    </div>
  );
}
