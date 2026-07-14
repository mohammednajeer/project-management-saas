import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ChevronDown,
  Mail,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  UserCheck,
  Users,
  X,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "./Members.css";
import BulkInviteModal from "./BulkInviteModal";
import InviteMemberModal from "./InviteMemberModel";

const ROLE_OPTIONS = [
  { label: "All Roles", value: "all" },
  { label: "Admin", value: "admin" },
  { label: "Manager", value: "manager" },
  { label: "Employee", value: "employee" },
];

const STATUS_OPTIONS = [
  { label: "All Status", value: "all" },
  { label: "Active", value: "active" },
  { label: "Pending", value: "invited" },
];

const SORT_OPTIONS = [
  { label: "Name A-Z", value: "name" },
  { label: "Newest Joined", value: "joined_desc" },
  { label: "Oldest Joined", value: "joined_asc" },
];

const ROLE_STYLE = {
  admin: { color: "#dc2626", bg: "#fff1f2", border: "#fca5a5" },
  manager: { color: "#4f6df5", bg: "#eff2ff", border: "#a5b4fc" },
  employee: { color: "#4b5563", bg: "#f9fafb", border: "#d1d5db" },
};

const STATUS_DOT = {
  active: "#22c55e",
  invited: "#f59e0b",
};

const AVATAR_COLORS = [
  "#4f6df5",
  "#22c55e",
  "#f97316",
  "#8b5cf6",
  "#06b6d4",
  "#ef4444",
];

const titleCase = (value) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : "";

const getInitials = (member) => {
  const source = member.name || member.email || "?";
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

const formatJoinedDate = (member) => {
  if (member.status !== "active") return "Not joined yet";

  const value = member.joined_at || member.created_at;
  if (!value) return "Date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function ConfirmModal({ action, loading, onCancel, onConfirm }) {
  if (!action) return null;

  return createPortal(
    <div className="tm-confirm-overlay" onClick={onCancel}>
      <div className="tm-confirm-modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="tm-confirm-close" onClick={onCancel}>
          <X size={17} />
        </button>
        <h2>{action.title}</h2>
        <p>{action.message}</p>
        <div className="tm-confirm-actions">
          <button type="button" className="tm-confirm-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`tm-confirm-submit ${action.danger ? "tm-confirm-submit--danger" : ""}`}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Working..." : action.confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function Members() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canInvite = user?.role === "admin" || user?.role === "manager";
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };

    if (openMenu !== null) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenu]);

  const showToast = (toastData) => {
    setToast(toastData);
    window.setTimeout(() => setToast(null), 5000);
  };

  const fetchMembers = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError("");

    try {
      const res = await api.get("/invitations/team/");
      setMembers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load team members.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const stats = useMemo(() => {
    const active = members.filter((member) => member.status === "active");
    const invited = members.filter((member) => member.status === "invited");
    const admins = active.filter((member) => member.role === "admin");
    const managers = active.filter((member) => member.role === "manager");
    const employees = active.filter((member) => member.role === "employee");

    return {
      total: members.length,
      active: active.length,
      invited: invited.length,
      admins: admins.length,
      managers: managers.length,
      employees: employees.length,
    };
  }, [members]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = members.filter((member) => {
      const matchesRole = roleFilter === "all" || member.role === roleFilter;
      const matchesStatus = statusFilter === "all" || member.status === statusFilter;
      const matchesSearch =
        !q ||
        (member.name || "").toLowerCase().includes(q) ||
        (member.email || "").toLowerCase().includes(q) ||
        (member.role || "").toLowerCase().includes(q);

      return matchesRole && matchesStatus && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "joined_desc" || sortBy === "joined_asc") {
        const aTime = new Date(a.joined_at || a.created_at || 0).getTime();
        const bTime = new Date(b.joined_at || b.created_at || 0).getTime();
        return sortBy === "joined_desc" ? bTime - aTime : aTime - bTime;
      }

      return (a.name || a.email || "").localeCompare(b.name || b.email || "");
    });
  }, [members, roleFilter, search, sortBy, statusFilter]);

  const runAction = async () => {
    if (!confirmAction) return;

    setActionLoading(true);

    try {
      await confirmAction.run();
      await fetchMembers();
      showToast({
        type: "success",
        message: confirmAction.successMessage,
      });
      setConfirmAction(null);
      setOpenMenu(null);
    } catch (err) {
      showToast({
        type: "error",
        message: err.response?.data?.message || "Action failed. Please try again.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const requestRoleChange = (member, role) => {
    setConfirmAction({
      title: role === "manager" ? "Promote member" : "Demote member",
      message: `${member.name || member.email} will become a ${titleCase(role)}.`,
      confirmLabel: role === "manager" ? "Promote" : "Demote",
      successMessage: `${member.email} role updated`,
      run: () => api.patch(`/invitations/change-role/${member.id}/`, { role }),
    });
  };

  const requestRemoveMember = (member) => {
    setConfirmAction({
      title: "Remove member",
      message: `${member.name || member.email} will lose access to this organization.`,
      confirmLabel: "Remove",
      danger: true,
      successMessage: `${member.email} removed`,
      run: () => api.delete(`/invitations/remove-member/${member.id}/`),
    });
  };

  const requestResendInvite = (member) => {
    setConfirmAction({
      title: "Resend invitation",
      message: `Send a fresh invitation reminder to ${member.email}.`,
      confirmLabel: "Resend",
      successMessage: `Invitation resent to ${member.email}`,
      run: () => api.post(`/invitations/resend/${member.id}/`),
    });
  };

  const requestCancelInvite = (member) => {
    setConfirmAction({
      title: "Cancel invitation",
      message: `${member.email} will no longer be able to use this invitation.`,
      confirmLabel: "Cancel invite",
      danger: true,
      successMessage: "Invitation cancelled",
      run: () => api.delete(`/invitations/cancel/${member.id}/`),
    });
  };

  // Quick invited list for sidebar Quick Invites widget
  const pendingInvites = useMemo(() => {
    return members.filter((member) => member.status === "invited");
  }, [members]);

  return (
    <div className="activity-page members-activity-style">
      {toast && (
        <div className={`tm-toast tm-toast--${toast.type}`} role="status">
          <div className="tm-toast-title">{toast.message}</div>
          {toast.inviteLink && (
            <div className="tm-toast-link">
              <small>Testing invite URL:</small>
              <a href={toast.inviteLink} target="_blank" rel="noreferrer">
                Open Invite Link
              </a>
            </div>
          )}
        </div>
      )}

      {/* ─── PAGE HEADER ─────────────────────────────────────────────────────────── */}
      <header className="ap-page-header">
        <div className="ap-header-inner">
          <div className="ap-header-left">
            <span className="ap-eyebrow">
              <span className="ap-live-dot" />
              Members Controller
            </span>
            <h1 className="ap-title">Team Members</h1>
            <p className="ap-subtitle">
              <span className="tm-active-count">{stats.active} active</span>
              {" · "}
              {stats.invited} pending invitations · {stats.total} total
            </p>
          </div>

          <div className="ap-header-kpis">
            <div className="ap-kpi-card">
              <div className="ap-kpi-label">Active</div>
              <div className="ap-kpi-value">{stats.active}</div>
            </div>
            <div className="ap-kpi-card">
              <div className="ap-kpi-label">Invited</div>
              <div className="ap-kpi-value">{stats.invited}</div>
            </div>
            <div className="ap-kpi-card">
              <div className="ap-kpi-label">Total</div>
              <div className="ap-kpi-value">{stats.total}</div>
            </div>
          </div>
        </div>
      </header>

      {/* ─── STAT CHIPS (Filters trigger list) ─────────────────────────────────── */}
      <section className="ap-stat-chips">
        <div 
          className={`ap-chip ${roleFilter === "all" && statusFilter === "all" ? "active" : ""}`}
          onClick={() => { setRoleFilter("all"); setStatusFilter("all"); }}
        >
          <div className="ap-chip-icon"><Users size={16} /></div>
          <div className="ap-chip-body">
            <div className="ap-chip-count">{stats.total}</div>
            <div className="ap-chip-label">All Members</div>
          </div>
        </div>

        <div 
          className={`ap-chip ${statusFilter === "active" ? "active" : ""}`}
          onClick={() => { setStatusFilter("active"); setRoleFilter("all"); }}
        >
          <div className="ap-chip-icon"><CheckCircle2 size={16} /></div>
          <div className="ap-chip-body">
            <div className="ap-chip-count">{stats.active}</div>
            <div className="ap-chip-label">Active Users</div>
          </div>
        </div>

        <div 
          className={`ap-chip ${statusFilter === "invited" ? "active" : ""}`}
          onClick={() => { setStatusFilter("invited"); setRoleFilter("all"); }}
        >
          <div className="ap-chip-icon"><Mail size={16} /></div>
          <div className="ap-chip-body">
            <div className="ap-chip-count">{stats.invited}</div>
            <div className="ap-chip-label">Invited (Pending)</div>
          </div>
        </div>

        <div 
          className={`ap-chip ${roleFilter === "manager" ? "active" : ""}`}
          onClick={() => { setRoleFilter("manager"); setStatusFilter("all"); }}
        >
          <div className="ap-chip-icon"><ShieldCheck size={16} /></div>
          <div className="ap-chip-body">
            <div className="ap-chip-count">{stats.managers}</div>
            <div className="ap-chip-label">Managers</div>
          </div>
        </div>

        <div 
          className={`ap-chip ${roleFilter === "employee" ? "active" : ""}`}
          onClick={() => { setRoleFilter("employee"); setStatusFilter("all"); }}
        >
          <div className="ap-chip-icon"><UserCheck size={16} /></div>
          <div className="ap-chip-body">
            <div className="ap-chip-count">{stats.employees}</div>
            <div className="ap-chip-label">Employees</div>
          </div>
        </div>
      </section>

      {/* ─── TWO COLUMN AP-LAYOUT ────────────────────────────────────────────────── */}
      <main className="ap-page-layout">
        
        {/* LEFT COLUMN: Main Members Table & Actions */}
        <div className="ap-main-column">
          
          {/* TOOLBAR CONTROLS */}
          <div className="ap-toolbar">
            <div className="ap-search-wrap">
              <Search size={14} className="ap-search-icon" />
              <input
                type="text"
                placeholder="Search members by name or email..."
                className="ap-search-input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="ap-divider" />

            <div className="ap-filter-tabs">
              <button 
                type="button" 
                className={`ap-filter-tab ${sortBy === "name" ? "active" : ""}`}
                onClick={() => setSortBy("name")}
              >
                Sort: A-Z
              </button>
              <button 
                type="button" 
                className={`ap-filter-tab ${sortBy === "joined_desc" ? "active" : ""}`}
                onClick={() => setSortBy("joined_desc")}
              >
                New Joined
              </button>
            </div>

            {canInvite && (
              <>
                <div className="ap-divider" />
                <button type="button" className="ap-refresh-btn" onClick={() => setBulkOpen(true)}>
                  <Upload size={14} />
                  Bulk
                </button>
                <button type="button" className="ap-refresh-btn" onClick={() => setInviteOpen(true)}>
                  <Plus size={14} />
                  Invite
                </button>
              </>
            )}

            <div className="ap-divider" />
            
            <button 
              type="button" 
              className={`ap-refresh-btn ${refreshing ? "spinning" : ""}`}
              onClick={() => fetchMembers(true)}
              disabled={refreshing}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {error && <div className="tm-error">{error}</div>}

          {/* TABLE PANEL CONTAINER */}
          <div className="ap-panel">
            <div className="ap-panel-header">
              <div>
                <h3 className="ap-panel-title">Members Directory</h3>
                <p className="ap-panel-sub">Manage roles, promotions, and accesses</p>
              </div>
              <span className="ap-count-tag">{filteredMembers.length} listed</span>
            </div>

            <div className="tm-table-wrap">
              <table className="tm-table">
                <thead>
                  <tr>
                    <th>Member Info</th>
                    <th>System Role</th>
                    <th>Access Status</th>
                    <th>Joined At</th>
                    {isAdmin && <th></th>}
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    [1, 2, 3].map((item) => (
                      <tr key={item}>
                        <td colSpan={isAdmin ? 5 : 4}>
                          <div className="tm-row-skeleton" />
                        </td>
                      </tr>
                    ))
                  ) : filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 5 : 4} className="tm-empty">
                        <UserCheck size={26} />
                        <span>No members match filters</span>
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member, index) => {
                      const roleStyle = ROLE_STYLE[member.role] || ROLE_STYLE.employee;
                      const menuOpensUp = index >= filteredMembers.length - 2;
                      const isActiveMember = member.status === "active";
                      const showActiveActions =
                        isAdmin &&
                        isActiveMember &&
                        member.role !== "admin" &&
                        member.id !== user?.id;
                      const showInviteActions = isAdmin && member.status === "invited";
                      const showActions = showActiveActions || showInviteActions;

                      return (
                        <tr key={`${member.status}-${member.id}`} className="tm-row">
                          <td>
                            <div className="tm-member-cell">
                              {member.profile_picture ? (
                                <img className="tm-avatar tm-avatar--image" src={member.profile_picture} alt="" />
                              ) : (
                                <div
                                  className="tm-avatar"
                                  style={{ background: AVATAR_COLORS[index % AVATAR_COLORS.length] }}
                                >
                                  {getInitials(member)}
                                </div>
                              )}
                              <div>
                                {isActiveMember ? (
                                  <Link to={`/dashboard/team/${member.id}`} className="tm-member-name">
                                    {member.name || member.email}
                                  </Link>
                                ) : (
                                  <div className="tm-member-name">{member.name || "Pending Invitation"}</div>
                                )}
                                <div className="tm-member-email">{member.email}</div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span
                              className="tm-role-badge"
                              style={{
                                color: roleStyle.color,
                                background: roleStyle.bg,
                                borderColor: roleStyle.border,
                              }}
                            >
                              {titleCase(member.role)}
                            </span>
                          </td>

                          <td>
                            <span className="tm-status">
                              <span
                                className="tm-status-dot"
                                style={{ background: STATUS_DOT[member.status] || STATUS_DOT.active }}
                              />
                              {member.status === "active" ? "Active" : "Invited"}
                            </span>
                          </td>

                          <td>
                            <span className={isActiveMember ? "tm-meta" : "tm-meta tm-meta--muted"}>
                              {formatJoinedDate(member)}
                            </span>
                          </td>

                          {isAdmin && (
                            <td>
                              {showActions && (
                                <div
                                  className={`tm-actions ${openMenu === member.id ? "tm-actions--open" : ""}`}
                                  ref={openMenu === member.id ? dropdownRef : null}
                                >
                                  <button
                                    type="button"
                                    className="tm-more-btn"
                                    aria-label={`Open actions for ${member.email}`}
                                    onClick={() => setOpenMenu(openMenu === member.id ? null : member.id)}
                                  >
                                    <MoreHorizontal size={16} />
                                  </button>

                                  {openMenu === member.id && (
                                    <div className={`tm-dropdown ${menuOpensUp ? "tm-dropdown--up" : ""}`}>
                                      {showInviteActions ? (
                                        <>
                                          <button type="button" onClick={() => requestResendInvite(member)}>
                                            Resend Invite
                                          </button>
                                          <button type="button" className="danger" onClick={() => requestCancelInvite(member)}>
                                            Cancel Invite
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          {member.role === "employee" && (
                                            <button type="button" onClick={() => requestRoleChange(member, "manager")}>
                                              Promote to Manager
                                            </button>
                                          )}
                                          {member.role === "manager" && (
                                            <button type="button" onClick={() => requestRoleChange(member, "employee")}>
                                              Demote to Employee
                                            </button>
                                          )}
                                          <button type="button" className="danger" onClick={() => requestRemoveMember(member)}>
                                            Remove Member
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sidebar Colored Cards */}
        <aside className="ap-sidebar">
          
          {/* Card 1: Slate Ink / Role Descriptions */}
          <div className="ap-sidebar-card">
            <div className="ap-sidebar-header">
              <div>
                <h4 className="ap-sidebar-title">Access Policy</h4>
                <p className="ap-sidebar-sub">User role privileges</p>
              </div>
            </div>
            <div className="ap-info-list">
              <div className="ap-info-row">
                <span className="ap-info-key">Admin:</span>
                <span className="ap-info-val">Full Organization Access</span>
              </div>
              <div className="ap-info-row">
                <span className="ap-info-key">Manager:</span>
                <span className="ap-info-val">Workspace & Invites Management</span>
              </div>
              <div className="ap-info-row">
                <span className="ap-info-key">Employee:</span>
                <span className="ap-info-val">Task execution & Chat space</span>
              </div>
            </div>
          </div>

          {/* Card 2: Sky Blue / Role Breakdown */}
          <div className="ap-sidebar-card">
            <div className="ap-sidebar-header">
              <div>
                <h4 className="ap-sidebar-title">Organization Share</h4>
                <p className="ap-sidebar-sub">Active members statistics</p>
              </div>
            </div>
            <div className="ap-breakdown-list">
              <div className="ap-breakdown-row">
                <span className="ap-breakdown-label">Admins</span>
                <span className="ap-breakdown-count">{stats.admins}</span>
                <div className="ap-mini-bar-track">
                  <div 
                    className="ap-mini-bar-fill" 
                    style={{ 
                      width: `${stats.active > 0 ? (stats.admins / stats.active) * 100 : 0}%`, 
                      background: "var(--ink)" 
                    }} 
                  />
                </div>
              </div>
              <div className="ap-breakdown-row">
                <span className="ap-breakdown-label">Managers</span>
                <span className="ap-breakdown-count">{stats.managers}</span>
                <div className="ap-mini-bar-track">
                  <div 
                    className="ap-mini-bar-fill" 
                    style={{ 
                      width: `${stats.active > 0 ? (stats.managers / stats.active) * 100 : 0}%`, 
                      background: "var(--ink)" 
                    }} 
                  />
                </div>
              </div>
              <div className="ap-breakdown-row">
                <span className="ap-breakdown-label">Employees</span>
                <span className="ap-breakdown-count">{stats.employees}</span>
                <div className="ap-mini-bar-track">
                  <div 
                    className="ap-mini-bar-fill" 
                    style={{ 
                      width: `${stats.active > 0 ? (stats.employees / stats.active) * 100 : 0}%`, 
                      background: "var(--ink)" 
                    }} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Apricot / Pending Invitations List */}
          <div className="ap-sidebar-card">
            <div className="ap-sidebar-header">
              <div>
                <h4 className="ap-sidebar-title">Pending Invitations</h4>
                <p className="ap-sidebar-sub">Sent but not accepted yet</p>
              </div>
            </div>
            <div className="ap-users-list">
              {pendingInvites.length === 0 ? (
                <div className="ap-user-item-info" style={{ padding: "8px 0", fontSize: "12px", fontStyle: "italic", opacity: 0.8 }}>
                  No pending invitations
                </div>
              ) : (
                pendingInvites.slice(0, 4).map((member, index) => (
                  <div className="ap-user-item" key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div className="ap-user-item-info" style={{ flex: 1, minWidth: 0 }}>
                      <div className="ap-user-item-name" style={{ fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {member.email}
                      </div>
                      <div className="ap-user-item-count" style={{ fontSize: '10px', opacity: 0.8 }}>
                        Role: {titleCase(member.role)}
                      </div>
                    </div>
                    {isAdmin && (
                      <button 
                        type="button" 
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        onClick={() => setOpenMenu(openMenu === member.id ? null : member.id)}
                      >
                        <SlidersHorizontal size={12} style={{ opacity: 0.6 }} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </aside>
      </main>

      <InviteMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInviteSuccess={async (data) => {
          await fetchMembers();
          showToast({
            type: "success",
            message: `Invitation sent to ${data.email}`,
            inviteLink: data.invite_link,
          });
        }}
      />

      <BulkInviteModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onSuccess={async () => {
          await fetchMembers();
          showToast({
            type: "success",
            message: "Bulk invitations processed",
          });
        }}
      />

      <ConfirmModal
        action={confirmAction}
        loading={actionLoading}
        onCancel={() => setConfirmAction(null)}
        onConfirm={runAction}
      />
    </div>
  );
}
