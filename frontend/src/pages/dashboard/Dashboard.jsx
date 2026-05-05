import { useState } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  Users,
  Mail,
  BarChart2,
  Settings,
  LogOut,
  ChevronLeft,
  Bell,
  ChevronDown,
  Search,
  TrendingUp,
  TrendingDown,
  Sparkles,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import "./Dashboard.css";

const chartData = [
  { day: "Mon", tasks: 4 },
  { day: "Tue", tasks: 6 },
  { day: "Wed", tasks: 6.5 },
  { day: "Thu", tasks: 9 },
  { day: "Fri", tasks: 7.5 },
  { day: "Sat", tasks: 3 },
  { day: "Sun", tasks: 11 },
];

const activityFeed = [
  { id: 1, color: "#22c55e", text: 'Alex Kim completed "API Integration"', time: "2 min ago" },
  { id: 2, color: "#4f6df5", text: 'New project "Analytics Dashboard" created', time: "15 min ago" },
  { id: 3, color: "#a855f7", text: "Sara Patel joined the workspace", time: "1 hour ago" },
  { id: 4, color: "#f59e0b", text: '"Mobile App" deadline moved to Dec 30', time: "3 hours ago" },
  { id: 5, color: "#22c55e", text: '5 tasks moved to "Done" in Website Redesign', time: "5 hours ago" },
  { id: 6, color: "#6b7280", text: 'Comment added on "Backend API" task', time: "Yesterday" },
];

const recentTasks = [
  { id: 1, task: "Design homepage hero section", project: "Website Redesign", priority: "High", priorityColor: "#f59e0b", status: "In Progress", statusBg: "#eff6ff", statusColor: "#4f6df5", assignee: "JD", assigneeBg: "#4f6df5", due: "Dec 20" },
  { id: 2, task: "Set up CI/CD pipeline", project: "DevOps", priority: "Critical", priorityColor: "#ef4444", status: "Backlog", statusBg: "#f3f4f6", statusColor: "#374151", assignee: "AK", assigneeBg: "#8b5cf6", due: "Dec 18" },
  { id: 3, task: "Write API documentation", project: "API v2", priority: "Medium", priorityColor: "#a855f7", status: "Review", statusBg: "#fdf4ff", statusColor: "#a855f7", assignee: "SP", assigneeBg: "#ec4899", due: "Dec 22" },
];

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: FolderOpen, label: "Projects" },
  { icon: CheckSquare, label: "Tasks" },
  { icon: Users, label: "Team" },
  { icon: Mail, label: "Invitations" },
  { icon: BarChart2, label: "Reports" },
  { icon: Settings, label: "Settings" },
];

const statCards = [
  { icon: FolderOpen, iconBg: "#eff6ff", iconColor: "#4f6df5", value: "12", label: "Total Projects", trend: "+2 this month", up: true },
  { icon: CheckSquare, iconBg: "#f5f3ff", iconColor: "#8b5cf6", value: "148", label: "Total Tasks", trend: "+24 this week", up: true },
  { icon: null, emoji: "🕐", iconBg: "#fffbeb", iconColor: "#f59e0b", value: "31", label: "Pending Tasks", trend: "-5 from last week", up: false },
  { icon: null, checkGreen: true, iconBg: "#f0fdf4", iconColor: "#22c55e", value: "107", label: "Completed", trend: "+18 this week", up: true },
  { icon: Users, iconBg: "#fff1f2", iconColor: "#ef4444", value: "24", label: "Team Members", trend: "3 pending invites", up: null },
];

export default function Dashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("employee");
  const [inviteLink, setInviteLink] = useState("");

  const handleLogout = async () => {
    try {
      await fetch("/auth/logout/", { method: "POST" });
      window.location.href = "/signin";
    } catch {
      window.location.href = "/signin";
    }
  };

  const handleInvite = async () => {
          try {
            const { default: api } = await import("../../services/api");

            const res = await api.post("/invitations/create/", {
              email: inviteEmail,
              role: inviteRole,
            });
            const token = res.data.token;

            const link = `http://localhost:5173/signup?token=${token}`;

            setInviteLink(link);
            setInviteEmail("");

          } catch (err) {
            alert("Failed to send invite");
          }
        };

  return (
    <main className={`db-page ${collapsed ? "db-collapsed" : ""}`}>
      {/* Sidebar */}
      <aside className="db-sidebar">
        <a href="/dashboard" className="db-brand">
          <span className="db-brand-icon"><Sparkles size={18} /></span>
          {!collapsed && <span>ProjectFlow</span>}
        </a>

        <nav className="db-nav">
          {navItems.map(({ icon: Icon, label, active }) => (
            <a key={label} href="#" className={`db-nav-item ${active ? "is-active" : ""}`}>
              <Icon size={18} />
              {!collapsed && <span>{label}</span>}
            </a>
          ))}
        </nav>

        <div className="db-sidebar-footer">
          <button className="db-logout" onClick={handleLogout}>
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
          <button className="db-collapse" onClick={() => setCollapsed(!collapsed)}>
            <ChevronLeft size={16} style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </button>
        </div>
      </aside>

      {/* Main area */}
      <section className="db-body">
        {/* Topbar */}
        <header className="db-topbar">
          <div className="db-workspace">
            <span className="db-workspace-name">Acme Corp</span>
            <span className="db-pro-badge">Pro</span>
          </div>

          <div className="db-search">
            <Search size={15} className="db-search-icon" />
            <input placeholder="Search projects, tasks..." />
          </div>

          <div className="db-topbar-right">
            <button className="db-notif">
              <Bell size={18} />
              <span className="db-notif-badge">2</span>
            </button>
            <div className="db-user">
              <div className="db-avatar">JD</div>
              <div className="db-user-info">
                <span className="db-user-name">John Doe</span>
                <span className="db-user-role">Admin</span>
              </div>
              <ChevronDown size={14} color="#9ca3af" />
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="db-content">
          {/* Welcome */}
          <div className="db-welcome-row">
            <div>
              <h1 className="db-welcome-title">Good morning, John 👋</h1>
              <p className="db-welcome-sub">Here's what's happening across your workspace today.</p>
              <span className="db-system-status">● All systems normal</span>
            </div>

            {/* Invite Users Section */}
            <div className="db-invite-card">
              <h2>Invite Team Members</h2>

              <div className="db-invite-form">
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />

                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                </select>

                <button className="db-invite-btn" onClick={handleInvite}>
                  Send Invite
                </button>
              </div>

              {inviteLink && (
                <div className="db-invite-link-wrapper">
                  <span className="db-invite-link-label">Link generated successfully!</span>
                  <div className="db-invite-link-group">
                    <input value={inviteLink} readOnly />
                    <button 
                      className="db-copy-btn" 
                      onClick={() => navigator.clipboard.writeText(inviteLink)}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stat cards */}
          <div className="db-stats">
            {statCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div key={i} className="db-stat-card">
                  <div className="db-stat-icon" style={{ background: card.iconBg, color: card.iconColor }}>
                    {card.checkGreen ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
                    ) : card.emoji ? (
                      <span style={{ fontSize: "18px" }}>🕐</span>
                    ) : (
                      <Icon size={20} />
                    )}
                  </div>
                  <div className="db-stat-body">
                    <div className="db-stat-value">{card.value}</div>
                    <div className="db-stat-label">{card.label}</div>
                    <div className={`db-stat-trend ${card.up === false ? "down" : card.up === null ? "neutral" : "up"}`}>
                      {card.up === true && <TrendingUp size={12} />}
                      {card.up === false && <TrendingDown size={12} />}
                      {card.up === null && <span style={{ fontSize: "11px" }}>↗</span>}
                      {card.trend}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chart + Activity Feed */}
          <div className="db-mid-row">
            <div className="db-chart-card">
              <div className="db-chart-header">
                <div>
                  <h2 className="db-section-title">Task Activity</h2>
                  <p className="db-section-sub">Tasks completed this week</p>
                </div>
                <span className="db-chart-trend">↗ +18% vs last week</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="taskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f6df5" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#4f6df5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} ticks={[0, 3, 6, 9, 12]} />
                  <Tooltip
                    contentStyle={{ border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "13px" }}
                    cursor={{ stroke: "#4f6df5", strokeWidth: 1, strokeDasharray: "4 4" }}
                  />
                  <Area type="monotone" dataKey="tasks" stroke="#4f6df5" strokeWidth={2.5} fill="url(#taskGrad)" dot={{ r: 4, fill: "#4f6df5", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="db-feed-card">
              <div className="db-feed-header">
                <h2 className="db-section-title">Activity Feed</h2>
                <a href="#" className="db-view-all">View all</a>
              </div>
              <div className="db-feed-list">
                {activityFeed.map(item => (
                  <div key={item.id} className="db-feed-item">
                    <span className="db-feed-dot" style={{ background: item.color }} />
                    <div>
                      <p className="db-feed-text">{item.text}</p>
                      <p className="db-feed-time">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Tasks */}
          <div className="db-tasks-card">
            <div className="db-tasks-header">
              <h2 className="db-section-title">Recent Tasks</h2>
              <a href="#" className="db-view-all">View all tasks →</a>
            </div>
            <table className="db-tasks-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.map(row => (
                  <tr key={row.id}>
                    <td className="db-task-name">{row.task}</td>
                    <td className="db-task-project">{row.project}</td>
                    <td>
                      <span className="db-priority" style={{ color: row.priorityColor, borderColor: row.priorityColor + "33", background: row.priorityColor + "11" }}>
                        {row.priority}
                      </span>
                    </td>
                    <td>
                      <span className="db-status" style={{ background: row.statusBg, color: row.statusColor }}>
                        {row.status}
                      </span>
                    </td>
                    <td>
                      <div className="db-assignee" style={{ background: row.assigneeBg }}>{row.assignee}</div>
                    </td>
                    <td className="db-due">{row.due}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}