import { 
  Search, ShieldAlert, Users, Calendar, 
  Building2, Mail, RefreshCw
} from "lucide-react";
import { usePlatformUsers } from "../../hooks/usePlatformUsers";
import "./PlatformUsers.css";

export default function PlatformUsers() {
  const {
    usersList,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    page,
    setPage,
    totalCount,
    totalPages,
    selectedUser,
    setSelectedUser,
    selectedOrgDetails,
    loadingOrg,
    showColleagues,
    setShowColleagues,
    fetchUsers,
    handleSelectUser,
    getRoleLabel
  } = usePlatformUsers();

  return (
    <div className="pu-container">
      {/* Page Header */}
      <div className="pu-header">
        <div>
          <h1 className="pu-title">Users Directory</h1>
          <p className="pu-subtitle">Monitor registered system accounts, authorization levels, and cross-workspace mappings</p>
        </div>
        <button onClick={fetchUsers} className="pu-refresh-btn" title="Refresh Registry">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Control panel */}
      <div className="pu-controls glass-panel">
        <div className="pu-search-wrapper">
          <Search size={18} className="pu-search-icon" />
          <input 
            type="text" 
            placeholder="Search accounts by name or email address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pu-search-input"
          />
        </div>

        <div className="pu-filter-wrapper">
          <label htmlFor="role-filter">Role:</label>
          <select 
            id="role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="pu-select"
          >
            <option value="all">All Roles</option>
            <option value="platform_admin">Platform Admin Only</option>
            <option value="admin">Workspace Owners Only</option>
            <option value="manager">Managers Only</option>
            <option value="employee">Employees Only</option>
          </select>
        </div>
      </div>

      {/* Users table */}
      <div className="pu-table-container glass-panel">
        {loading ? (
          <div className="pu-loading-state">
            <div className="pu-spinner" />
            <p>Retrieving user profiles...</p>
          </div>
        ) : error ? (
          <div className="pu-error-state">
            <ShieldAlert size={40} className="pu-error-icon" />
            <h3>Failed to load user accounts</h3>
            <p>{error}</p>
            <button onClick={fetchUsers} className="pu-retry-btn">
              Retry Directory Load
            </button>
          </div>
        ) : usersList.length === 0 ? (
          <div className="pu-empty-state">
            <Users size={40} />
            <p>No user accounts match your criteria.</p>
          </div>
        ) : (
          <table className="pu-table">
            <thead>
              <tr>
                <th>Account Identity</th>
                <th>Authorization Role</th>
                <th>Workspace Association</th>
                <th>Created</th>
                <th>Last Active Check</th>
                <th>Gate Lock</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((usr) => {
                const createdDate = usr.created_at ? new Date(usr.created_at).toLocaleDateString(undefined, {
                  year: "numeric", month: "short", day: "numeric"
                }) : "—";
                const lastActive = usr.last_login ? new Date(usr.last_login).toLocaleString() : "Never";

                return (
                  <tr key={usr.id} className="pu-row pu-row-clickable" onClick={() => handleSelectUser(usr)}>
                    <td>
                      <div className="pu-user-info">
                        <div className="pu-user-avatar">
                          {usr.profile_picture_url ? (
                            <img src={usr.profile_picture_url} alt={usr.name} className="pu-row-avatar" />
                          ) : (
                            usr.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="pu-user-name">
                            {usr.name}
                          </div>
                          <div className="pu-user-email">
                            <Mail size={11} />
                            {usr.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`pane-role-badge ${usr.role}`}>
                        {usr.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className="pu-org-link">
                        <Building2 size={13} />
                        {usr.organization_name}
                      </span>
                    </td>
                    <td>
                      <span className="pu-meta-text">
                        <Calendar size={13} />
                        {createdDate}
                      </span>
                    </td>
                    <td className="pu-time-col">{lastActive}</td>
                    <td>
                      <span className={`po-status-badge ${usr.is_active ? "active" : "suspended"}`}>
                        {usr.is_active ? "Active" : "Locked"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && !error && usersList.length > 0 && totalPages > 1 && (
        <div className="pu-pagination">
          <button 
            disabled={page === 1} 
            onClick={() => setPage(page - 1)}
            className="pu-pagination-btn"
          >
            Previous
          </button>
          <span className="pu-pagination-info">
            Page {page} of {totalPages} ({totalCount} users)
          </span>
          <button 
            disabled={page === totalPages} 
            onClick={() => setPage(page + 1)}
            className="pu-pagination-btn"
          >
            Next
          </button>
        </div>
      )}

      {/* Centered User Detail Modal (Privacy Shielded) */}
      {selectedUser && (
        <div className="pu-modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="pu-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pu-modal-header">
              <div className="pu-modal-title-group">
                <div className="pu-avatar-large">
                  {selectedUser.profile_picture_url ? (
                    <img 
                      src={selectedUser.profile_picture_url} 
                      alt={selectedUser.name} 
                      className="pu-modal-avatar"
                    />
                  ) : (
                    selectedUser.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h2 className="pu-modal-title">{selectedUser.name}</h2>
                  <span className="pu-modal-subtitle">{selectedUser.email}</span>
                </div>
              </div>
              <button className="pu-modal-close" onClick={() => setSelectedUser(null)}>
                &times;
              </button>
            </div>

            <div className="pu-modal-body">
              {/* User profile cards */}
              <div className="pu-details-section">
                <h3>Account Information</h3>
                <div className="pu-details-grid">
                  <div className="pu-detail-card">
                    <span className="card-lbl">Access Role</span>
                    <span className="card-val">{getRoleLabel(selectedUser.role)}</span>
                  </div>
                  <div className="pu-detail-card">
                    <span className="card-lbl">Registry Status</span>
                    <span className={`po-status-badge ${selectedUser.is_active ? "active" : "suspended"}`} style={{ alignSelf: "flex-start", marginTop: "4px" }}>
                      {selectedUser.is_active ? "Active" : "Locked"}
                    </span>
                  </div>
                  <div className="pu-detail-card">
                    <span className="card-lbl">Created At</span>
                    <span className="card-val">
                      {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : "—"}
                    </span>
                  </div>
                  <div className="pu-detail-card">
                    <span className="card-lbl">Last Login</span>
                    <span className="card-val">
                      {selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString() : "Never"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Organization Profile (Non-sensitive Privacy Shielded) */}
              <div className="pu-details-section">
                <h3>Organization Information (Non-Sensitive Context)</h3>
                
                {!selectedUser.organization_id ? (
                  <div className="pu-no-org-box">
                    <Building2 size={24} />
                    <p>This user belongs to the platform administration support team and is not mapped to any tenant workspace.</p>
                  </div>
                ) : loadingOrg ? (
                  <div className="pu-org-loading">
                    <div className="pu-spinner" />
                    <p>Retrieving organization context...</p>
                  </div>
                ) : selectedOrgDetails ? (
                  <div className="pu-org-info-box">
                    <div className="pu-org-header">
                      <div className="pu-modal-org-icon">
                        {selectedOrgDetails.organization.logo_url ? (
                          <img 
                            src={selectedOrgDetails.organization.logo_url} 
                            alt={selectedOrgDetails.organization.name} 
                            className="pu-modal-org-logo"
                          />
                        ) : (
                          selectedOrgDetails.organization.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="pu-org-name">{selectedOrgDetails.organization.name}</div>
                        <span className="pu-org-code">Code: {selectedOrgDetails.organization.company_code}</span>
                      </div>
                    </div>
                    
                    <div className="pu-org-meta-grid">
                      <div className="pu-meta-card">
                        <span className="meta-lbl">Sector</span>
                        <span className="meta-val">{selectedOrgDetails.organization.industry || "—"}</span>
                      </div>
                      <div className="pu-meta-card">
                        <span className="meta-lbl">Website</span>
                        <span className="meta-val">
                          {selectedOrgDetails.organization.website ? (
                            <a href={selectedOrgDetails.organization.website} target="_blank" rel="noreferrer" className="pu-link">
                              {selectedOrgDetails.organization.website}
                            </a>
                          ) : "—"}
                        </span>
                      </div>
                      <div className="pu-meta-card">
                        <span className="meta-lbl">Subscription Level</span>
                        <span className={`po-tier-badge-pill ${selectedOrgDetails.organization.subscription_tier}`} style={{ alignSelf: "flex-start", display: "inline-block", padding: "1px 8px", fontSize: "10px", marginTop: "3px" }}>
                          {selectedOrgDetails.organization.subscription_tier.toUpperCase()}
                        </span>
                      </div>
                      <div className="pu-meta-card">
                        <span className="meta-lbl">Active Users</span>
                        <span className="meta-val">{selectedOrgDetails.users.length} registered</span>
                      </div>
                    </div>

                    {/* Colleagues / Team Members list (Only for Admin or when user requests it) */}
                    {selectedUser.role === "admin" || showColleagues ? (
                      <div className="pu-colleagues-section">
                        <h4>Workspace Employees ({selectedOrgDetails.users.filter(u => u.id !== selectedUser.id).length})</h4>
                        <div className="pu-colleagues-list">
                          {selectedOrgDetails.users.filter(u => u.id !== selectedUser.id).length === 0 ? (
                            <span className="pu-colleagues-empty">No other workspace colleagues found.</span>
                          ) : (
                            selectedOrgDetails.users
                              .filter(u => u.id !== selectedUser.id)
                              .map(colleague => (
                                <div key={colleague.id} className="pu-colleague-item" title={`${colleague.name} (${colleague.email})`}>
                                  <div className="pu-colleague-avatar">
                                    {colleague.profile_picture_url ? (
                                      <img src={colleague.profile_picture_url} alt={colleague.name} className="pu-colleague-img" />
                                    ) : (
                                      colleague.name.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <div className="pu-colleague-info">
                                    <span className="pu-colleague-name">{colleague.name}</span>
                                    <span className={`pane-role-badge ${colleague.role}`} style={{ fontSize: '9px', padding: '1px 5px', width: 'fit-content' }}>
                                      {colleague.role.replace('_', ' ')}
                                    </span>
                                  </div>
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="pu-show-colleagues-wrapper">
                        <button 
                          className="pu-show-colleagues-btn"
                          onClick={() => setShowColleagues(true)}
                        >
                          <Users size={13} />
                          <span>Show Workspace Employees</span>
                        </button>
                      </div>
                    )}

                    <blockquote className="pu-privacy-shield-notice">
                      <strong>Privacy Shield Active:</strong> Workspace project boards, task files, and system activity timelines are restricted for corporate data confidentiality.
                    </blockquote>
                  </div>
                ) : (
                  <div className="pu-no-org-box error">
                    <Building2 size={24} />
                    <p>Failed to retrieve workspace organization details.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="pu-modal-footer">
              <button className="pu-close-modal-btn" onClick={() => setSelectedUser(null)}>
                Dismiss Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
