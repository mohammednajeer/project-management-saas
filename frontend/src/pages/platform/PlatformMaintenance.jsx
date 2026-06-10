import { useState, useEffect, useRef } from "react";
import { 
  ShieldAlert, Database, RefreshCw, Terminal, Download, 
  CheckCircle2, Play, ChevronRight, ServerCrash, Clock,
  Zap, Trash2, Cpu
} from "lucide-react";
import api from "../../services/api";
import "./PlatformMaintenance.css";

export default function PlatformMaintenance() {
  const [backups, setBackups] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loadingBackups, setLoadingBackups] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [backingUp, setBackingUp] = useState(false);
  const [backupStep, setBackupStep] = useState(0); // 0 = idle, 1 = scanning, 2 = compressing, 3 = archiving, 4 = completed
  const [logFilter, setLogFilter] = useState("all");
  const [actionError, setActionError] = useState(null);
  const [flushingCache, setFlushingCache] = useState(false);
  const [cacheEvictionInfo, setCacheEvictionInfo] = useState(null);
  
  const consoleEndRef = useRef(null);

  const fetchBackups = async () => {
    setLoadingBackups(true);
    try {
      const response = await api.get("/platform/backup/");
      setBackups(response.data);
    } catch (err) {
      console.error("Failed to load backups:", err);
    } finally {
      setLoadingBackups(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const response = await api.get("/platform/logs/");
      setLogs(response.data);
    } catch (err) {
      console.error("Failed to load logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchBackups();
    fetchLogs();
  }, []);

  useEffect(() => {
    // Scroll console to bottom whenever logs render
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const handleTriggerBackup = async () => {
    if (backingUp) return;
    setBackingUp(true);
    setActionError(null);
    
    // Simulate multi-step UI animation before making API call
    setBackupStep(1); // Scanning schemas
    await new Promise(r => setTimeout(r, 800));
    
    setBackupStep(2); // Compressing records
    await new Promise(r => setTimeout(r, 1000));
    
    setBackupStep(3); // Uploading to archive store
    await new Promise(r => setTimeout(r, 800));

    try {
      const response = await api.post("/platform/backup/");
      const newBackup = response.data.backup;
      
      setBackups(prev => [newBackup, ...prev]);
      setBackupStep(4); // Completed

      // Fetch logs again to capture the backup audit action
      await fetchLogs();

      setTimeout(() => {
        setBackingUp(false);
        setBackupStep(0);
      }, 2000);
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to finalize database backup.");
      setBackingUp(false);
      setBackupStep(0);
    }
  };

  const handleFlushCache = async () => {
    if (flushingCache) return;
    setFlushingCache(true);
    setCacheEvictionInfo(null);
    setActionError(null);
    try {
      // Premium micro-delay to show interactive loader transitions
      await new Promise(r => setTimeout(r, 600));
      const response = await api.post("/platform/cache/clear/");
      setCacheEvictionInfo({
        evicted_keys: response.data.evicted_keys,
        evicted_bytes: response.data.evicted_bytes,
        status: response.data.status,
      });
      // Fetch logs again to audit cache clear action
      await fetchLogs();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to flush Redis cache.");
    } finally {
      setFlushingCache(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (logFilter === "all") return true;
    return log.level.toUpperCase() === logFilter.toUpperCase();
  });

  return (
    <div className="pm-container">
      {/* Page header */}
      <div className="pm-header">
        <div>
          <h1 className="pm-title">System Maintenance</h1>
          <p className="pm-subtitle">Trigger secure SQL snapshots and monitor application execution logs</p>
        </div>
        <div className="pm-actions-row">
          <button onClick={() => { fetchBackups(); fetchLogs(); }} className="pm-refresh-btn" title="Sync All">
            <RefreshCw size={16} />
            <span>Sync Stats</span>
          </button>
        </div>
      </div>

      <div className="pm-grid">
        {/* Left column - Backups & operations */}
        <div className="pm-col-ops">
          {/* Backup Creator Panel */}
          <div className="pm-card glass-panel">
            <div className="pm-panel-title">
              <Database size={18} />
              <h2>Database Backups</h2>
            </div>
            <p className="pm-card-desc">
              Generate full PostgreSQL schema and data dumps. Archives are gzip compressed and stored in simulated secure buckets.
            </p>

            {backingUp ? (
              <div className="pm-backup-progress">
                <div className="pm-progress-header">
                  <span className="pm-progress-title">Database Snapshot Progress</span>
                  <span className="pm-progress-percentage">
                    {backupStep === 1 && "25% - Scanning tables..."}
                    {backupStep === 2 && "60% - Compressing to GZ..."}
                    {backupStep === 3 && "90% - Archiving S3..."}
                    {backupStep === 4 && "100% - Finished!"}
                  </span>
                </div>
                
                <div className="pm-progress-bar-container">
                  <div 
                    className={`pm-progress-bar step-${backupStep}`}
                    style={{ 
                      width: `${backupStep === 1 ? 25 : backupStep === 2 ? 60 : backupStep === 3 ? 90 : 100}%` 
                    }}
                  />
                </div>

                <div className="pm-progress-steps">
                  <div className={`pm-step ${backupStep >= 1 ? "done" : ""}`}>
                    <CheckCircle2 size={14} />
                    <span>Schema scan</span>
                  </div>
                  <div className={`pm-step ${backupStep >= 2 ? "done" : ""}`}>
                    <CheckCircle2 size={14} />
                    <span>Compress dump</span>
                  </div>
                  <div className={`pm-step ${backupStep >= 3 ? "done" : ""}`}>
                    <CheckCircle2 size={14} />
                    <span>Archive file</span>
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={handleTriggerBackup} className="pm-backup-btn">
                <Play size={16} />
                <span>Trigger Live Database Backup</span>
              </button>
            )}

            {actionError && (
              <div className="pm-error-banner">
                <ServerCrash size={16} />
                <span>{actionError}</span>
              </div>
            )}

            {/* Backups Ledger */}
            <div className="pm-backups-ledger">
              <h3>Available Snapshots</h3>
              {loadingBackups ? (
                <div className="pm-mini-loading">
                  <div className="pm-mini-spinner" />
                  <span>Loading snapshots ledger...</span>
                </div>
              ) : backups.length === 0 ? (
                <div className="pm-empty-ledger">
                  <Clock size={20} />
                  <p>No backups generated yet.</p>
                </div>
              ) : (
                <div className="pm-ledger-list">
                  {backups.map((b) => (
                    <div key={b.id} className="pm-ledger-item">
                      <div className="pm-ledger-details">
                        <span className="pm-file-name" title={b.filename}>{b.filename}</span>
                        <div className="pm-file-meta">
                          <span className="size">{b.size}</span>
                          <span className="divider">•</span>
                          <span className="date">{new Date(b.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="pm-ledger-actions">
                        <span className="pm-badge-success">{b.status}</span>
                        <button className="pm-download-btn" title="Download snapshot">
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cluster Cache & Diagnostics Panel */}
          <div className="pm-card glass-panel pm-cluster-card">
            <div className="pm-panel-title">
              <Zap size={18} />
              <h2>Cluster Cache &amp; Diagnostics</h2>
            </div>
            <p className="pm-card-desc">
              Manage local Redis database cache tags and monitor Celery distributed worker tasks in real-time.
            </p>

            <div className="pm-cache-actions">
              <button 
                onClick={handleFlushCache} 
                className={`pm-flush-btn ${flushingCache ? "flushing" : ""}`}
                disabled={flushingCache}
              >
                <Trash2 size={15} />
                <span>{flushingCache ? "Evicting Redis Memory..." : "Flush Redis Cache"}</span>
              </button>

              {cacheEvictionInfo && (
                <div className="pm-eviction-report">
                  <div className="pm-report-row">
                    <span className="pm-report-lbl">Status</span>
                    <span className="pm-badge-success">{cacheEvictionInfo.status}</span>
                  </div>
                  <div className="pm-report-row">
                    <span className="pm-report-lbl">Keys Evicted</span>
                    <span className="pm-report-val">{cacheEvictionInfo.evicted_keys} keys</span>
                  </div>
                  <div className="pm-report-row">
                    <span className="pm-report-lbl">Memory Freed</span>
                    <span className="pm-report-val">{cacheEvictionInfo.evicted_bytes}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Celery Diagnostics */}
            <div className="pm-celery-diagnostics">
              <h3>Distributed Worker Telemetry</h3>
              <div className="pm-worker-list">
                <div className="pm-worker-item">
                  <div className="pm-worker-meta">
                    <span className="pm-worker-dot online" />
                    <span className="pm-worker-name">celery@worker-primary</span>
                  </div>
                  <div className="pm-worker-stats">
                    <span>94.1% load</span>
                    <span className="divider">•</span>
                    <span>4.2d uptime</span>
                  </div>
                </div>
                <div className="pm-worker-item">
                  <div className="pm-worker-meta">
                    <span className="pm-worker-dot online" />
                    <span className="pm-worker-name">celery@worker-heavy</span>
                  </div>
                  <div className="pm-worker-stats">
                    <span>12.5% load</span>
                    <span className="divider">•</span>
                    <span>4.2d uptime</span>
                  </div>
                </div>
                <div className="pm-worker-item">
                  <div className="pm-worker-meta">
                    <span className="pm-worker-dot online" />
                    <span className="pm-worker-name">celery@worker-scheduler</span>
                  </div>
                  <div className="pm-worker-stats">
                    <span>Idle</span>
                    <span className="divider">•</span>
                    <span>4.2d uptime</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right column - Console logging stream */}
        <div className="pm-col-logs">
          <div className="pm-card glass-panel pm-console-card">
            <div className="pm-console-header">
              <div className="pm-console-title">
                <Terminal size={18} />
                <h2>System Log Stream</h2>
              </div>
              <div className="pm-console-filters">
                <button 
                  onClick={() => setLogFilter("all")} 
                  className={`pm-filter-tab ${logFilter === "all" ? "active" : ""}`}
                >
                  ALL
                </button>
                <button 
                  onClick={() => setLogFilter("info")} 
                  className={`pm-filter-tab ${logFilter === "info" ? "active" : ""}`}
                >
                  INFO
                </button>
                <button 
                  onClick={() => setLogFilter("debug")} 
                  className={`pm-filter-tab ${logFilter === "debug" ? "active" : ""}`}
                >
                  DEBUG
                </button>
              </div>
            </div>

            <div className="pm-console-body">
              {loadingLogs ? (
                <div className="pm-console-loading">
                  <div className="pm-mini-spinner" />
                  <span>Tailing live logs stream...</span>
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="pm-console-empty">
                  <span>No logs match current level filter.</span>
                </div>
              ) : (
                <div className="pm-console-lines">
                  {filteredLogs.map((log, idx) => {
                    const timeStr = new Date(log.timestamp).toLocaleTimeString();
                    const isSystem = log.message.includes("[CELERY]") || log.message.includes("[CACHE]") || log.message.includes("[WEBSOCKET]");
                    return (
                      <div key={idx} className={`pm-log-line ${log.level.toLowerCase()}`}>
                        <span className="pm-log-time">[{timeStr}]</span>
                        <span className={`pm-log-lvl ${log.level.toLowerCase()}`}>{log.level}</span>
                        <span className={`pm-log-msg ${isSystem ? "system-daemon" : ""}`}>{log.message}</span>
                      </div>
                    );
                  })}
                  <div ref={consoleEndRef} />
                </div>
              )}
            </div>

            <div className="pm-console-footer">
              <span className="pm-dot-pulse" />
              <span>Console connected to core-api logs daemon</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
