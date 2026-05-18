import { AlertCircle, Plus } from "lucide-react";

export default function IssueEmptyState({ onCreate }) {
  return (
    <div className="issue-empty-state">
      <div className="issue-empty-icon">
        <AlertCircle size={30} />
      </div>
      <h2>No issues found</h2>
      <p>Track blockers, escalations, and project problems before they slow the team down.</p>
      <button type="button" onClick={onCreate}>
        <Plus size={16} />
        Create Issue
      </button>
    </div>
  );
}
