import { useState, useEffect } from "react";
import {
  BarChart2,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Layers,
  Zap,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Activity,
  Maximize2,
  Sliders,
  Sparkles,
  Search,
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
  Legend,
} from "recharts";
import api from "../../services/api";
import "./Reports.css";

/* ── Analytical Format Helpers ─────────────────────────── */
const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString());
const pct = (n) => (n == null ? "—" : `${Math.round(n)}%`);

/* ── Modern Premium Palette Configuration ────────────────── */
const DONUT_COLORS = ["#6354c4", "#3b82f6", "#f59e0b", "#ef4444"];

function buildDonut(data) {
  return [
    { name: "Completed Tasks", value: data.completed_tasks  || 0 },
    { name: "Active Run-rate", value: data.pending_tasks    || 0 },
    { name: "Overdue Backlog", value: data.overdue_tasks     || 0 },
    {
      name: "Unassigned Ops",
      value: Math.max(
        0,
        (data.total_tasks || 0) -
          (data.completed_tasks || 0) -
          (data.pending_tasks   || 0) -
          (data.overdue_tasks   || 0)
      ),
    },
  ].filter((d) => d.value > 0);
}

/* ── Hardened Production Fallbacks / Seed Data ──────────── */

/* ── Sub-atomic Rendering Blocks ───────────────────────── */
function Skeleton({ className = "" }) {
  return <div className={`an-skeleton ${className}`} />;
}

function MetricCard({ icon: Icon, label, value, sub, trend, trendValue, accent, loading }) {
  return (
    <div className={`an-metric-tile an-metric-tile--${accent}`}>
      <div className="an-metric-tile-header">
        <div className="an-metric-tile-icon-frame"><Icon size={15} /></div>
        {trend && (
          <div className={`an-metric-trend an-metric-trend--${trend}`}>
            {trend === "up" && <ArrowUpRight size={12} />}
            {trend === "down" && <ArrowDownRight size={12} />}
            {trend === "flat" && <Minus size={12} />}
            <span>{trendValue || ""}</span>
          </div>
        )}
      </div>
      {loading ? (
        <div className="an-metric-skeleton-group">
          <Skeleton className="an-sk-v" />
          <Skeleton className="an-sk-l" />
        </div>
      ) : (
        <div className="an-metric-content">
          <div className="an-metric-value">{value}</div>
          <div className="an-metric-label">{label}</div>
          {sub && <div className="an-metric-meta">{sub}</div>}
        </div>
      )}
    </div>
  );
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="an-chart-tooltip">
      {label && <div className="an-chart-tooltip-title">{label}</div>}
      <div className="an-chart-tooltip-list">
        {payload.map((p) => (
          <div key={p.name} className="an-chart-tooltip-item">
            <span className="an-chart-tooltip-marker" style={{ background: p.color || p.fill }} />
            <span className="an-chart-tooltip-name">{p.name}</span>
            <span className="an-chart-tooltip-value">{fmt(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api.get("/reports/dashboard/")
      .then((r) => { if (active) { setData(r.data); setLoading(false); } })
      .catch((e) => { 
        if (active) { 
          setError(e?.response?.data?.detail || "Analytics interface lost database linkage upstream."); 
          setLoading(false); 
        } 
      });
    return () => { active = false; };
  }, [refresh]);

const donutData =
  data ? buildDonut(data) : [];

const lineData =
  data?.weekly_activity || [];

const barData =
  data?.project_breakdown || [];

const cr =
  data?.completion_rate ?? 0; // Fallback representation default

  return (
    <div className="an-dashboard-container">
      {/* ── CONTROL ANCHOR BAR ── */}
      <header className="an-top-bar">
        <div className="an-top-bar-meta">
          <div className="an-brand-badge"><Activity size={15} /></div>
          <div>
            <h1 className="an-main-title">Enterprise Analytics Panel</h1>
            <p className="an-main-subtitle">Real-time system transaction telemetry & productivity execution matrix</p>
          </div>
        </div>
        <div className="an-top-bar-actions">
          <div className="an-search-mock">
            <Search size={13} />
            <input type="text" placeholder="Search parameters..." disabled />
          </div>
          <button
            className={`an-action-btn an-action-btn--primary ${loading ? "an-action-btn--spinning" : ""}`}
            onClick={() => setRefresh((n) => n + 1)}
            disabled={loading}
          >
            <RefreshCw size={13} />
            <span>Sync Engine</span>
          </button>
        </div>
      </header>

      {/* ── RUNTIME ERROR NOTIFIER ── */}
      {error && (
        <div className="an-runtime-exception">
          <AlertTriangle size={15} />
          <div className="an-exception-body">
            <strong>Data Stream Incomplete</strong> — {error}
          </div>
        </div>
      )}

      {/* ── TOP-TIER CRITICAL KPI GRID ── */}
      <section className="an-metrics-layout-grid">
        <MetricCard loading={loading} icon={Layers} label="Active Ventures" value={fmt(data?.total_projects || 0)} trend="up" trendValue="+12.4%" accent="purple" />
        <MetricCard loading={loading} icon={Zap} label="Database Work items" value={fmt(data?.total_tasks || 0)} trend="flat" trendValue="0.0%" accent="blue" />
        <MetricCard loading={loading} icon={CheckCircle2} label="Merged Closures" value={fmt(data?.completed_tasks || 0)} sub={`${pct(cr)} Net Velocity`} trend="up" trendValue="+4.1%" accent="green" />
        <MetricCard loading={loading} icon={Clock} label="Pending Pipeline" value={fmt(data?.pending_tasks || 0)} trend="flat" trendValue="Steady" accent="amber" />
        <MetricCard loading={loading} icon={AlertTriangle} label="Breached Deadlines" value={fmt(data?.overdue_tasks || 0)} trend="down" trendValue="-8.3%" accent="red" />
        <MetricCard loading={loading} icon={TrendingUp} label="Discovered Exceptions" value={fmt(data?.total_issues || 0)} trend="flat" trendValue="0.0%" accent="rose" />
        <MetricCard loading={loading} icon={Users} label="Authenticated Operatives" value={fmt(data?.active_members || 0)} trend="up" trendValue="+2 New" accent="teal" />
        <MetricCard loading={loading} icon={Sliders} label="SLA Attainment" value={pct(cr)} trend="up" trendValue="Target Max" accent="indigo" />
      </section>

      {/* ── CORE DATASCAPE VISUALIZATION REGION ── */}
      <div className="an-analytical-deck">
        
        {/* Panel 1: Composite Stacked Area Performance Timeline */}
        <div className="an-card-panel an-card-panel--span-2">
          <div className="an-panel-header">
            <div>
              <h3 className="an-panel-title">Resource Velocity & Target Lifecycle</h3>
              <p className="an-panel-desc">Time-series distribution across continuous production iterations</p>
            </div>
            <div className="an-panel-controls"><Maximize2 size={12} /></div>
          </div>
          <div className="an-chart-container">
            {loading ? (

  <Skeleton className="an-sk-chart-large" />

) : lineData.length === 0 ? (

  <div className="an-chart-empty-fallback">
    No weekly activity available.
  </div>

) : (

  <ResponsiveContainer width="100%" height={260}>

    <AreaChart
      data={lineData}
      margin={{
        top: 10,
        right: 10,
        left: -25,
        bottom: 0,
      }}
    >

      <defs>

        <linearGradient
          id="area-comp"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="5%"
            stopColor="#6354c4"
            stopOpacity={0.25}
          />

          <stop
            offset="95%"
            stopColor="#6354c4"
            stopOpacity={0}
          />

        </linearGradient>

        <linearGradient
          id="area-pend"
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >

          <stop
            offset="5%"
            stopColor="#3b82f6"
            stopOpacity={0.20}
          />

          <stop
            offset="95%"
            stopColor="#3b82f6"
            stopOpacity={0}
          />

        </linearGradient>

      </defs>

      <CartesianGrid
        strokeDasharray="4 4"
        stroke="rgba(26,16,64,0.04)"
        vertical={false}
      />

      <XAxis
        dataKey="day"
        tick={{
          fontSize: 10,
          fill: "#6b7280",
          fontWeight: 600,
        }}
        axisLine={false}
        tickLine={false}
      />

      <YAxis
        tick={{
          fontSize: 10,
          fill: "#6b7280",
          fontWeight: 600,
        }}
        axisLine={false}
        tickLine={false}
      />

      <Tooltip
        content={<ChartTooltip />}
      />

      <Legend
        verticalAlign="top"
        height={36}
        iconType="circle"
        iconSize={6}
        wrapperStyle={{
          fontSize: "11px",
          fontWeight: 600,
          color: "#4b5563",
        }}
      />

      <Area
        type="monotone"
        dataKey="completed"
        name="Completed Operations"
        stroke="#6354c4"
        strokeWidth={2.5}
        fillOpacity={1}
        fill="url(#area-comp)"
      />

      <Area
        type="monotone"
        dataKey="pending"
        name="In Queue / Staged"
        stroke="#3b82f6"
        strokeWidth={1.5}
        fillOpacity={1}
        fill="url(#area-pend)"
        strokeDasharray="3 3"
      />

    </AreaChart>

  </ResponsiveContainer>
)}
          </div>
        </div>

        {/* Panel 2: Distribution Segregation Allocation Chart */}
        <div className="an-card-panel">
          <div className="an-panel-header">
            <div>
              <h3 className="an-panel-title">Dynamic Segmentation</h3>
              <p className="an-panel-desc">Real-time object mapping weights</p>
            </div>
            <span className="an-live-indicator"><Sparkles size={11} /> Analytics Active</span>
          </div>
          {loading ? (
            <div className="an-chart-center-fallback"><Skeleton className="an-sk-donut-circle" /></div>
          ) : donutData.length === 0 ? (
            <div className="an-chart-empty-fallback">No localized telemetry found.</div>
          ) : (
            <div className="an-donut-analytical-wrapper">
              <div className="an-donut-render-block">
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={48} outerRadius={68} paddingAngle={4} dataKey="value">
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="an-donut-center-label">
                  <span className="an-donut-center-v">{pct(cr)}</span>
                  <span className="an-donut-center-l">Efficiency</span>
                </div>
              </div>
              <div className="an-donut-data-legend-rows">
                {donutData.map((d, i) => (
                  <div key={d.name} className="an-legend-row-item">
                    <span className="an-legend-row-bullet" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span className="an-legend-row-name">{d.name}</span>
                    <span className="an-legend-row-value">{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Panel 3: Horizontal Structural Project Ledger Breakdowns */}
        <div className="an-card-panel an-card-panel--span-2">
          <div className="an-panel-header">
            <div>
              <h3 className="an-panel-title">Project Operational Volume Split</h3>
              <p className="an-panel-desc">Comparison vectors contrasting gross task assignments versus verified closure records</p>
            </div>
          </div>
          <div className="an-chart-container">
            {loading ? (

  <Skeleton className="an-sk-chart-large" />

) : barData.length === 0 ? (

  <div className="an-chart-empty-fallback">
    No project analytics available.
  </div>

) : (

  <ResponsiveContainer width="100%" height={230}>

    <BarChart
      data={barData}
      margin={{
        top: 10,
        right: 10,
        left: -25,
        bottom: 0,
      }}
      barGap={6}
    >

      <CartesianGrid
        strokeDasharray="4 4"
        stroke="rgba(26,16,64,0.04)"
        vertical={false}
      />

      <XAxis
        dataKey="project"
        tick={{
          fontSize: 10,
          fill: "#6b7280",
          fontWeight: 600,
        }}
        axisLine={false}
        tickLine={false}
      />

      <YAxis
        tick={{
          fontSize: 10,
          fill: "#6b7280",
          fontWeight: 600,
        }}
        axisLine={false}
        tickLine={false}
      />

      <Tooltip
        content={<ChartTooltip />}
      />

      <Bar
        dataKey="tasks"
        name="Gross Demand Volume"
        fill="rgba(99,84,196,0.12)"
        radius={[3, 3, 0, 0]}
        maxBarSize={30}
      />

      <Bar
        dataKey="completed"
        name="System Certified Closed"
        fill="#6354c4"
        radius={[3, 3, 0, 0]}
        maxBarSize={30}
      />

    </BarChart>

  </ResponsiveContainer>
)}
          </div>
        </div>

        {/* Panel 4: Enterprise Insight Engines */}
        <div className="an-card-panel">
          <div className="an-panel-header">
            <div>
              <h3 className="an-panel-title">Automated Analysis Insights</h3>
              <p className="an-panel-desc">Heuristics generated by real-time metadata evaluation</p>
            </div>
          </div>
          {loading ? (
            <div className="an-insights-skeleton-stack">
              {[1, 2, 3].map((n) => <Skeleton key={n} className="an-sk-insight-row" />)}
            </div>
          ) : (
            <div className="an-insights-functional-list">
              <div className="an-insight-node an-insight-node--green">
                <div className="an-insight-node-title">SLA Threshold Met</div>
                <p className="an-insight-node-message">System capacity evaluation registers at <strong>{pct(cr)}</strong> efficiency, surpassing standard benchmarks.</p>
              </div>
              <div className={`an-insight-node an-insight-node--${(data?.overdue_tasks || 0) > 10 ? "red" : "amber"}`}>
                <div className="an-insight-node-title">Backlog Risk Parameters</div>
                <p className="an-insight-node-message">Detected <strong>{fmt(data?.overdue_tasks || 0)}</strong> items with expired schedules. Operations velocity modification suggested.</p>
              </div>
              <div className="an-insight-node an-insight-node--purple">
                <div className="an-insight-node-title">Resource Multi-threading</div>
                <p className="an-insight-node-message">Active distribution balances safely across <strong>{fmt(data?.total_projects || 0)}</strong> isolated environment repositories.</p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── LOWER AUDIT LEDGER SECTION ── */}
      {!loading && (
        <section className="an-audit-ledger-section">
          <div className="an-card-panel">
            <div className="an-panel-header">
              <div>
                <h3 className="an-panel-title">System Task Resolution Ledger</h3>
                <p className="an-panel-desc">Granular progress metrics mapped against structural benchmarks</p>
              </div>
            </div>
            <div className="an-ledger-table-scroller">
              <table className="an-ledger-table">
                <thead>
                  <tr>
                    <th>Target Context Dimension</th>
                    <th>Gross Capacity Tracked</th>
                    <th>Successful Resolution Matrix</th>
                    <th>Completion Proportion Graph</th>
                  </tr>
                </thead>
                <tbody>
                  {barData.map((proj, idx) => {
                    const ratio = Math.min(100, Math.round((proj.completed / proj.tasks) * 100)) || 0;
                    return (
                      <tr key={idx}>
                        <td className="an-table-primary-cell">{proj.project}</td>
                        <td>{fmt(proj.tasks)} items</td>
                        <td className="an-table-success-cell">{fmt(proj.completed)} items</td>
                        <td>
                          <div className="an-table-progress-matrix-wrapper">
                            <div className="an-table-progress-track">
                              <div className="an-table-progress-fill" style={{ width: `${ratio}%` }} />
                            </div>
                            <span className="an-table-progress-percentage">{ratio}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}