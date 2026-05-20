import { CalendarClock, Layers, Paperclip, UserRound } from "lucide-react";
import IssuePriorityBadge from "./IssuePriorityBadge";
import IssueStatusBadge from "./IssueStatusBadge";
import { formatIssueDate, getUserInitials, truncateText } from "./issueUtils";

function PersonPill({ label, user }) {
  return (
    <div className="issue-person">
      <span className="issue-person-avatar">
        {user ? getUserInitials(user) : <UserRound size={13} />}
      </span>
      <span>
        <small>{label}</small>
        <strong>{user?.name || "Unassigned"}</strong>
      </span>
    </div>
  );
}

export default function IssueCard({ issue, onOpen }) {
  return (
    <article className="issue-card" onClick={() => onOpen(issue)} tabIndex={0}>
      <div className="issue-card-top">
        <IssueStatusBadge status={issue.status} />
        <IssuePriorityBadge priority={issue.priority} />
        {(issue.task || issue.subtask) && (
          <span className="issue-task-badge">
            <Layers size={12} />
            Issue task
          </span>
        )}
      </div>

      <h3>{issue.title}</h3>
      <p>{truncateText(issue.description)}</p>

      <div className="issue-reference-line">
        <span>{issue.project_data?.name || "No project"}</span>
        {issue.task_data?.title && <span>{issue.task_data.title}</span>}
        {issue.subtask_data?.title && <span>{issue.subtask_data.title}</span>}
      </div>

      <div className="issue-card-people">
        <PersonPill label="Raised by" user={issue.raised_by_data} />
        <PersonPill label="Assigned to" user={issue.assigned_to_data} />
      </div>

      <div className="issue-card-dates">
        <span>
          <CalendarClock size={13} />
          Created {formatIssueDate(issue.created_at)}
        </span>
        <span>
          {issue.attachments?.length > 0 && (
            <>
              <Paperclip size={13} />
              {issue.attachments.length}
            </>
          )}
          Updated {formatIssueDate(issue.updated_at)}
        </span>
      </div>
    </article>
  );
}
