import { useState } from "react";
import {
  Search,
  Plus,
  Users,
  CheckCircle2,
  Mail,
  ShieldCheck,
  MoreHorizontal,
} from "lucide-react";
import "./Members.css";

// ─── Mock Data ───────────────────────────────────────────────────────────────
const MEMBERS = [
  {
    id: 1,
    initials: "JD",
    name: "John Doe",
    email: "john@company.com",
    role: "Owner",
    status: "Active",
    projects: 8,
    tasks: 24,
    joined: "Jan 2024",
    lastActive: "Just now",
    avatarBg: "#4f6df5",
  },
  {
    id: 2,
    initials: "AK",
    name: "Alex Kim",
    email: "alex@company.com",
    role: "Admin",
    status: "Active",
    projects: 6,
    tasks: 18,
    joined: "Feb 2024",
    lastActive: "2 hours ago",
    avatarBg: "#8b5cf6",
  },
  {
    id: 3,
    initials: "SP",
    name: "Sara Patel",
    email: "sara@company.com",
    role: "Manager",
    status: "Active",
    projects: 5,
    tasks: 15,
    joined: "Mar 2024",
    lastActive: "1 day ago",
    avatarBg: "#22c55e",
  },
  {
    id: 4,
    initials: "MW",
    name: "Mike Wilson",
    email: "mike@company.com",
    role: "Employee",
    status: "Active",
    projects: 3,
    tasks: 11,
    joined: "Apr 2024",
    lastActive: "3 days ago",
    avatarBg: "#f59e0b",
  },
  {
    id: 5,
    initials: "PR",
    name: "Priya Rao",
    email: "priya@company.com",
    role: "Employee",
    status: "Active",
    projects: 4,
    tasks: 9,
    joined: "May 2024",
    lastActive: "1 week ago",
    avatarBg: "#ef4444",
  },
  {
    id: 6,
    initials: "CL",
    name: "Chris Lee",
    email: "chris@company.com",
    role: "Employee",
    status: "Invited",
    projects: 0,
    tasks: 0,
    joined: "—",
    lastActive: "Pending",
    avatarBg: "#06b6d4",
  },
  {
    id: 7,
    initials: "OC",
    name: "Olivia Chen",
    email: "olivia@company.com",
    role: "Manager",
    status: "Active",
    projects: 5,
    tasks: 13,
    joined: "Jun 2024",
    lastActive: "4 hours ago",
    avatarBg: "#6366f1",
  },
  {
    id: 8,
    initials: "RK",
    name: "Ravi Kumar",
    email: "ravi@company.com",
    role: "Employee",
    status: "Inactive",
    projects: 1,
    tasks: 2,
    joined: "Jul 2024",
    lastActive: "1 month ago",
    avatarBg: "#a855f7",
  },
];

const ROLE_TABS = ["All", "Owner", "Admin", "Manager", "Employee"];

const ROLE_STYLE = {
  Owner:    { color: "#7c3aed", bg: "#f5f3ff", border: "#c4b5fd" },
  Admin:    { color: "#dc2626", bg: "#fff1f2", border: "#fca5a5" },
  Manager:  { color: "#4f6df5", bg: "#eff2ff", border: "#a5b4fc" },
  Employee: { color: "#6b7280", bg: "#f9fafb", border: "#d1d5db" },
};

const STATUS_DOT = {
  Active:   "#22c55e",
  Invited:  "#f59e0b",
  Inactive: "#9ca3af",
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Members() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  const filtered = MEMBERS.filter((m) => {
    const matchesRole = activeTab === "All" || m.role === activeTab;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  const activeCount  = MEMBERS.filter((m) => m.status === "Active").length;
  const pendingCount = MEMBERS.filter((m) => m.status === "Invited").length;
  const totalCount   = MEMBERS.length;

  return (
    <div className="tm-page">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="tm-page-header">
        <div>
          <h1 className="tm-page-title">Team Members</h1>
          <p className="tm-page-sub">
            <span className="tm-active-count">{activeCount} active</span>
            {" · "}
            {pendingCount} pending invite
            {" · "}
            {totalCount} total
          </p>
        </div>
        <button className="tm-invite-btn">
          <Plus size={16} />
          Invite Member
        </button>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <div className="tm-stats">
        <StatCard
          icon={Users}
          iconBg="#eff2ff"
          iconColor="#4f6df5"
          value={totalCount}
          label="Total Members"
        />
        <StatCard
          icon={CheckCircle2}
          iconBg="#f0fdf4"
          iconColor="#22c55e"
          value={activeCount}
          label="Active"
        />
        <StatCard
          icon={Mail}
          iconBg="#fffbeb"
          iconColor="#f59e0b"
          value={pendingCount}
          label="Pending Invites"
        />
        <StatCard
          icon={ShieldCheck}
          iconBg="#f5f3ff"
          iconColor="#7c3aed"
          value={MEMBERS.filter((m) => m.role === "Admin" || m.role === "Owner").length}
          label="Admins"
        />
      </div>

      {/* ── Search + Filter ─────────────────────────────────────────────── */}
      <div className="tm-toolbar">
        <div className="tm-search">
          <Search size={15} className="tm-search-icon" />
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

      {/* ── Members Table ───────────────────────────────────────────────── */}
      <div className="tm-table-wrap">
        <table className="tm-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th>Status</th>
              <th>Projects</th>
              <th>Tasks</th>
              <th>Joined</th>
              <th>Last Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="tm-empty">
                  No members found
                </td>
              </tr>
            ) : (
              filtered.map((m) => {
                const roleStyle = ROLE_STYLE[m.role];
                return (
                  <tr key={m.id} className="tm-row">
                    {/* Member */}
                    <td>
                      <div className="tm-member-cell">
                        <div
                          className="tm-avatar"
                          style={{ background: m.avatarBg }}
                        >
                          {m.initials}
                        </div>
                        <div>
                          <div className="tm-member-name">{m.name}</div>
                          <div className="tm-member-email">{m.email}</div>
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
                        {m.role}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      <span className="tm-status">
                        <span
                          className="tm-status-dot"
                          style={{ background: STATUS_DOT[m.status] }}
                        />
                        {m.status}
                      </span>
                    </td>

                    {/* Projects */}
                    <td className="tm-num">{m.projects}</td>

                    {/* Tasks */}
                    <td className="tm-num">{m.tasks}</td>

                    {/* Joined */}
                    <td className="tm-meta">{m.joined}</td>

                    {/* Last Active */}
                    <td className="tm-meta">{m.lastActive}</td>

                    {/* Actions */}
                    <td>
                      <button className="tm-more-btn" aria-label="More options">
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
    </div>
  );
}

