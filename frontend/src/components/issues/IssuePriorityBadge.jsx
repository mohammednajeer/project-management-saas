import { AlertTriangle, ArrowDown, Flame, Minus } from "lucide-react";
import { formatIssueLabel } from "./issueUtils";

const priorityMeta = {
  low: { icon: ArrowDown, className: "low" },
  medium: { icon: Minus, className: "medium" },
  high: { icon: AlertTriangle, className: "high" },
  critical: { icon: Flame, className: "critical" },
};

export default function IssuePriorityBadge({ priority = "medium" }) {
  const meta = priorityMeta[priority] || priorityMeta.medium;
  const Icon = meta.icon;

  return (
    <span className={`issue-priority-badge issue-priority-badge--${meta.className}`}>
      <Icon size={13} />
      {formatIssueLabel(priority)}
    </span>
  );
}
