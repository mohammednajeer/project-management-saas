import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Users,
  CheckCircle2,
  Mail,
  Upload,
  ShieldCheck,
  MoreHorizontal,
} from "lucide-react";
import "./Members.css";
import BulkInviteModal from "./BulkInviteModal";
import InviteMemberModal from "./InviteMemberModel";
const ROLE_TABS = ["All", "Admin", "Manager", "Employee"];

const ROLE_STYLE = {
  Admin: { color: "#dc2626", bg: "#fff1f2", border: "#fca5a5" },
  Manager: { color: "#4f6df5", bg: "#eff2ff", border: "#a5b4fc" },
  Employee: { color: "#6b7280", bg: "#f9fafb", border: "#d1d5db" },
};

const STATUS_DOT = {
  Active: "#22c55e",
  Invited: "#f59e0b",
};

// ─── Stat Card ─────────────────
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

// ─── MAIN ──────────────────────
export default function Members() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  // useEffect(() => {
  //   const fetchMembers = async () => {
  //     try {
  //       const { default: api } = await import("../../services/api");
  //       const res = await api.get("/invitations/team/");
  //       setMembers(res.data);
  //     } catch (err) {
  //       console.log(err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchMembers();
  // }, []);
  const fetchMembers = async () => {
    try {
      const { default: api } = await import("../../services/api");

      const res = await api.get("/invitations/team/");
      setMembers(res.data);

    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // ✅ Loading UI


  // ✅ Filter
  const filtered = members.filter((m) => {
    const matchesRole =
      activeTab === "All" || m.role?.toLowerCase() === activeTab.toLowerCase();

    const q = search.toLowerCase();

    const matchesSearch =
      !q ||
      (m.name || "").toLowerCase().includes(q) ||
      (m.email || "").toLowerCase().includes(q) ||
      (m.role || "").toLowerCase().includes(q);

    return matchesRole && matchesSearch;
  });

  // ✅ Counts
  const activeCount = members.filter((m) => m.status === "active").length;
  const pendingCount = members.filter((m) => m.status === "invited").length;
  const totalCount = members.length;

  return (
    <div className="tm-page">
      {toast && (
        <div className="tm-toast">
          <div className="tm-toast-title">
            ✅ {toast.message}
          </div>

          {toast.inviteLink && (
            <div className="tm-toast-link">
              <small>Testing invite URL:</small>

              <a
                href={toast.inviteLink}
                target="_blank"
                rel="noreferrer"
              >
                Open Invite Link
              </a>
            </div>
          )}
        </div>
      )}
        {loading && (
            <p style={{ paddingBottom: "12px" }}>
              Loading team...
            </p>
          )}
      {/* Header */}
      <div className="tm-page-header">
        <div>
          <h1 className="tm-page-title">Team Members</h1>
          <p className="tm-page-sub">
            <span className="tm-active-count">{activeCount} active</span> ·{" "}
            {pendingCount} pending invite · {totalCount} total
          </p>
        </div>

        <div className="tm-header-actions">

            <button
              type="button"
              className="tm-bulk-btn"
              onClick={() => setBulkOpen(true)}
            >
              <Upload size={16} />
              Bulk Invite
            </button>

            <button
              type="button"
              className="tm-invite-btn"
              onClick={() => {
                setInviteOpen(true);
              }}
            >
              <Plus size={16} />
              Invite Member
            </button>

          </div>
      </div>

      {/* Stats */}
      <div className="tm-stats">
        <StatCard icon={Users} iconBg="#eff2ff" iconColor="#4f6df5" value={totalCount} label="Total Members" />
        <StatCard icon={CheckCircle2} iconBg="#f0fdf4" iconColor="#22c55e" value={activeCount} label="Active" />
        <StatCard icon={Mail} iconBg="#fffbeb" iconColor="#f59e0b" value={pendingCount} label="Pending Invites" />
        <StatCard icon={ShieldCheck} iconBg="#f5f3ff" iconColor="#7c3aed"
          value={members.filter((m) => m.role === "admin").length}
          label="Admins"
        />
      </div>

      {/* Search */}
      <div className="tm-toolbar">
        <div className="tm-search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="tm-tabs">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab}
              className={`tm-tab ${activeTab === tab ? "tm-tab--active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="tm-table-wrap">
        <table className="tm-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="tm-empty">No members found</td>
              </tr>
            ) : (
              filtered.map((m) => {
                const roleKey =
                  m.role?.charAt(0).toUpperCase() + m.role?.slice(1);
                const roleStyle =
                  ROLE_STYLE[roleKey] || ROLE_STYLE.Employee;

                return (
                  <tr key={m.id}>
                    {/* Member */}
                    <td>
                      <div className="tm-member-cell">
                        <div className="tm-avatar">
                          {m.name ? m.name[0] : "?"}
                        </div>

                        <div>
                          <div className="tm-member-name">
                            {m.name || "Pending User"}
                          </div>
                          <div className="tm-member-email">
                            {m.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td>
                      <span
                        className="tm-role-badge"
                        style={{
                          color: roleStyle.color,
                          background: roleStyle.bg,
                          borderColor: roleStyle.border,
                        }}
                      >
                        {roleKey}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      <span className="tm-status">
                        <span
                          className="tm-status-dot"
                          style={{
                            background:
                              STATUS_DOT[
                                m.status === "active" ? "Active" : "Invited"
                              ],
                          }}
                        />
                        {m.status === "active" ? "Active" : "Invited"}
                      </span>
                    </td>

                    {/* Joined */}
                    <td>—</td>

                    {/* Actions */}
                    <td>
                      <button className="tm-more-btn">
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
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

          setToast({
            type: "success",
            message: `Invitation sent to ${data.email}`,
            inviteLink: data.invite_link,
          });

          setTimeout(() => {
            setToast(null);
          }, 6000);
        }}
      />
      <BulkInviteModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onSuccess={fetchMembers}
      />
    </div>
  );
}
