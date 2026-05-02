import { useState } from "react";
import {
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Folder,
  LayoutDashboard,
  LogOut,
  Mail,
  Search,
  Settings,
  SquareCheckBig,
  Users,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./Dashboard.css";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Projects", icon: Folder },
  { label: "Tasks", icon: SquareCheckBig },
  { label: "Team", icon: Users },
  { label: "Invitations", icon: Mail },
  { label: "Reports", icon: BarChart3 },
  { label: "Settings", icon: Settings },
];

const stats = [
  { label: "Total Projects", value: "12", change: "+2 this month", icon: Folder, tone: "blue" },
  { label: "Total Tasks", value: "148", change: "+24 this week", icon: SquareCheckBig, tone: "purple" },
  { label: "Pending Tasks", value: "31", change: "-5 from last week", icon: Clock3, tone: "yellow" },
  { label: "Completed", value: "107", change: "+18 this week", icon: CheckCircle2, tone: "green" },
  { label: "Team Members", value: "24", change: "3 pending invites", icon: Users, tone: "rose" },
];

const feedItems = [
  { text: 'Alex Kim completed "API Integration"', time: "2 min ago", tone: "green" },
  { text: 'New project "Analytics Dashboard" created', time: "15 min ago", tone: "blue" },
  { text: "Sara Patel joined the workspace", time: "1 hour ago", tone: "purple" },
  { text: '"Mobile App" deadline moved to Dec 30', time: "3 hours ago", tone: "yellow" },
  { text: '5 tasks moved to "Done" in Website Redesign', time: "5 hours ago", tone: "green" },
  { text: 'Comment added on "Backend API" task', time: "Yesterday", tone: "gray" },
];

const recentTasks = [
  { title: "Finalize onboarding flow", owner: "Alex Kim", status: "In progress", due: "Today" },
  { title: "Review analytics dashboard copy", owner: "Sara Patel", status: "Review", due: "Tomorrow" },
  { title: "QA backend API permissions", owner: "John Doe", status: "Blocked", due: "Dec 30" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout/");
      window.location.href = "/signin";
    } catch (error) {
      console.error("Logout failed", error);
      navigate("/signin", { replace: true });
    }
  };

  return (
    <main className={`dashboard-page ${isCollapsed ? "is-collapsed" : ""}`}>
      <aside className="dashboard-sidebar">
        <a href="/dashboard" className="dashboard-brand" aria-label="ProjectFlow dashboard">
          <span className="dashboard-brand-icon">
            <Zap size={22} />
          </span>
          <span className="dashboard-brand-text">ProjectFlow</span>
        </a>

        <nav className="dashboard-nav" aria-label="Dashboard navigation">
          {navItems.map((item) => (
            <a className={item.active ? "is-active" : ""} href={`#${item.label.toLowerCase()}`} key={item.label}>
              <item.icon size={24} />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        <button type="button" className="dashboard-logout" onClick={handleLogout}>
          <LogOut size={24} />
          <span>Logout</span>
        </button>

        <button
          type="button"
          className="dashboard-collapse"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setIsCollapsed((value) => !value)}
        >
          {isCollapsed ? <ChevronRight size={22} /> : <ChevronLeft size={22} />}
        </button>
      </aside>

      <section className="dashboard-shell">
        <header className="dashboard-topbar">
          <div className="dashboard-workspace">
            <strong>Acme Corp</strong>
            <span>Pro</span>
          </div>

          <label className="dashboard-search">
            <Search size={21} />
            <input type="search" placeholder="Search projects, tasks..." />
          </label>

          <div className="dashboard-account">
            <button type="button" className="dashboard-notification" aria-label="Notifications">
              <Bell size={22} />
              <span>2</span>
            </button>

            <button
              type="button"
              className="dashboard-profile"
              onClick={() => setIsProfileOpen((value) => !value)}
              aria-expanded={isProfileOpen}
            >
              <span className="dashboard-avatar">JD</span>
              <span className="dashboard-profile-copy">
                <strong>John Doe</strong>
                <small>Admin</small>
              </span>
              <ChevronDown size={18} />
            </button>

            {isProfileOpen && (
              <div className="dashboard-profile-menu">
                <div>
                  <strong>John Doe</strong>
                  <span>john@acmecorp.com</span>
                </div>
                <a href="#profile">Profile</a>
                <a href="#settings">Settings</a>
                <a href="#billing">Billing</a>
                <a href="#help">Help</a>
                <button type="button" onClick={handleLogout}>Sign out</button>
              </div>
            )}
          </div>
        </header>

        <div className="dashboard-content">
          <section className="dashboard-hero">
            <div>
              <h1>Good morning, John <span aria-hidden="true">👋</span></h1>
              <p>Here's what's happening across your workspace today.</p>
            </div>
            <span className="dashboard-system">All systems normal</span>
          </section>

          <section className="dashboard-stats" aria-label="Workspace metrics">
            {stats.map((stat) => (
              <article className={`dashboard-stat-card tone-${stat.tone}`} key={stat.label}>
                <span className="dashboard-stat-icon">
                  <stat.icon size={34} />
                </span>
                <div>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                  <small>↗ {stat.change}</small>
                </div>
              </article>
            ))}
          </section>

          <section className="dashboard-grid">
            <article className="dashboard-panel dashboard-chart-panel">
              <div className="dashboard-panel-head">
                <div>
                  <h2>Task Activity</h2>
                  <p>Tasks completed this week</p>
                </div>
                <span>↗ +18% vs last week</span>
              </div>

              <div className="dashboard-chart" aria-label="Task activity line chart">
                <div className="dashboard-y-axis">
                  <span>12</span>
                  <span>9</span>
                  <span>6</span>
                  <span>3</span>
                  <span>0</span>
                </div>
                <div className="dashboard-chart-plot">
                  <svg viewBox="0 0 760 260" preserveAspectRatio="none" role="img" aria-label="Weekly completed tasks trend">
                    <defs>
                      <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#5368d9" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#5368d9" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0 170 C65 138 87 112 126 106 C196 96 226 161 302 146 C383 130 392 58 474 66 C555 74 586 142 652 164 C700 181 735 151 760 126 L760 260 L0 260 Z"
                      fill="url(#chartFill)"
                    />
                    <path
                      d="M0 170 C65 138 87 112 126 106 C196 96 226 161 302 146 C383 130 392 58 474 66 C555 74 586 142 652 164 C700 181 735 151 760 126"
                      fill="none"
                      stroke="#5368d9"
                      strokeLinecap="round"
                      strokeWidth="4"
                    />
                    {[0, 126, 302, 474, 586, 652, 760].map((x, index) => {
                      const yValues = [170, 106, 146, 66, 142, 164, 126];
                      return <circle cx={x} cy={yValues[index]} fill="#5368d9" key={x} r="4" />;
                    })}
                  </svg>
                  <div className="dashboard-days">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>
                </div>
              </div>
            </article>

            <article className="dashboard-panel dashboard-feed">
              <div className="dashboard-panel-head">
                <h2>Activity Feed</h2>
                <a href="#activity">View all</a>
              </div>
              <div className="dashboard-feed-list">
                {feedItems.map((item) => (
                  <div className="dashboard-feed-item" key={`${item.text}-${item.time}`}>
                    <span className={`dashboard-feed-dot tone-${item.tone}`} />
                    <div>
                      <p>{item.text}</p>
                      <small>{item.time}</small>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="dashboard-panel dashboard-tasks">
            <div className="dashboard-panel-head">
              <h2>Recent Tasks</h2>
              <a href="#tasks">View all tasks →</a>
            </div>
            <div className="dashboard-task-list">
              {recentTasks.map((task) => (
                <article className="dashboard-task-row" key={task.title}>
                  <div>
                    <strong>{task.title}</strong>
                    <span>{task.owner}</span>
                  </div>
                  <span className={`dashboard-task-status status-${task.status.toLowerCase().replace(" ", "-")}`}>
                    {task.status}
                  </span>
                  <small>{task.due}</small>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
