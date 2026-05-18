import { Circle, CheckCircle2, Lock, Search } from "lucide-react";
import { formatIssueLabel } from "./issueUtils";

const statusMeta = {
  open: { icon: Circle, className: "open" },
  investigating: { icon: Search, className: "investigating" },
  resolved: { icon: CheckCircle2, className: "resolved" },
  closed: { icon: Lock, className: "closed" },
};

export default function IssueStatusBadge({ status = "open" }) {
  const meta = statusMeta[status] || statusMeta.open;
  const Icon = meta.icon;

  return (
    <span className={`issue-status-badge issue-status-badge--${meta.className}`}>
      <Icon size={13} />
      {formatIssueLabel(status)}
    </span>
  );
}
