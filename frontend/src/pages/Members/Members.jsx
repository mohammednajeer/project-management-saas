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
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "./Members.css";
import BulkInviteModal from "./BulkInviteModal";
import InviteMemberModal from "./InviteMemberModel";

const ROLE_OPTIONS = [
  { label: "All roles", value: "all" },
  { label: "Admin", value: "admin" },
  { label: "Manager", value: "manager" },
  { label: "Employee", value: "employee" },
];

const STATUS_OPTIONS = [
  { label: "All status", value: "all" },
  { label: "Active", value: "active" },
  { label: "Pending invitations", value: "invited" },
];

const SORT_OPTIONS = [
  { label: "Name A-Z", value: "name" },
  { label: "Newest joined", value: "joined_desc" },
  { label: "Oldest joined", value: "joined_asc" },
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

function StatCard({ icon: Icon, iconBg, iconColor, value, label }) {
  return (
    <div className="tm-stat-card">
      <div className="tm-stat-icon" style={{ background: iconBg, color: iconColor }}>
        <Icon size={22} />
      </div>
      <div>
        <div className="tm-stat-value">{value}</div>
        <div className="tm-stat-label">{label}</div>
      </div>
    </div>
  );
}

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

  const fetchMembers = async () => {
    setError("");

    try {
      const res = await api.get("/invitations/team/");
      setMembers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load team members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const stats = useMemo(() => {
    const active = members.filter((member) => member.status === "active");
    const invited = members.filter((member) => member.status === "invited");

    return {
      total: members.length,
      active: active.length,
      invited: invited.length,
      managers: active.filter((member) => member.role === "manager").length,
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

  return (
    <div className="tm-page">
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

      <div className="tm-page-header">
        <div>
          <h1 className="tm-page-title">Team Members</h1>
          <p className="tm-page-sub">
            <span className="tm-active-count">{stats.active} active</span>
            {" · "}
            {stats.invited} pending invitations · {stats.total} total
          </p>
        </div>

        {canInvite && (
          <div className="tm-header-actions">
            <button type="button" className="tm-bulk-btn" onClick={() => setBulkOpen(true)}>
              <Upload size={16} />
              Bulk Invite
            </button>

            <button type="button" className="tm-invite-btn" onClick={() => setInviteOpen(true)}>
              <Plus size={16} />
              Invite Member
            </button>
          </div>
        )}
      </div>

      <div className="tm-stats">
        <StatCard icon={Users} iconBg="#eff2ff" iconColor="#4f6df5" value={stats.total} label="Total Members" />
        <StatCard icon={CheckCircle2} iconBg="#f0fdf4" iconColor="#22c55e" value={stats.active} label="Active Members" />
        <StatCard icon={Mail} iconBg="#fffbeb" iconColor="#f59e0b" value={stats.invited} label="Pending Invitations" />
        <StatCard icon={ShieldCheck} iconBg="#f5f3ff" iconColor="#7c3aed" value={stats.managers} label="Managers" />
      </div>

      <div className="tm-toolbar">
        <div className="tm-search">
          <Search size={15} className="tm-search-icon" />
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="tm-filters">
          <label className="tm-select">
            <span>Role</span>
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>

          <label className="tm-select">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>

          <label className="tm-select">
            <span>Sort</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>
        </div>
      </div>

      {error && <div className="tm-error">{error}</div>}

      <div className="tm-table-wrap">
        <table className="tm-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
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
                  <span>No members found</span>
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
                            <div className="tm-member-name">{member.name || "Pending User"}</div>
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
