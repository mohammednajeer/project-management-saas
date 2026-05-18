import { CalendarClock, UserRound } from "lucide-react";
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
      </div>

      <h3>{issue.title}</h3>
      <p>{truncateText(issue.description)}</p>

      <div className="issue-card-people">
        <PersonPill label="Raised by" user={issue.raised_by_data} />
        <PersonPill label="Assigned to" user={issue.assigned_to_data} />
      </div>

      <div className="issue-card-dates">
        <span>
          <CalendarClock size={13} />
          Created {formatIssueDate(issue.created_at)}
        </span>
        <span>Updated {formatIssueDate(issue.updated_at)}</span>
      </div>
    </article>
  );
}
