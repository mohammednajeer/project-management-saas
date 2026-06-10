import { useState, useEffect } from "react";
import { 
  Building2, Users, FolderOpen, CheckSquare, 
  Cpu, HardDrive, ShieldAlert, Activity, RefreshCw, Database,
  Terminal, ShieldCheck, AlertOctagon, Info
} from "lucide-react";
import api from "../../services/api";
import "./PlatformDashboard.css";

export default function PlatformDashboard() {
  const [data, setData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatsAndSessions = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [statsRes, sessionsRes] = await Promise.all([
        api.get("/platform/stats/"),
        api.get("/platform/sessions/")
      ]);
      setData(statsRes.data);
      setSessions(sessionsRes.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load system operations registry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatsAndSessions();
  }, []);

  if (loading) {
    return (
      <div className="pd-loading-container">
        <div className="pd-spinner" />
        <p>Analyzing cluster telemetry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pd-error-container">
        <ShieldAlert size={48} className="pd-error-icon" />
        <h3>SaaS Cluster Unreachable</h3>
        <p>{error}</p>
        <button onClick={() => fetchStatsAndSessions()} className="pd-retry-btn">
          Reconnect System Controller
        </button>
      </div>
    );
  }

  const { totals, system, growth, db_table_sizes, api_status_codes, recent_incidents } = data || {};

  return (
    <div className="pd-container">
      {/* Editorial Hero Banner */}
      <div className="pd-hero">
        <div className="pd-hero-left">
          <div className="pd-hero-eyebrow">
            <span className="pd-pulse" />
            <span>Platform Controller Live</span>
          </div>
          <h1 className="pd-hero-title">Platform Operations Overview</h1>
          <p className="pd-hero-sub">
            Monitor system-wide metrics, manage workspaces, inspect live tail logs, and perform secure database backup cycles.
          </p>
          <div className="pd-hero-meta">
            <div className="pd-meta-badge apricot">
              <strong>{totals.organizations}</strong> Workspaces
            </div>
            <div className="pd-meta-badge sky">
              <strong>{totals.users}</strong> Users
            </div>
          </div>
        </div>
        <div className="pd-hero-right">
          {/* Custom System Cluster SVG Illustration */}
          <svg className="pd-hero-illustration" viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Server Rack Node 1 */}
            <rect x="20" y="20" width="160" height="22" rx="4" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
            <circle cx="35" cy="31" r="3" fill="#fbe1d1" />
            <rect x="48" y="28" width="60" height="6" rx="3" fill="rgba(255,255,255,0.3)" />
            <circle cx="155" cy="31" r="3.5" fill="#22c55e" />
            <circle cx="167" cy="31" r="2.5" fill="rgba(255,255,255,0.2)" />

            {/* Server Rack Node 2 */}
            <rect x="20" y="48" width="160" height="22" rx="4" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
            <circle cx="35" cy="59" r="3" fill="#d3e3fc" />
            <rect x="48" y="56" width="80" height="6" rx="3" fill="rgba(255,255,255,0.3)" />
            <circle cx="155" cy="59" r="3.5" fill="#22c55e" />
            <circle cx="167" cy="59" r="2.5" fill="#22c55e" />

            {/* Server Rack Node 3 */}
            <rect x="20" y="76" width="160" height="22" rx="4" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
            <circle cx="35" cy="87" r="3" fill="#ffffff" />
            <rect x="48" y="84" width="45" height="6" rx="3" fill="rgba(255,255,255,0.3)" />
            <circle cx="155" cy="87" r="3.5" fill="#22c55e" />
            <circle cx="167" cy="87" r="2.5" fill="rgba(255,255,255,0.2)" />
          </svg>
        </div>
      </div>

      {/* Grid Header Controls */}
      <div className="pd-section-header">
        <h2 className="pd-section-title">Telemetry Ledger</h2>
        <button 
          onClick={() => fetchStatsAndSessions(true)} 
          className={`pd-refresh-btn ${refreshing ? "spinning" : ""}`}
          disabled={refreshing}
        >
          <RefreshCw size={14} />
          <span>{refreshing ? "Refreshing..." : "Refresh Status"}</span>
        </button>
      </div>

      {/* Stats Cards grid */}
      <div className="pd-grid-metrics">
        <div className="pd-metric-card apricot-card">
          <div className="pd-metric-card-header">
            <span className="pd-icon-box apricot">
              <Building2 size={18} />
            </span>
            <span className="pd-card-status">Active Workspaces</span>
          </div>
          <div className="pd-metric-card-body">
            <h3>{totals.organizations}</h3>
            <div className="pd-card-sub">
              <span>{totals.active_organizations} Online</span>
              <span className="pd-bullet-sep">•</span>
              <span>{totals.organizations - totals.active_organizations} Suspended</span>
            </div>
          </div>
        </div>

        <div className="pd-metric-card sky-card">
          <div className="pd-metric-card-header">
            <span className="pd-icon-box sky">
              <Users size={18} />
            </span>
            <span className="pd-card-status">User Registry</span>
          </div>
          <div className="pd-metric-card-body">
            <h3>{totals.users}</h3>
            <div className="pd-card-sub">
              <span>{totals.active_users} Active</span>
              <span className="pd-bullet-sep">•</span>
              <span>{totals.users - totals.active_users} Idle</span>
            </div>
          </div>
        </div>

        <div className="pd-metric-card neutral-card">
          <div className="pd-metric-card-header">
            <span className="pd-icon-box neutral">
              <FolderOpen size={18} />
            </span>
            <span className="pd-card-status">Project Volume</span>
          </div>
          <div className="pd-metric-card-body">
            <h3>{totals.projects}</h3>
            <div className="pd-card-sub">
              <span>Active Projects Handling</span>
            </div>
          </div>
        </div>

        <div className="pd-metric-card neutral-card">
          <div className="pd-metric-card-header">
            <span className="pd-icon-box neutral">
              <CheckSquare size={18} />
            </span>
            <span className="pd-card-status">Tasks Managed</span>
          </div>
          <div className="pd-metric-card-body">
            <h3>{totals.tasks}</h3>
            <div className="pd-card-sub">
              <span>{totals.completed_tasks} Done</span>
              <span className="pd-bullet-sep">•</span>
              <span>{totals.tasks - totals.completed_tasks} Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Dials and Charts block */}
      <div className="pd-telemetry-row">
        {/* System Health */}
        <div className="pd-card-panel">
          <div className="pd-panel-header">
            <Activity size={16} />
            <h4>Cluster Performance</h4>
          </div>

          <div className="pd-gauges-container">
            {/* CPU Gauge - Apricot Wash Theme */}
            <div className="pd-gauge-block">
              <div className="pd-gauge-chart">
                <svg viewBox="0 0 36 36" className="pd-svg-dial">
                  <path className="pd-dial-track"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path className="pd-dial-fill apricot"
                    strokeDasharray={`${system.cpu_usage_pct}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <text x="18" y="20.5" className="pd-dial-text">{system.cpu_usage_pct}%</text>
                </svg>
              </div>
              <span className="pd-gauge-lbl">
                <Cpu size={12} />
                <span>CPU Load</span>
              </span>
            </div>

            {/* RAM Gauge - Sky Wash Theme */}
            <div className="pd-gauge-block">
              <div className="pd-gauge-chart">
                <svg viewBox="0 0 36 36" className="pd-svg-dial">
                  <path className="pd-dial-track"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path className="pd-dial-fill sky"
                    strokeDasharray={`${system.ram_usage_pct}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <text x="18" y="20.5" className="pd-dial-text">{system.ram_usage_pct}%</text>
                </svg>
              </div>
              <span className="pd-gauge-lbl">
                <HardDrive size={12} />
                <span>Memory Pool</span>
              </span>
            </div>
          </div>

          <div className="pd-panel-list-specs">
            <div className="pd-spec-row">
              <span className="lbl">API Sockets</span>
              <strong className="val">{system.active_ws_connections} WS active</strong>
            </div>
            <div className="pd-spec-row">
              <span className="lbl">Database Health</span>
              <strong className="val badge success">{system.db_status}</strong>
            </div>
            <div className="pd-spec-row">
              <span className="lbl">Redis State</span>
              <strong className="val badge success">{system.redis_status}</strong>
            </div>
            <div className="pd-spec-row">
              <span className="lbl">Asset Storage</span>
              <strong className="val">{system.storage_provider}</strong>
            </div>
          </div>
        </div>

        {/* Growth Trend */}
        <div className="pd-card-panel">
          <div className="pd-panel-header">
            <Database size={16} />
            <h4>SaaS Tenant registration</h4>
          </div>
          <p className="pd-panel-desc">Active workspace count over trailing weeks</p>

          <div className="pd-growth-visual">
            <div className="pd-visual-chart">
              {growth.map((g, idx) => {
                const maxVal = Math.max(...growth.map(o => o.workspaces), 1);
                const pct = Math.max((g.workspaces / maxVal) * 80, 15);
                return (
                  <div key={idx} className="pd-visual-col">
                    <div className="pd-visual-tooltip">{g.workspaces} Orgs</div>
                    <div className="pd-visual-bar" style={{ height: `${pct}%` }} />
                    <span className="pd-visual-lbl">{g.week}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pd-panel-extra-info">
            <div className="pd-info-row">
              <span>Open Issues System-wide</span>
              <strong>{totals.open_issues} issues</strong>
            </div>
            <div className="pd-info-row">
              <span>Simulated DB Schemas</span>
              <strong>37 entities</strong>
            </div>
          </div>
        </div>
      </div>

      {/* NEW SECTION: Enterprise Database Sizes & Active User Sessions */}
      <div className="pd-telemetry-row">
        {/* DB Tables Allocation Sizing */}
        <div className="pd-card-panel">
          <div className="pd-panel-header">
            <Terminal size={16} />
            <h4>PostgreSQL Table Spaces Allocation</h4>
          </div>
          <p className="pd-panel-desc">Top database tables ranked by memory size and records</p>
          
          <div className="pd-table-sizes-list">
            {db_table_sizes.map((item, idx) => (
              <div key={idx} className="pd-table-size-item">
                <div className="pd-table-size-name">
                  <span className="pd-table-dot" />
                  <strong>{item.table}</strong>
                </div>
                <div className="pd-table-size-meta">
                  <span className="records">{item.records} records</span>
                  <span className="size-badge">{item.size}</span>
                </div>
              </div>
            ))}
          </div>

          {/* API Response code distribution summary */}
          <div className="pd-api-status-dist">
            <div className="pd-api-dist-title">API Response status codes (Trailing 24h)</div>
            <div className="pd-api-dist-bar-container">
              {api_status_codes.map((code, idx) => (
                <div 
                  key={idx}
                  className={`pd-api-dist-segment segment-${idx}`}
                  style={{ width: `${code.percentage}%` }}
                  title={`${code.status}: ${code.count} (${code.percentage}%)`}
                />
              ))}
            </div>
            <div className="pd-api-dist-legends">
              {api_status_codes.map((code, idx) => (
                <div key={idx} className="pd-api-legend-item">
                  <span className={`legend-dot segment-${idx}`} />
                  <span>{code.status} ({code.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Active Sessions & Incidents */}
        <div className="pd-card-panel">
          <div className="pd-panel-header">
            <ShieldCheck size={16} />
            <h4>Live Active Sessions</h4>
          </div>
          <p className="pd-panel-desc">Recent user login records across the platform</p>

          <div className="pd-sessions-list">
            {sessions.length === 0 ? (
              <p className="pd-empty-sessions">No active sessions tracked.</p>
            ) : (
              sessions.map((session) => {
                const lastLoginStr = session.last_login ? new Date(session.last_login).toLocaleString() : "Never";
                return (
                  <div key={session.id} className="pd-session-item">
                    <div className="pd-session-info">
                      <span className="user-email">{session.user_email} ({session.user_name})</span>
                      <span className="meta">Role: {session.role.replace('_', ' ')}</span>
                    </div>
                    <div className="pd-session-loc">
                      <span>Last Login: {lastLoginStr}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Recent System Incidents / Alert Feed */}
          <div className="pd-incidents-feed">
            <div className="pd-incidents-title">Recent Infrastructure Incidents</div>
            <div className="pd-incidents-list">
              {recent_incidents.map((incident) => (
                <div key={incident.id} className={`pd-incident-item ${incident.severity}`}>
                  {incident.severity === "critical" && <AlertOctagon size={14} className="icon-critical" />}
                  {incident.severity === "warning" && <ShieldAlert size={14} className="icon-warning" />}
                  {incident.severity === "info" && <Info size={14} className="icon-info" />}
                  <div className="pd-incident-body">
                    <div className="title">{incident.title}</div>
                    <div className="time">{new Date(incident.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
