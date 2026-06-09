import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Layers,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Search,
  Calendar,
  Filter,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import api from "../../services/api";
import "./Reports.css";

/* ── Analytical Format Helpers ─────────────────────────── */
const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString());
const pct = (n) => (n == null ? "—" : `${Math.round(n)}%`);

/* ── Modern Premium Palette Configuration ────────────────── */
const DONUT_COLORS = ["#17191c", "#d3e3fc", "#fbe1d1", "#777b86"];

function buildDonut(data) {
  return [
    { name: "Completed Tasks", value: data.completed_tasks || 0, status: "completed" },
    { name: "Active Run-rate", value: data.pending_tasks || 0, status: "pending" },
    { name: "Overdue Backlog", value: data.overdue_tasks || 0, status: "overdue" },
    {
      name: "Open Issues",
      value: data.total_issues || 0,
      status: "issues",
    },
  ].filter((d) => d.value > 0);
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid rgba(0,0,0,0.08)",
      padding: "10px 14px",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
    }}>
      {label && <div style={{ fontSize: "11px", fontWeight: 700, color: "#777b86", marginBottom: "6px", textTransform: "uppercase" }}>{label}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {payload.map((p) => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: p.color || p.fill }} />
            <span style={{ color: "#4c4c4c" }}>{p.name}:</span>
            <span style={{ fontWeight: 700, color: "#17191c" }}>{fmt(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Reports() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let active = true;
    setTimeout(() => {
      if (active) {
        setLoading(true);
        setError(null);
      }
    }, 0);
    api.get("/reports/dashboard/")
      .then((r) => {
        if (active) {
          setData(r.data);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e?.response?.data?.detail || "Analytics interface lost database linkage upstream.");
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [refresh]);

  const donutData = data ? buildDonut(data) : [];
  const lineData = data?.weekly_activity || [];
  const barData = data?.project_breakdown || [];
  const taskDistribution = data?.task_distribution || [];
  const workloadDistribution = data?.workload_distribution || [];
  const teamWorkload = data?.team_workload || [];

  // Filtered project list for resolution ledger table
  const filteredProjects = barData.filter((proj) =>
    proj.project?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cr = data?.completion_rate ?? 0;

  return (
    <div className="rep-container">
      {/* ── HEADER ANCHOR ── */}
      <header className="rep-header">
        <div className="rep-title-group">
          <h1 className="rep-title">Reports Command Center</h1>
          <p className="rep-subtitle">
            <span className="rep-pulse-dot" />
            Live telemetry sync active — Real-time analytics system logs
          </p>
        </div>
        <div className="rep-header-actions">
          <div className="rep-date-picker">
            <Calendar size={14} />
            <span>Today, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <button
            className={`rep-btn-primary ${loading ? "rep-btn-primary--spinning" : ""}`}
            onClick={() => setRefresh((n) => n + 1)}
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw size={13} className="rep-btn-primary--spinning" />
                <span>Syncing Engine...</span>
              </>
            ) : (
              <>
                <RefreshCw size={13} />
                <span>Sync Engine</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── RUNTIME ERROR NOTIFIER ── */}
      {error && (
        <div className="rep-error-banner">
          <AlertTriangle size={15} />
          <span><strong>Data Stream Exception:</strong> {error}</span>
        </div>
      )}

      {/* ── 8-GRID KPI GRID ── */}
      <section className="rep-kpi-grid">
        {/* KPI 1: Active Ventures */}
        <div className="rep-glass-card rep-kpi-card rep-kpi-card--sky">
          <div className="rep-card-top-row">
            <span className="rep-card-label">Active Ventures</span>
            <span className="rep-card-trend rep-card-trend--up">
              <ArrowUpRight size={10} style={{ marginRight: '2px', verticalAlign: 'middle' }} /> +12.4%
            </span>
          </div>
          {loading ? (
            <div className="rep-skeleton rep-sk-v" />
          ) : (
            <div className="rep-card-value">{fmt(data?.total_projects)}</div>
          )}
        </div>

        {/* KPI 2: Work Items */}
        <div className="rep-glass-card rep-kpi-card rep-kpi-card--ink">
          <div className="rep-card-top-row">
            <span className="rep-card-label">Work Items</span>
            <span className="rep-card-trend rep-card-trend--flat">
              0.0%
            </span>
          </div>
          {loading ? (
            <div className="rep-skeleton rep-sk-v" />
          ) : (
            <div className="rep-card-value">{fmt(data?.total_tasks)}</div>
          )}
        </div>

        {/* KPI 3: Merged Closures */}
        <div className="rep-glass-card rep-kpi-card rep-kpi-card--apricot">
          <div className="rep-card-top-row">
            <span className="rep-card-label">Merged Closures</span>
            <span className="rep-card-trend rep-card-trend--up">
              <ArrowUpRight size={10} style={{ marginRight: '2px', verticalAlign: 'middle' }} /> +4.1%
            </span>
          </div>
          {loading ? (
            <div className="rep-skeleton rep-sk-v" />
          ) : (
            <div className="rep-card-value">{fmt(data?.completed_tasks)}</div>
          )}
        </div>

        {/* KPI 4: Pending Pipeline */}
        <div className="rep-glass-card rep-kpi-card rep-kpi-card--sky">
          <div className="rep-card-top-row">
            <span className="rep-card-label">Pending Pipeline</span>
            <span className="rep-card-trend rep-card-trend--flat">
              Steady
            </span>
          </div>
          {loading ? (
            <div className="rep-skeleton rep-sk-v" />
          ) : (
            <div className="rep-card-value">{fmt(data?.pending_tasks)}</div>
          )}
        </div>

        {/* KPI 5: Breached Deadlines */}
        <div className="rep-glass-card rep-kpi-card rep-kpi-card--apricot">
          <div className="rep-card-top-row">
            <span className="rep-card-label">Breached Deadlines</span>
            <span className="rep-card-trend rep-card-trend--down">
              <ArrowDownRight size={10} style={{ marginRight: '2px', verticalAlign: 'middle' }} /> -8.3%
            </span>
          </div>
          {loading ? (
            <div className="rep-skeleton rep-sk-v" />
          ) : (
            <div className="rep-card-value">{fmt(data?.overdue_tasks)}</div>
          )}
        </div>

        {/* KPI 6: Discovered Exceptions */}
        <div className="rep-glass-card rep-kpi-card rep-kpi-card--ink">
          <div className="rep-card-top-row">
            <span className="rep-card-label">Discovered Exceptions</span>
            <span className="rep-card-trend rep-card-trend--flat">
              0.0%
            </span>
          </div>
          {loading ? (
            <div className="rep-skeleton rep-sk-v" />
          ) : (
            <div className="rep-card-value">{fmt(data?.total_issues)}</div>
          )}
        </div>

        {/* KPI 7: Authenticated Operatives */}
        <div className="rep-glass-card rep-kpi-card rep-kpi-card--sky">
          <div className="rep-card-top-row">
            <span className="rep-card-label">Authenticated Operatives</span>
            <span className="rep-card-trend rep-card-trend--up">
              +2 New
            </span>
          </div>
          {loading ? (
            <div className="rep-skeleton rep-sk-v" />
          ) : (
            <div className="rep-card-value">{fmt(data?.active_members)}</div>
          )}
        </div>

        {/* KPI 8: SLA Attainment */}
        <div className="rep-glass-card rep-kpi-card rep-kpi-card--apricot">
          <div className="rep-card-top-row">
            <span className="rep-card-label">SLA Attainment</span>
            <span className="rep-card-trend rep-card-trend--up">
              Target Max
            </span>
          </div>
          {loading ? (
            <div className="rep-skeleton rep-sk-v" />
          ) : (
            <div className="rep-card-value">{pct(data?.completion_rate)}</div>
          )}
        </div>
      </section>

      {/* ── WORKLOAD ANALYTICS ROW ── */}
      <section className="rep-workload-grid">
        {/* Card 1: Task Distribution */}
        <div className="rep-glass-card rep-workload-card">
          <h3 className="rep-workload-title">Task Distribution</h3>
          {loading ? (
            <div className="rep-skeleton rep-sk-donut" style={{ margin: "20px auto" }} />
          ) : taskDistribution.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--rep-ash)" }}>No task distribution telemetry found.</div>
          ) : (
            <>
              <div style={{ position: "relative", width: "100%", height: "140px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taskDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                    >
                      {taskDistribution.map((entry, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  pointerEvents: "none"
                }}>
                  <div style={{ fontSize: "28px", fontWeight: "600", fontFamily: "var(--font-display)", color: "var(--rep-ink)", lineHeight: 1 }}>
                    {fmt(data?.total_tasks || 0)}
                  </div>
                  <div style={{ fontSize: "9px", fontWeight: "700", textTransform: "uppercase", color: "var(--rep-ash)", letterSpacing: "0.05em", marginTop: "4px" }}>
                    Total Tasks
                  </div>
                </div>
              </div>
              <div className="rep-donut-legend">
                {taskDistribution.map((entry, idx) => (
                  <div key={idx} className="rep-legend-item">
                    <div className="rep-legend-left">
                      <span className="rep-legend-bullet" style={{ background: DONUT_COLORS[idx % DONUT_COLORS.length] }} />
                      <span>{entry.name}</span>
                    </div>
                    <span className="rep-legend-bold">{fmt(entry.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Card 2: Workload Distribution */}
        <div className="rep-glass-card rep-workload-card">
          <h3 className="rep-workload-title">Workload Balance</h3>
          {loading ? (
            <div className="rep-skeleton rep-sk-chart" />
          ) : workloadDistribution.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--rep-ash)" }}>No workload balance logs found.</div>
          ) : (
            <>
              <div className="rep-bar-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workloadDistribution} margin={{ top: 8, right: 8, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--rep-ash)", fontWeight: 500 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--rep-ash)", fontWeight: 500 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" name="Employees" maxBarSize={36}>
                      {workloadDistribution.map((entry, index) => {
                        let color = "var(--rep-ink)";
                        if (entry.status === "underutilized") color = "var(--rep-sky)";
                        else if (entry.status === "balanced") color = "var(--rep-ink)";
                        else if (entry.status === "overloaded") color = "var(--rep-apricot)";
                        return <Cell key={index} fill={color} radius={[6, 6, 0, 0]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="rep-insight-banner">
                <Sparkles size={16} style={{ color: "var(--rep-ink)", flexShrink: 0 }} />
                <p className="rep-insight-text">
                  Most of your authenticated operatives are currently operating at a <span className="rep-insight-highlight">balanced</span> workload velocity.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Card 3: Resource Saturation */}
        <div className="rep-glass-card rep-workload-card">
          <h3 className="rep-workload-title">Resource Saturation</h3>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {[1, 2, 3].map((n) => (
                <div key={n} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div className="rep-skeleton rep-sk-l" style={{ width: "40%" }} />
                  <div className="rep-skeleton rep-sk-v" style={{ height: "8px", borderRadius: "99px" }} />
                </div>
              ))}
            </div>
          ) : teamWorkload.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--rep-ash)" }}>No saturation levels logged.</div>
          ) : (
            <div className="rep-saturation-stack">
              {teamWorkload.slice(0, 4).map((row, idx) => {
                const percentage = Math.min(100, Math.round(((row.active_tasks || 0) / 15) * 100));
                const isOverloaded = row.workload_status === "overloaded";
                return (
                  <div key={idx} className="rep-saturation-item">
                    <div className="rep-saturation-header">
                      <span className="rep-saturation-label">{row.name}</span>
                      <span className={`rep-saturation-value ${isOverloaded ? "rep-saturation-value--overloaded" : ""}`}>
                        {row.active_tasks || 0} Tasks {isOverloaded && "(Overloaded)"}
                      </span>
                    </div>
                    <div className="rep-progress-track">
                      <div
                        className={`rep-progress-fill ${isOverloaded ? "rep-progress-fill--overloaded" : "rep-progress-fill--normal"}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── MAIN DECK GRID ── */}
      <section className="rep-deck-grid">
        {/* Panel 1: Resource Velocity Timeline */}
        <div className="rep-glass-card rep-deck-card-large">
          <div className="rep-deck-header">
            <div className="rep-deck-title-row">
              <h3 className="rep-deck-title">Resource Velocity</h3>
              <p className="rep-deck-desc">Active vs completed operations rate tracker</p>
            </div>
            <div className="rep-deck-controls">
              <span className="rep-control-pill rep-control-pill--active">7 Days</span>
              <span className="rep-control-pill rep-control-pill--inactive">30 Days</span>
            </div>
          </div>
          {loading ? (
            <div className="rep-skeleton rep-sk-chart" style={{ height: "300px" }} />
          ) : lineData.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "var(--rep-ash)" }}>No weekly activity logged.</div>
          ) : (
            <div className="rep-velocity-chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--rep-sky)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--rep-sky)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(0,0,0,0.03)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--rep-ash)", fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--rep-ash)", fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    name="Operations Velocity"
                    stroke="var(--rep-ink)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#velocityGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Panel 2: Dynamic Segmentation Donut */}
        <div className="rep-glass-card rep-deck-card-small">
          <div className="rep-deck-header" style={{ marginBottom: "24px" }}>
            <div className="rep-deck-title-row">
              <h3 className="rep-deck-title">Dynamic Segmentation</h3>
              <p className="rep-deck-desc">Active allocations breakdown</p>
            </div>
          </div>
          {loading ? (
            <div className="rep-skeleton rep-sk-donut" style={{ margin: "20px auto" }} />
          ) : donutData.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--rep-ash)" }}>No dynamic telemetry found.</div>
          ) : (
            <>
              <div style={{ position: "relative", width: "100%", height: "130px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {donutData.map((entry, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  pointerEvents: "none"
                }}>
                  <div style={{ fontSize: "22px", fontWeight: "600", fontFamily: "var(--font-display)", color: "var(--rep-ink)", lineHeight: 1 }}>
                    {pct(cr)}
                  </div>
                  <div style={{ fontSize: "8px", fontWeight: "700", textTransform: "uppercase", color: "var(--rep-ash)", letterSpacing: "0.05em", marginTop: "2px" }}>
                    Efficiency
                  </div>
                </div>
              </div>
              <div className="rep-donut-legend-3">
                {donutData.map((d, i) => (
                  <div key={d.name} className="rep-legend-3-row">
                    <div className="rep-legend-3-left">
                      <span className="rep-legend-3-bullet" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      <span>{d.name}</span>
                    </div>
                    <span className="rep-legend-3-bold">{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── INSIGHTS & LEDGER ROW ── */}
      <section className="rep-insights-ledger-grid">
        {/* Panel 3: AI Insights */}
        <div className="rep-glass-card rep-insights-column">
          <div className="rep-insights-header">
            <h3 className="rep-workload-title" style={{ margin: 0 }}>AI System Insights</h3>
            <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--rep-ash)", fontWeight: 500 }}>
              <Sparkles size={14} style={{ color: "var(--rep-ink)" }} /> Analytics Active
            </span>
          </div>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[1, 2, 3].map((n) => (
                <div key={n} className="rep-skeleton" style={{ height: "90px", borderRadius: "16px" }} />
              ))}
            </div>
          ) : (
            <div className="rep-ai-insights-stack">
              <div className="rep-insight-note rep-insight-note--dark">
                <h4 className="rep-note-title">Capacity Net Velocity</h4>
                <p className="rep-note-body">
                  System capacity net velocity registers at <strong>{pct(cr)}</strong> efficiency, surpassing the core target benchmarks.
                </p>
              </div>
              <div className="rep-insight-note rep-insight-note--blue">
                <h4 className="rep-note-title">Task Pipeline Saturation</h4>
                <p className="rep-note-body">
                  Currently tracking <strong>{fmt(data?.pending_tasks || 0)}</strong> active pipeline items. Multi-threaded resource balancing is active.
                </p>
              </div>
              <div className="rep-insight-note rep-insight-note--apricot">
                <h4 className="rep-note-title">Breached Schedule Risks</h4>
                <p className="rep-note-body">
                  Detected <strong>{fmt(data?.overdue_tasks || 0)}</strong> items with expired deadlines. Modification of resource priority queue suggested.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Panel 4: Resolution Ledger Table */}
        <div className="rep-glass-card rep-ledger-column">
          <div className="rep-ledger-header">
            <h3 className="rep-ledger-title">Project Resolution Ledger</h3>
            <div className="rep-ledger-controls">
              <div className="rep-search-box">
                <Search size={14} className="rep-search-box-icon" />
                <input
                  type="text"
                  placeholder="Search project ledger..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="rep-filter-btn" title="Clear Filter" onClick={() => setSearchQuery("")}>
                <Filter size={14} />
              </button>
            </div>
          </div>

          <div className="rep-table-wrapper">
            <table className="rep-table">
              <thead>
                <tr>
                  <th>Project Identity</th>
                  <th>Total Tasks</th>
                  <th>Completions</th>
                  <th>Proportion Graph</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1, 2, 3, 4, 5].map((n) => (
                    <tr key={n}>
                      <td><div className="rep-skeleton rep-sk-l" style={{ width: "120px" }} /></td>
                      <td><div className="rep-skeleton rep-sk-l" style={{ width: "50px" }} /></td>
                      <td><div className="rep-skeleton rep-sk-l" style={{ width: "50px" }} /></td>
                      <td><div className="rep-skeleton rep-sk-l" style={{ width: "100px", height: "6px" }} /></td>
                    </tr>
                  ))
                ) : filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "32px", color: "var(--rep-ash)" }}>
                      No matching projects found in ledger.
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((proj, idx) => {
                    const ratio = proj.tasks > 0 ? Math.min(100, Math.round((proj.completed / proj.tasks) * 100)) : 0;
                    
                    let badgeClass = "rep-badge--progress";
                    let badgeLabel = "Progressing";
                    if (ratio === 100) {
                      badgeClass = "rep-badge--resolved";
                      badgeLabel = "Resolved";
                    } else if (ratio < 40 && proj.tasks > 0) {
                      badgeClass = "rep-badge--delayed";
                      badgeLabel = "At Risk";
                    }

                    return (
                      <tr
                        key={idx}
                        style={{ cursor: proj.id ? "pointer" : "default" }}
                        onClick={() => proj.id && navigate(`/dashboard/projects/${proj.id}`)}
                      >
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <div className="rep-table-icon-box rep-table-icon-box--sky">
                              <Layers size={14} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: "var(--rep-ink)" }}>{proj.project}</div>
                              <div className={`rep-badge ${badgeClass}`} style={{ marginTop: "4px" }}>{badgeLabel}</div>
                            </div>
                          </div>
                        </td>
                        <td>{fmt(proj.tasks)} items</td>
                        <td style={{ color: "var(--rep-success-green)", fontWeight: 500 }}>{fmt(proj.completed)} items</td>
                        <td>
                          <div className="rep-table-progress-group">
                            <div className="rep-table-track">
                              <div className="rep-table-fill" style={{ width: `${ratio}%` }} />
                            </div>
                            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--rep-ink-muted)" }}>{ratio}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}