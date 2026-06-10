import { useState, useEffect } from "react";
import { 
  Search, ShieldAlert, Building2, Calendar, 
  Users, FolderGit, AlertTriangle, RefreshCw, ToggleLeft, ToggleRight,
  ShieldCheck, Coins, Award
} from "lucide-react";
import api from "../../services/api";
import "./PlatformOrganizations.css";

export default function PlatformOrganizations() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [togglingId, setTogglingId] = useState(null);
  const [updatingTierId, setUpdatingTierId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  // Workspace details drawer state
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [selectedOrgDetails, setSelectedOrgDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsTab, setDetailsTab] = useState("info");

  const fetchOrgs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/platform/organizations/");
      setOrgs(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load organizations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const fetchOrgDetails = async (orgId) => {
    setLoadingDetails(true);
    try {
      const response = await api.get(`/platform/organizations/${orgId}/`);
      setSelectedOrgDetails(response.data);
    } catch (err) {
      console.error("Failed to load organization details:", err);
      setActionMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to load workspace details."
      });
      setTimeout(() => setActionMessage(null), 5000);
      setSelectedOrgId(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (selectedOrgId) {
      fetchOrgDetails(selectedOrgId);
      setDetailsTab("info");
    } else {
      setSelectedOrgDetails(null);
    }
  }, [selectedOrgId]);

  const handleToggleStatus = async (orgId, currentStatus, orgName) => {
    setTogglingId(orgId);
    setActionMessage(null);
    try {
      const response = await api.post(`/platform/organizations/${orgId}/toggle/`);
      const updatedOrg = response.data;
      
      // Update local state
      setOrgs(prevOrgs => 
        prevOrgs.map(org => 
          org.id === orgId ? { ...org, is_active: updatedOrg.is_active } : org
        )
      );

      setActionMessage({
        type: "success",
        text: `Workspace "${orgName}" has been successfully ${updatedOrg.is_active ? "activated" : "deactivated"}.`
      });

      // Clear action message after 4 seconds
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err.response?.data?.message || `Failed to toggle status for ${orgName}.`
      });
      setTimeout(() => setActionMessage(null), 5000);
    } finally {
      setTogglingId(null);
    }
  };

  const handleUpdateTier = async (orgId, nextTier, orgName) => {
    setUpdatingTierId(orgId);
    setActionMessage(null);
    try {
      await api.post(`/platform/organizations/${orgId}/tier/`, { tier: nextTier });
      
      // Update local state
      setOrgs(prevOrgs => 
        prevOrgs.map(org => 
          org.id === orgId ? { ...org, subscription_tier: nextTier } : org
        )
      );

      setActionMessage({
        type: "success",
        text: `Workspace "${orgName}" subscription tier updated to ${nextTier.toUpperCase()}`
      });

      setTimeout(() => setActionMessage(null), 4000);
    } catch (err) {
      setActionMessage({
        type: "error",
        text: err.response?.data?.message || `Failed to change subscription tier for ${orgName}.`
      });
      setTimeout(() => setActionMessage(null), 5000);
    } finally {
      setUpdatingTierId(null);
    }
  };

  // Filter organizations
  const filteredOrgs = orgs.filter(org => {
    const matchesSearch = 
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.company_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (org.email && org.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = 
      statusFilter === "all" ? true :
      statusFilter === "active" ? org.is_active === true :
      org.is_active === false;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="po-loading-container">
        <div className="po-spinner" />
        <p>Loading workspaces ledger...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="po-error-container">
        <ShieldAlert size={48} className="po-error-icon" />
        <h3>Workspace Registry Error</h3>
        <p>{error}</p>
        <button onClick={fetchOrgs} className="po-retry-btn">
          Retry Registry Load
        </button>
      </div>
    );
  }

  return (
    <div className="po-container">
      {/* Page header */}
      <div className="po-header">
        <div>
          <h1 className="po-title">Workspaces Registry</h1>
          <p className="po-subtitle">Review active companies, subscription levels, user counts, and workspace access locks</p>
        </div>
        <button onClick={fetchOrgs} className="po-refresh-btn" title="Refresh list">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Action feedbacks */}
      {actionMessage && (
        <div className={`po-banner-msg ${actionMessage.type}`}>
          <AlertTriangle size={18} />
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="po-controls glass-panel">
        <div className="po-search-wrapper">
          <Search size={18} className="po-search-icon" />
          <input 
            type="text" 
            placeholder="Search workspaces by name, company code, or admin email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="po-search-input"
          />
        </div>
        
        <div className="po-filter-wrapper">
          <label htmlFor="status-filter">Status:</label>
          <select 
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="po-select"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Table view */}
      <div className="po-table-container glass-panel">
        {filteredOrgs.length === 0 ? (
          <div className="po-empty-state">
            <Building2 size={40} />
            <p>No workspaces found matching the filters.</p>
          </div>
        ) : (
          <table className="po-table">
            <thead>
              <tr>
                <th>Workspace Details</th>
                <th>Company Code</th>
                <th>Created</th>
                <th className="num-col">Users</th>
                <th className="num-col">Projects</th>
                <th>Subscription Tier</th>
                <th>Status</th>
                <th className="action-col">Access Management</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrgs.map((org) => {
                const createdDate = new Date(org.created_at).toLocaleDateString(undefined, {
                  year: "numeric", month: "short", day: "numeric"
                });

                return (
                  <tr 
                    key={org.id} 
                    className={`po-row-clickable ${!org.is_active ? "is-inactive-row" : ""} tier-${org.subscription_tier}`}
                    onClick={() => setSelectedOrgId(org.id)}
                  >
                    <td>
                      <div className="po-org-info">
                        <div className="po-org-icon">
                          {org.logo_url ? (
                            <img src={org.logo_url} alt={org.name} className="po-row-logo" />
                          ) : (
                            org.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="po-org-name">
                            {org.name}
                          </div>
                          <div className="po-org-email">{org.email || "No contact email"}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="po-code">{org.company_code}</span>
                    </td>
                    <td>
                      <span className="po-date">
                        <Calendar size={13} />
                        {createdDate}
                      </span>
                    </td>
                    <td className="num-col">
                      <span className="po-stat">
                        <Users size={13} />
                        {org.users_count}
                      </span>
                    </td>
                    <td className="num-col">
                      <span className="po-stat">
                        <FolderGit size={13} />
                        {org.projects_count}
                      </span>
                    </td>
                    <td>
                      <div className="po-tier-wrapper">
                        {org.subscription_tier === "starter" && <Coins size={14} className="tier-icon starter" />}
                        {org.subscription_tier === "pro" && <ShieldCheck size={14} className="tier-icon pro" />}
                        {org.subscription_tier === "enterprise" && <Award size={14} className="tier-icon enterprise" />}
                        
                        <select 
                          value={org.subscription_tier} 
                          onChange={(e) => handleUpdateTier(org.id, e.target.value, org.name)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={updatingTierId === org.id}
                          className={`po-tier-select select-${org.subscription_tier}`}
                        >
                          <option value="starter">Starter</option>
                          <option value="pro">Pro</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                      </div>
                    </td>
                    <td>
                      <span className={`po-status-badge ${org.is_active ? "active" : "suspended"}`}>
                        {org.is_active ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="action-col">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(org.id, org.is_active, org.name);
                        }}
                        disabled={togglingId === org.id}
                        className={`po-toggle-btn ${org.is_active ? "active" : "suspended"}`}
                        title={org.is_active ? "Deactivate Workspace" : "Activate Workspace"}
                      >
                        {togglingId === org.id ? (
                          <span className="po-mini-spinner" />
                        ) : org.is_active ? (
                          <>
                            <ToggleRight size={24} className="po-toggle-icon active" />
                            <span className="po-toggle-text">Active</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft size={24} className="po-toggle-icon suspended" />
                            <span className="po-toggle-text">Suspended</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Centered Organization Details Modal */}
      {selectedOrgId && (
        <div className="po-detail-overlay" onClick={() => setSelectedOrgId(null)}>
          <div className="po-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="po-modal-header">
              <div className="po-modal-title-group">
                <div className="po-org-icon large-icon">
                  {selectedOrgDetails?.organization?.logo_url ? (
                    <img 
                      src={selectedOrgDetails.organization.logo_url} 
                      alt={selectedOrgDetails.organization.name} 
                      className="po-modal-logo"
                    />
                  ) : (
                    selectedOrgDetails?.organization?.name?.charAt(0).toUpperCase() || "O"
                  )}
                </div>
                <div>
                  <h2 className="po-modal-title">{selectedOrgDetails?.organization?.name || "Loading..."}</h2>
                  <span className="po-modal-subtitle">
                    Company Code: {selectedOrgDetails?.organization?.company_code || "—"}
                  </span>
                </div>
              </div>
              <button className="po-modal-close" onClick={() => setSelectedOrgId(null)}>
                &times;
              </button>
            </div>

            {loadingDetails ? (
              <div className="po-modal-loading">
                <div className="po-spinner" />
                <p>Retrieving workspace telemetry...</p>
              </div>
            ) : selectedOrgDetails ? (
              <div className="po-modal-body">
                {/* Tabs */}
                <div className="po-modal-tabs">
                  <button 
                    onClick={() => setDetailsTab("info")} 
                    className={`po-modal-tab ${detailsTab === "info" ? "active" : ""}`}
                  >
                    Profile
                  </button>
                  <button 
                    onClick={() => setDetailsTab("members")} 
                    className={`po-modal-tab ${detailsTab === "members" ? "active" : ""}`}
                  >
                    Members ({selectedOrgDetails.users.length})
                  </button>
                  <button 
                    onClick={() => setDetailsTab("projects")} 
                    className={`po-modal-tab ${detailsTab === "projects" ? "active" : ""}`}
                  >
                    Projects &amp; Activity ({selectedOrgDetails.projects.length})
                  </button>
                </div>

                {/* Tab Content */}
                <div className="po-tab-content">
                  {detailsTab === "info" && (
                    <div className="po-tab-pane pane-info animate-fade-in">
                      <div className="po-details-grid">
                        <div className="po-detail-card">
                          <span className="card-lbl">Contact Email</span>
                          <span className="card-val">{selectedOrgDetails.organization.email || "—"}</span>
                        </div>
                        <div className="po-detail-card">
                          <span className="card-lbl">Phone Number</span>
                          <span className="card-val">{selectedOrgDetails.organization.phone || "—"}</span>
                        </div>
                        <div className="po-detail-card">
                          <span className="card-lbl">Industry</span>
                          <span className="card-val">{selectedOrgDetails.organization.industry || "—"}</span>
                        </div>
                        <div className="po-detail-card">
                          <span className="card-lbl">Website</span>
                          <span className="card-val">
                            {selectedOrgDetails.organization.website ? (
                              <a href={selectedOrgDetails.organization.website} target="_blank" rel="noreferrer" className="po-link">
                                {selectedOrgDetails.organization.website}
                              </a>
                            ) : "—"}
                          </span>
                        </div>
                      </div>

                      {/* Workspace Administrator profile */}
                      {(() => {
                        const owner = selectedOrgDetails.users.find(u => u.role === "admin" || u.role === "owner") || selectedOrgDetails.users[0];
                        return owner ? (
                          <div className="po-details-section">
                            <h3>Workspace Administrator</h3>
                            <div className="po-owner-card">
                              <div className="po-owner-avatar">
                                {owner.profile_picture_url ? (
                                  <img src={owner.profile_picture_url} alt={owner.name} className="po-owner-img" />
                                ) : (
                                  owner.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="po-owner-info">
                                <div className="po-owner-name">{owner.name}</div>
                                <div className="po-owner-email">{owner.email}</div>
                                <div className="po-owner-status">
                                  <span className={`pane-role-badge ${owner.role}`}>
                                    {owner.role.replace('_', ' ')}
                                  </span>
                                  <span className={`pane-status-badge ${owner.is_active ? "active" : "disabled"}`}>
                                    {owner.is_active ? "Active" : "Inactive"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null;
                      })()}

                      <div className="po-details-section">
                        <h3>Geographic Details</h3>
                        <div className="po-details-address-box">
                          <p><strong>Address:</strong> {selectedOrgDetails.organization.address || "—"}</p>
                          <div className="po-address-row">
                            <p><strong>City:</strong> {selectedOrgDetails.organization.city || "—"}</p>
                            <p><strong>State:</strong> {selectedOrgDetails.organization.state || "—"}</p>
                            <p><strong>Country:</strong> {selectedOrgDetails.organization.country || "—"}</p>
                          </div>
                        </div>
                      </div>

                      <div className="po-details-section">
                        <h3>Description</h3>
                        <p className="po-description-text">
                          {selectedOrgDetails.organization.description || "No description available."}
                        </p>
                      </div>

                      <div className="po-details-section">
                        <h3>Subscription Status</h3>
                        <div className="po-details-sub-row">
                          <div className="sub-badge-display">
                            <span className="sub-lbl">Active Tier:</span>
                            <span className={`po-tier-badge-pill ${selectedOrgDetails.organization.subscription_tier}`}>
                              {selectedOrgDetails.organization.subscription_tier.toUpperCase()}
                            </span>
                          </div>
                          <div className="sub-badge-display">
                            <span className="sub-lbl">Gate Access:</span>
                            <span className={`po-status-badge ${selectedOrgDetails.organization.is_active ? "active" : "suspended"}`}>
                              {selectedOrgDetails.organization.is_active ? "Active" : "Suspended"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {detailsTab === "members" && (
                    <div className="po-tab-pane pane-members animate-fade-in">
                      <div className="pane-table-wrapper">
                        {selectedOrgDetails.users.length === 0 ? (
                          <div className="pane-empty">No members registered.</div>
                        ) : (
                          <table className="pane-table">
                            <thead>
                              <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Last Activity Check</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedOrgDetails.users.map(u => (
                                <tr key={u.id}>
                                  <td>
                                    <div className="pane-user-cell">
                                      <div className="pane-user-avatar">
                                        {u.profile_picture_url ? (
                                          <img src={u.profile_picture_url} alt={u.name} className="pane-avatar-img" />
                                        ) : (
                                          u.name.charAt(0).toUpperCase()
                                        )}
                                      </div>
                                      <div>
                                        <div className="pane-user-name">{u.name}</div>
                                        <div className="pane-user-email">{u.email}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <span className={`pane-role-badge ${u.role}`}>
                                      {u.role.replace('_', ' ')}
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`pane-status-badge ${u.is_active ? "active" : "disabled"}`}>
                                      {u.is_active ? "Active" : "Inactive"}
                                    </span>
                                  </td>
                                  <td className="pane-time">
                                    {u.last_login ? new Date(u.last_login).toLocaleString() : "Never"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}

                  {detailsTab === "projects" && (
                    <div className="po-tab-pane pane-projects animate-fade-in">
                      <div className="pane-split">
                        <div className="pane-split-col">
                          <h3>Workspace Projects</h3>
                          <div className="pane-project-list">
                            {selectedOrgDetails.projects.length === 0 ? (
                              <div className="pane-empty">No projects found.</div>
                            ) : (
                              selectedOrgDetails.projects.map(p => (
                                <div key={p.id} className="pane-project-card">
                                  <div className="p-card-header">
                                    <span className="p-card-name">{p.name}</span>
                                    <span className={`p-priority-badge ${p.priority}`}>
                                      {p.priority}
                                    </span>
                                  </div>
                                  <div className="p-card-body">
                                    <span>Tasks size: <strong>{p.task_count} tasks</strong></span>
                                    {p.due_date && (
                                      <span className="p-due">Due: {new Date(p.due_date).toLocaleDateString()}</span>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="pane-split-col">
                          <h3>Recent Workspace Activities</h3>
                          <div className="pane-activity-timeline">
                            {selectedOrgDetails.activities.length === 0 ? (
                              <div className="pane-empty">No recent activities.</div>
                            ) : (
                              selectedOrgDetails.activities.map(act => (
                                <div key={act.id} className="timeline-item">
                                  <div className="timeline-dot" />
                                  <div className="timeline-content">
                                    <span className="timeline-msg">{act.message}</span>
                                    <div className="timeline-meta">
                                      <span className="user">{act.user_email}</span>
                                      {act.created_at && (
                                        <>
                                          <span className="divider">•</span>
                                          <span className="date">{new Date(act.created_at).toLocaleTimeString()}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="po-modal-error">
                <p>Failed to parse organization workspace information.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
