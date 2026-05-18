import { Search, SlidersHorizontal } from "lucide-react";
import { ISSUE_PRIORITIES, ISSUE_STATUSES, formatIssueLabel } from "./issueUtils";

export default function IssueFilters({ filters, onChange, assignees = [] }) {
  const update = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <section className="issue-filters">
      <label className="issue-search">
        <Search size={16} />
        <input
          value={filters.search}
          onChange={(event) => update("search", event.target.value)}
          placeholder="Search issues by title"
        />
      </label>

      <div className="issue-filter-controls">
        <span>
          <SlidersHorizontal size={15} />
          Filters
        </span>

        <select value={filters.status} onChange={(event) => update("status", event.target.value)}>
          <option value="all">All statuses</option>
          {ISSUE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {formatIssueLabel(status)}
            </option>
          ))}
        </select>

        <select value={filters.priority} onChange={(event) => update("priority", event.target.value)}>
          <option value="all">All priorities</option>
          {ISSUE_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {formatIssueLabel(priority)}
            </option>
          ))}
        </select>

        <select value={filters.assignedTo} onChange={(event) => update("assignedTo", event.target.value)}>
          <option value="all">All assignees</option>
          <option value="unassigned">Unassigned</option>
          {assignees.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>

        <select value={filters.sort} onChange={(event) => update("sort", event.target.value)}>
          <option value="latest">Latest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>
    </section>
  );
}
