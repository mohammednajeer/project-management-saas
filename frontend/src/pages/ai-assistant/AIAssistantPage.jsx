import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Copy,
  FileText,
  FolderKanban,
  Gauge,
  Layers3,
  Lightbulb,
  ListChecks,
  Loader2,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  UsersRound,
} from "lucide-react";
import api from "../../services/api";
import "./AIAssistantPage.css";

const EMPTY_SUMMARY = {
  loading: false,
  error: "",
  data: null,
  copied: false,
};

const severityConfig = {
  critical: { label: "Critical", className: "ai-severity--critical" },
  high: { label: "High", className: "ai-severity--high" },
  medium: { label: "Medium", className: "ai-severity--medium" },
  low: { label: "Low", className: "ai-severity--low" },
};

const riskSections = [
  {
    key: "overdue_task",
    title: "Overdue tasks",
    empty: "No overdue task risks found.",
    icon: Clock3,
  },
  {
    key: "deadline_risk",
    title: "Deadline risks",
    empty: "No near-term deadline risks found.",
    icon: CalendarRange,
  },
  {
    key: "critical_issue",
    title: "Critical issues",
    empty: "No critical open issues found.",
    icon: ShieldAlert,
  },
  {
    key: "overloaded_employee",
    title: "Overloaded employees",
    empty: "No overloaded employees found.",
    icon: UsersRound,
  },
];

function updatePanel(setter, patch) {
  setter((current) => ({ ...current, ...patch }));
}

function getApiError(error, fallback = "Something went wrong. Please try again.") {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (data.message) return data.message;
  const firstKey = Object.keys(data)[0];
  const value = data[firstKey];
  if (Array.isArray(value)) return value[0];
  if (typeof value === "string") return value;
  return fallback;
}

function formatLabel(value) {
  if (!value) return "Not set";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.[0] || "?").toUpperCase();
}

async function copyText(payload) {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function LoadingRows({ rows = 3 }) {
  return (
    <div className="ai-loading-stack" aria-label="Loading">
      {Array.from({ length: rows }).map((_, index) => (
        <span key={index} className="ai-skeleton" />
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon = Sparkles, title, message }) {
  return (
    <div className="ai-empty">
      <span className="ai-empty-icon">
        <Icon size={22} />
      </span>
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="ai-error">
      <AlertTriangle size={16} />
      <span>{message}</span>
    </div>
  );
}

function ActionButton({ children, variant = "primary", loading = false, disabled = false, ...props }) {
  return (
    <button
      type="button"
      className={`ai-action ai-action--${variant}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={15} className="ai-spin" /> : null}
      {children}
    </button>
  );
}

function CopyButton({ data, copied, onCopy, disabled }) {
  return (
    <button
      type="button"
      className={`ai-icon-button${copied ? " is-copied" : ""}`}
      onClick={onCopy}
      disabled={disabled || !data}
      aria-label="Copy result"
      title="Copy result"
    >
      {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
    </button>
  );
}

function SectionCard({
  icon: Icon,
  title,
  eyebrow,
  children,
  actions,
  className = "",
}) {
  return (
    <section className={`ai-card ${className}`}>
      <div className="ai-card-head">
        <div className="ai-card-title-wrap">
          <span className="ai-card-icon">
            <Icon size={20} />
          </span>
          <div>
            <span className="ai-card-eyebrow">{eyebrow}</span>
            <h2>{title}</h2>
          </div>
        </div>
        {actions ? <div className="ai-card-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function StatPill({ label, value, tone = "" }) {
  return (
    <div className={`ai-stat-pill ${tone}`}>
      <strong>{value ?? 0}</strong>
      <span>{label}</span>
    </div>
  );
}

function SeverityBadge({ value }) {
  const config = severityConfig[value] || { label: formatLabel(value), className: "ai-severity--neutral" };
  return <span className={`ai-severity ${config.className}`}>{config.label}</span>;
}

function TaskMiniList({ title, items, emptyText }) {
  return (
    <div className="ai-mini-panel">
      <h3>{title}</h3>
      {items?.length ? (
        <div className="ai-mini-list">
          {items.slice(0, 5).map((item) => (
            <div key={item.id || item.title} className="ai-mini-row">
              <span className="ai-mini-dot" />
              <div>
                <strong>{item.title}</strong>
                <small>
                  {item.project?.name ? `${item.project.name} · ` : ""}
                  {formatLabel(item.priority || item.status)}
                  {item.due_date ? ` · ${formatDate(item.due_date)}` : ""}
                </small>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="ai-muted">{emptyText}</p>
      )}
    </div>
  );
}

function ProjectSummaryResult({ data }) {
  const project = data.project || {};
  const progress = data.progress || {};
  const health = data.project_health || {};
  const workload = data.workload || {};

  return (
    <div className="ai-summary-result">
      <div className="ai-project-hero">
        <div>
          <span className="ai-chip">{formatLabel(project.priority)}</span>
          <h3>{project.name || data.project_name}</h3>
          <p>
            {health.label || "Health unavailable"}
            {project.due_date ? ` · Due ${formatDate(project.due_date)}` : ""}
          </p>
        </div>
        <div className="ai-progress-orb">
          <strong>{progress.percentage ?? 0}%</strong>
          <span>Done</span>
        </div>
      </div>

      <div className="ai-stat-grid ai-stat-grid--four">
        <StatPill label="Completed" value={progress.completed} />
        <StatPill label="Remaining" value={progress.remaining} />
        <StatPill label="Open issues" value={data.open_issues?.length} tone="ai-stat-pill--warn" />
        <StatPill label="Overloaded" value={workload.overloaded_count} tone="ai-stat-pill--danger" />
      </div>

      {health.signals ? (
        <div className="ai-signal-grid">
          <span>Completion {health.signals.completion_pct ?? progress.percentage ?? 0}%</span>
          <span>Open issues {health.signals.open_issue_count ?? data.open_issues?.length ?? 0}</span>
          <span>Overdue tasks {health.signals.overdue_task_count ?? 0}</span>
        </div>
      ) : null}

      <div className="ai-two-col">
        <TaskMiniList title="Remaining tasks" items={data.remaining_tasks} emptyText="No remaining tasks." />
        <TaskMiniList title="Open issues" items={data.open_issues} emptyText="No open issues." />
      </div>

      <div className="ai-mini-panel">
        <h3>Upcoming milestones</h3>
        {data.upcoming_milestones?.length ? (
          <div className="ai-mini-list">
            {data.upcoming_milestones.slice(0, 4).map((milestone) => (
              <div key={milestone.id} className="ai-mini-row">
                <span className="ai-mini-dot ai-mini-dot--blue" />
                <div>
                  <strong>{milestone.title}</strong>
                  <small>{formatLabel(milestone.status)} · {formatDate(milestone.target_date)}</small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="ai-muted">No upcoming milestones.</p>
        )}
      </div>
    </div>
  );
}

function RiskDetectionResult({ data }) {
  const risks = data.risks || [];
  const summary = data.summary || {};
  const grouped = riskSections.reduce((acc, section) => {
    acc[section.key] = risks.filter((risk) => risk.type === section.key);
    return acc;
  }, {});

  return (
    <div className="ai-risk-result">
      <div className="ai-stat-grid ai-stat-grid--five">
        <StatPill label="Total risks" value={summary.total} />
        <StatPill label="Critical" value={summary.critical} tone="ai-stat-pill--danger" />
        <StatPill label="High" value={summary.high} tone="ai-stat-pill--warn" />
        <StatPill label="Medium" value={summary.medium} />
        <StatPill label="Low" value={summary.low} />
      </div>

      <div className="ai-risk-grid">
        {riskSections.map(({ key, title, empty, icon: Icon }) => (
          <div key={key} className="ai-risk-panel">
            <div className="ai-risk-panel-head">
              <span><Icon size={16} /> {title}</span>
              <strong>{grouped[key].length}</strong>
            </div>
            {grouped[key].length ? (
              <div className="ai-risk-list">
                {grouped[key].slice(0, 5).map((risk) => (
                  <article key={`${risk.type}-${risk.entity?.id}-${risk.message}`} className="ai-risk-item">
                    <div className="ai-risk-top">
                      <strong>{risk.title}</strong>
                      <SeverityBadge value={risk.severity} />
                    </div>
                    <p>{risk.message}</p>
                    <small>
                      {risk.project?.name || risk.employee?.name || risk.assigned_to?.name || formatLabel(risk.entity?.type)}
                    </small>
                  </article>
                ))}
              </div>
            ) : (
              <p className="ai-muted">{empty}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklySummaryResult({ data }) {
  const completed = data.completed_tasks || {};
  const created = data.new_tasks || {};
  const resolved = data.resolved_issues || {};
  const leave = data.leave_summary || {};
  const upcoming = data.upcoming_deadlines || {};

  return (
    <div className="ai-weekly-result">
      <div className="ai-period-band">
        <CalendarRange size={18} />
        <span>{formatDate(data.period?.start_date)} to {formatDate(data.period?.end_date)}</span>
      </div>

      <div className="ai-stat-grid ai-stat-grid--four">
        <StatPill label="Completed tasks" value={completed.count} />
        <StatPill label="New tasks" value={created.count} />
        <StatPill label="Resolved issues" value={resolved.count} />
        <StatPill label="Leave entries" value={leave.count} />
      </div>

      <div className="ai-two-col">
        <TaskMiniList title="Completed this period" items={completed.items} emptyText="No completed tasks in this period." />
        <TaskMiniList title="New work opened" items={created.items} emptyText="No new tasks in this period." />
      </div>

      <div className="ai-two-col">
        <TaskMiniList title="Resolved issues" items={resolved.items} emptyText="No issues resolved in this period." />
        <div className="ai-mini-panel">
          <h3>Upcoming deadlines</h3>
          {[...(upcoming.tasks || []), ...(upcoming.milestones || [])].length ? (
            <div className="ai-mini-list">
              {[...(upcoming.tasks || []), ...(upcoming.milestones || [])].slice(0, 6).map((item) => (
                <div key={item.id} className="ai-mini-row">
                  <span className="ai-mini-dot ai-mini-dot--orange" />
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.project?.name || "Project"} · {formatDate(item.due_date || item.target_date)}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="ai-muted">No upcoming deadlines in the next seven days.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkloadInsightsResult({ data }) {
  return (
    <div className="ai-workload-result">
      <div className="ai-stat-grid ai-stat-grid--four">
        <StatPill label="Members" value={data.summary?.members} />
        <StatPill label="Overloaded" value={data.summary?.overloaded} tone="ai-stat-pill--danger" />
        <StatPill label="Balanced" value={data.summary?.balanced} />
        <StatPill label="Underused" value={data.summary?.underutilized} />
      </div>

      <div className="ai-workload-scroll-body">
        <div className="ai-recommendation-list">
          {(data.recommendations || []).map((recommendation, index) => (
            <article key={`${recommendation.type}-${index}`} className="ai-recommendation">
              <span className="ai-recommendation-icon">
                <Lightbulb size={16} />
              </span>
              <div>
                <div className="ai-risk-top">
                  <strong>{formatLabel(recommendation.type)}</strong>
                  <SeverityBadge value={recommendation.severity} />
                </div>
                <p>{recommendation.message}</p>
                {recommendation.employee ? (
                  <small>{recommendation.employee.name} · {recommendation.employee.workload_label}</small>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <div className="ai-member-grid">
          {(data.members || []).slice(0, 8).map((member) => (
            <div key={member.id} className="ai-member-card">
              <span className="ai-avatar">{initials(member.name)}</span>
              <div>
                <strong>{member.name}</strong>
                <small>
                  {member.active_tasks} active · {member.open_issues} issues · {member.overdue_tasks} overdue
                </small>
              </div>
              <span className={`ai-workload-badge ai-workload-badge--${member.workload_status}`}>
                {member.workload_label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TaskBreakdownResult({ data }) {
  return (
    <div className="ai-breakdown-result">
      <div className="ai-breakdown-source">
        <ClipboardList size={18} />
        <div>
          <strong>{data.source?.title}</strong>
          <small>{data.method ? `Generated with ${data.method}` : "Suggested task plan"}</small>
        </div>
      </div>

      <div className="ai-task-suggestion-grid">
        {(data.tasks || []).map((task, index) => (
          <article key={`${task.title}-${index}`} className="ai-task-suggestion">
            <div className="ai-task-suggestion-head">
              <span>{index + 1}</span>
              <div>
                <h3>{task.title}</h3>
                <SeverityBadge value={task.priority} />
              </div>
            </div>
            <div className="ai-subtask-list">
              {(task.subtasks || []).map((subtask) => (
                <div key={subtask.title} className="ai-subtask-row">
                  <CheckCircle2 size={14} />
                  <span>{subtask.title}</span>
                  <small>{formatLabel(subtask.priority)}</small>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function AIAssistantPage() {
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [risks, setRisks] = useState(EMPTY_SUMMARY);
  const [weekly, setWeekly] = useState(EMPTY_SUMMARY);
  const [workload, setWorkload] = useState(EMPTY_SUMMARY);
  const [breakdown, setBreakdown] = useState(EMPTY_SUMMARY);
  const [breakdownForm, setBreakdownForm] = useState({
    title: "",
    description: "",
  });

  useEffect(() => {
    let mounted = true;

    async function loadProjects() {
      try {
        const res = await api.get("/projects/");
        if (!mounted) return;
        setProjects(res.data || []);
        setSelectedProjectId((current) => current || res.data?.[0]?.id || "");
      } catch (error) {
        if (mounted) setProjectsError(getApiError(error, "Unable to load projects."));
      } finally {
        if (mounted) setProjectsLoading(false);
      }
    }

    loadProjects();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  const heroStats = useMemo(
    () => [
      { label: "Projects", value: projects.length, icon: FolderKanban },
      { label: "Risks", value: risks.data?.summary?.total ?? "Ready", icon: ShieldAlert },
      { label: "Recommendations", value: workload.data?.recommendations?.length ?? "Ready", icon: Lightbulb },
    ],
    [projects.length, risks.data, workload.data]
  );

  async function handleCopy(panel, setter) {
    if (!panel.data) return;
    await copyText(panel.data);
    updatePanel(setter, { copied: true });
    window.setTimeout(() => updatePanel(setter, { copied: false }), 1400);
  }

  async function generateProjectSummary() {
    if (!selectedProjectId) {
      updatePanel(setSummary, { error: "Select a project first." });
      return;
    }
    updatePanel(setSummary, { loading: true, error: "", copied: false });
    try {
      const res = await api.get(`/ai/project-summary/${selectedProjectId}/`);
      updatePanel(setSummary, { data: res.data, loading: false });
    } catch (error) {
      updatePanel(setSummary, {
        loading: false,
        error: getApiError(error, "Unable to generate the project summary."),
      });
    }
  }

  async function generateRisks() {
    updatePanel(setRisks, { loading: true, error: "", copied: false });
    try {
      const res = await api.get("/ai/risk-detection/");
      updatePanel(setRisks, { data: res.data, loading: false });
    } catch (error) {
      updatePanel(setRisks, {
        loading: false,
        error: getApiError(error, "Unable to run risk detection."),
      });
    }
  }

  async function generateWeeklySummary() {
    updatePanel(setWeekly, { loading: true, error: "", copied: false });
    try {
      const res = await api.get("/ai/weekly-summary/");
      updatePanel(setWeekly, { data: res.data, loading: false });
    } catch (error) {
      updatePanel(setWeekly, {
        loading: false,
        error: getApiError(error, "Unable to generate the weekly summary."),
      });
    }
  }

  async function generateWorkloadInsights() {
    updatePanel(setWorkload, { loading: true, error: "", copied: false });
    try {
      const res = await api.get("/ai/workload-insights/");
      updatePanel(setWorkload, { data: res.data, loading: false });
    } catch (error) {
      updatePanel(setWorkload, {
        loading: false,
        error: getApiError(error, "Unable to generate workload insights."),
      });
    }
  }

  async function generateTaskBreakdown() {
    const title = breakdownForm.title.trim();
    const description = breakdownForm.description.trim();
    if (!title) {
      updatePanel(setBreakdown, { error: "Add a title before generating a task breakdown." });
      return;
    }
    updatePanel(setBreakdown, { loading: true, error: "", copied: false });
    try {
      const res = await api.post("/ai/task-breakdown/", { title, description });
      updatePanel(setBreakdown, { data: res.data, loading: false });
    } catch (error) {
      updatePanel(setBreakdown, {
        loading: false,
        error: getApiError(error, "Unable to generate the task breakdown."),
      });
    }
  }

  return (
    <main className="ai-page">
      {/* ── WELCOME HERO ── */}
      <section className="ai-welcome">
        <div className="ai-welcome-avatar">
          <Sparkles size={20} />
        </div>
        <h1 className="ai-welcome-title">
          How can I help <span className="text-serif italic">today</span>?
        </h1>
        <p className="ai-welcome-sub">
          I can summarize projects, detect delivery risks, review weekly
          activity, rebalance workloads, and plan new work.
        </p>
        <div className="ai-welcome-stats">
          {heroStats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="ai-stat-chip">
              <Icon size={14} />
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {projectsError ? <ErrorState message={projectsError} /> : null}

      <div className="ai-layout">
        <div className="ai-main-stack">
          <SectionCard
            icon={FileText}
            eyebrow="Project summary"
            title="Summarize a project"
            actions={
              <>
                <CopyButton
                  data={summary.data}
                  copied={summary.copied}
                  onCopy={() => handleCopy(summary, setSummary)}
                  disabled={summary.loading}
                />
                <ActionButton
                  loading={summary.loading}
                  disabled={!selectedProjectId}
                  onClick={generateProjectSummary}
                >
                  {summary.data ? <RefreshCw size={15} /> : <Sparkles size={15} />}
                  {summary.data ? "Regenerate" : "Generate"}
                </ActionButton>
              </>
            }
          >
            <div className="ai-form-row">
              <label className="ai-field">
                <span>Select project</span>
                <select
                  value={selectedProjectId}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                  disabled={projectsLoading || summary.loading}
                >
                  <option value="">
                    {projectsLoading ? "Loading projects..." : "Choose a project"}
                  </option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              {selectedProject ? (
                <div className="ai-selected-project">
                  <FolderKanban size={16} />
                  <span>{formatLabel(selectedProject.status)}</span>
                  <strong>{selectedProject.total_tasks || 0} tasks</strong>
                </div>
              ) : null}
            </div>

            {summary.error ? <ErrorState message={summary.error} /> : null}
            {summary.loading ? <LoadingRows /> : summary.data ? (
              <ProjectSummaryResult data={summary.data} />
            ) : (
              <EmptyState
                icon={FolderKanban}
                title="No summary generated"
                message="Select a project and generate a formatted delivery summary."
              />
            )}
          </SectionCard>

          <SectionCard
            icon={ShieldAlert}
            eyebrow="Risk detection"
            title="Find delivery risks"
            actions={
              <>
                <CopyButton
                  data={risks.data}
                  copied={risks.copied}
                  onCopy={() => handleCopy(risks, setRisks)}
                  disabled={risks.loading}
                />
                <ActionButton loading={risks.loading} onClick={generateRisks}>
                  {risks.data ? <RefreshCw size={15} /> : <Sparkles size={15} />}
                  {risks.data ? "Regenerate" : "Generate"}
                </ActionButton>
              </>
            }
          >
            {risks.error ? <ErrorState message={risks.error} /> : null}
            {risks.loading ? <LoadingRows rows={4} /> : risks.data ? (
              <RiskDetectionResult data={risks.data} />
            ) : (
              <EmptyState
                icon={ShieldAlert}
                title="Risk scan waiting"
                message="Generate to review overdue tasks, deadline risks, critical issues, and overloaded employees."
              />
            )}
          </SectionCard>

          <SectionCard
            icon={CalendarRange}
            eyebrow="Weekly summary"
            title="Generate weekly report"
            actions={
              <>
                <CopyButton
                  data={weekly.data}
                  copied={weekly.copied}
                  onCopy={() => handleCopy(weekly, setWeekly)}
                  disabled={weekly.loading}
                />
                <ActionButton loading={weekly.loading} onClick={generateWeeklySummary}>
                  {weekly.data ? <RefreshCw size={15} /> : <Sparkles size={15} />}
                  {weekly.data ? "Regenerate" : "Generate"}
                </ActionButton>
              </>
            }
          >
            {weekly.error ? <ErrorState message={weekly.error} /> : null}
            {weekly.loading ? <LoadingRows rows={4} /> : weekly.data ? (
              <WeeklySummaryResult data={weekly.data} />
            ) : (
              <EmptyState
                icon={CalendarRange}
                title="No weekly report yet"
                message="Generate a report for the current default reporting window."
              />
            )}
          </SectionCard>
        </div>

        <aside className="ai-side-stack">
          <SectionCard
            icon={Gauge}
            eyebrow="Workload insights"
            title="Recommendations"
            actions={
              <>
                <CopyButton
                  data={workload.data}
                  copied={workload.copied}
                  onCopy={() => handleCopy(workload, setWorkload)}
                  disabled={workload.loading}
                />
                <ActionButton loading={workload.loading} onClick={generateWorkloadInsights}>
                  {workload.data ? <RefreshCw size={15} /> : <Sparkles size={15} />}
                  {workload.data ? "Regenerate" : "Generate"}
                </ActionButton>
              </>
            }
            className="ai-sticky-card"
          >
            {workload.error ? <ErrorState message={workload.error} /> : null}
            {workload.loading ? <LoadingRows rows={4} /> : workload.data ? (
              <WorkloadInsightsResult data={workload.data} />
            ) : (
              <EmptyState
                icon={Gauge}
                title="No workload insights"
                message="Generate recommendations for team capacity and work balance."
              />
            )}
          </SectionCard>

          <SectionCard
            icon={ListChecks}
            eyebrow="Task breakdown"
            title="Plan new work"
            actions={
              <>
                <CopyButton
                  data={breakdown.data}
                  copied={breakdown.copied}
                  onCopy={() => handleCopy(breakdown, setBreakdown)}
                  disabled={breakdown.loading}
                />
              </>
            }
          >
            <div className="ai-breakdown-form">
              <label className="ai-field">
                <span>Title</span>
                <input
                  value={breakdownForm.title}
                  onChange={(event) =>
                    setBreakdownForm((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Launch client onboarding portal"
                />
              </label>
              <label className="ai-field">
                <span>Description</span>
                <textarea
                  value={breakdownForm.description}
                  onChange={(event) =>
                    setBreakdownForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Describe goals, constraints, deadlines, APIs, UI, QA, or rollout details."
                />
              </label>
              <ActionButton
                loading={breakdown.loading}
                disabled={!breakdownForm.title.trim()}
                onClick={generateTaskBreakdown}
              >
                <Send size={15} />
                {breakdown.data ? "Regenerate breakdown" : "Generate breakdown"}
              </ActionButton>
            </div>

            {breakdown.error ? <ErrorState message={breakdown.error} /> : null}
            {breakdown.loading ? <LoadingRows rows={4} /> : breakdown.data ? (
              <TaskBreakdownResult data={breakdown.data} />
            ) : (
              <EmptyState
                icon={Layers3}
                title="No task plan generated"
                message="Add a title and description to create suggested tasks, subtasks, and priorities."
              />
            )}
          </SectionCard>
        </aside>
      </div>
    </main>
  );
}
