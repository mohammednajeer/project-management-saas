import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Flame, Plus, SearchCheck, Ticket } from "lucide-react";
import IssueCard from "../../components/issues/IssueCard";
import IssueCreateModal from "../../components/issues/IssueCreateModal";
import IssueDetailsModal from "../../components/issues/IssueDetailsModal";
import IssueEmptyState from "../../components/issues/IssueEmptyState";
import IssueFilters from "../../components/issues/IssueFilters";
import IssueSkeleton from "../../components/issues/IssueSkeleton";
import useIssues from "../../context/issues/useIssues";
import { IssueProvider } from "../../context/issues/IssueContext";
import "./IssuesPage.css";

const defaultFilters = {
  search: "",
  status: "all",
  priority: "all",
  assignedTo: "all",
  sort: "latest",
};

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <article className={`issue-stat-card issue-stat-card--${tone}`}>
      <div className="issue-stat-icon">
        <Icon size={20} />
      </div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </article>
  );
}

function IssuesPageContent() {
  const { issues, loading, error, teamMembers, fetchIssues } = useIssues();
  const [filters, setFilters] = useState(defaultFilters);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);

  const stats = useMemo(
    () => ({
      total: issues.length,
      open: issues.filter((issue) => issue.status === "open").length,
      investigating: issues.filter((issue) => issue.status === "investigating").length,
      resolved: issues.filter((issue) => issue.status === "resolved").length,
      critical: issues.filter((issue) => issue.priority === "critical").length,
    }),
    [issues]
  );

  const assignees = useMemo(() => {
    const assigned = issues.map((issue) => issue.assigned_to_data).filter(Boolean);
    const map = new Map(teamMembers.map((member) => [String(member.id), member]));
    assigned.forEach((member) => map.set(String(member.id), member));
    return Array.from(map.values());
  }, [issues, teamMembers]);

  const filteredIssues = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return issues
      .filter((issue) => {
        const matchesSearch = !query || issue.title.toLowerCase().includes(query);
        const matchesStatus = filters.status === "all" || issue.status === filters.status;
        const matchesPriority = filters.priority === "all" || issue.priority === filters.priority;
        const assignedId = issue.assigned_to_data?.id;
        const matchesAssigned =
          filters.assignedTo === "all" ||
          (filters.assignedTo === "unassigned" && !assignedId) ||
          String(assignedId) === String(filters.assignedTo);

        return matchesSearch && matchesStatus && matchesPriority && matchesAssigned;
      })
      .sort((a, b) => {
        const first = new Date(a.created_at).getTime();
        const second = new Date(b.created_at).getTime();
        return filters.sort === "oldest" ? first - second : second - first;
      });
  }, [filters, issues]);

  return (
    <div className="issues-page">
      <header className="issues-header">
        <div>
          <span className="issues-eyebrow">
            <Ticket size={15} />
            Operations
          </span>
          <h1>Issue Tracker</h1>
          <p>Track blockers, escalations, and project problems.</p>
        </div>
        <button type="button" className="issue-primary-button" onClick={() => setCreateOpen(true)}>
          <Plus size={16} />
          New Issue
        </button>
      </header>

      <section className="issue-stats-grid">
        <StatCard icon={Ticket} label="Total Issues" value={stats.total} tone="total" />
        <StatCard icon={AlertCircle} label="Open Issues" value={stats.open} tone="open" />
        <StatCard icon={SearchCheck} label="Investigating" value={stats.investigating} tone="investigating" />
        <StatCard icon={CheckCircle2} label="Resolved" value={stats.resolved} tone="resolved" />
        <StatCard icon={Flame} label="Critical Issues" value={stats.critical} tone="critical" />
      </section>

      <IssueFilters filters={filters} onChange={setFilters} assignees={assignees} />

      {error && (
        <div className="issue-page-error">
          <AlertCircle size={17} />
          <span>{error}</span>
          <button type="button" onClick={fetchIssues}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <IssueSkeleton />
      ) : filteredIssues.length === 0 ? (
        <IssueEmptyState onCreate={() => setCreateOpen(true)} />
      ) : (
        <section className="issue-grid">
          {filteredIssues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onOpen={setSelectedIssue} />
          ))}
        </section>
      )}

      <IssueCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <IssueDetailsModal
        key={selectedIssue?.id || "empty-issue"}
        issue={selectedIssue}
        onClose={() => setSelectedIssue(null)}
        onUpdate={(updated) => setSelectedIssue(updated)}
      />
    </div>
  );
}

export default function IssuesPage() {
  return (
    <IssueProvider>
      <IssuesPageContent />
    </IssueProvider>
  );
}
