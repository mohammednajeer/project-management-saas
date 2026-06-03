import { useState } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  Activity,
  AlertCircle,
  Users,
  BarChart2,
  Settings,
  LogOut,
  Zap,
  Bell,
  UserRound,
  MessageCircle,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import useNotifications from "../context/useNotifications";
import { getCompanyFromUser, getCompanyInitials, getCompanyName } from "../utils/company";
import "./Sidebar.css";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard",     to: "/dashboard",              end: true },
  { icon: FolderOpen,      label: "Projects",      to: "/dashboard/projects"                },
  { icon: CheckSquare,     label: "Tasks",         to: "/dashboard/tasks"                   },
  { icon: Activity,        label: "Activity",      to: "/dashboard/activity"                },
  { icon: AlertCircle,     label: "Issues",        to: "/dashboard/issues"                  },
  { icon: Users,           label: "Team",          to: "/dashboard/team"                    },
  { icon: BarChart2,       label: "Reports",       to: "/dashboard/reports"                 },
  { icon: Bell,            label: "Notifications", to: "/dashboard/notifications"           },
  { icon: Settings,        label: "Settings",      to: "/dashboard/settings"                },
  { icon: MessageCircle,   label: "Chat",          to: "/dashboard/chat"                    },
];

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const { unreadCount } = useNotifications();
  const { user } = useAuth();
  const company = getCompanyFromUser(user);
  const companyName = getCompanyName(company, user?.organization || "ProjectFlow");

  const initials = (user?.name || user?.email || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  const handleLogout = async () => {
    try { await api.post("/auth/logout/"); } catch {}
    window.location.href = "/signin";
  };

  return (
    <aside
      className={`sb ${expanded ? "sb--open" : ""}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Glow backdrop */}
      <div className="sb-glow" />

      {/* Brand */}
      <div className="sb-brand">
        <div className="sb-brand-icon">
          {company?.logo ? (
            <img src={company.logo} alt="" />
          ) : (
            getCompanyInitials(company, "PF")
          )}
        </div>
        <div className="sb-brand-copy">
          <span className="sb-company-name">{companyName}</span>
          <span className="sb-product-name">
            <Zap size={12} />
            ProjectFlow
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sb-nav">
        {navItems.map(({ icon: Icon, label, to, end }) => (
          <NavLink
            key={label}
            to={to}
            end={end}
            data-label={label}
            className={({ isActive }) =>
              `sb-item${isActive ? " sb-item--active" : ""}`
            }
          >
            <span className="sb-item-icon">
              <Icon size={17} />
              {label === "Notifications" && unreadCount > 0 && (
                <span className="sb-badge">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </span>
            <span className="sb-item-label">{label}</span>
            {label === "Notifications" && unreadCount > 0 && (
              <span className="sb-item-count">{unreadCount > 99 ? "99+" : unreadCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sb-footer">
        <div className="sb-divider" />

        <NavLink
          to="/dashboard/profile"
          className={({ isActive }) =>
            `sb-item sb-item--profile${isActive ? " sb-item--active" : ""}`
          }
        >
          <span className="sb-item-icon">
            <div className="sb-avatar">
              {user?.profile_picture ? (
                <img src={user.profile_picture} alt="" />
              ) : (
                initials || <UserRound size={13} />
              )}
            </div>
          </span>
          <div className="sb-profile-info">
            <span className="sb-profile-name">{user?.name || user?.email || "Profile"}</span>
            <span className="sb-profile-role">{user?.role || "Member"}</span>
          </div>
        </NavLink>

        <button className="sb-item sb-item--logout" onClick={handleLogout}>
          <span className="sb-item-icon">
            <LogOut size={17} />
          </span>
          <span className="sb-item-label">Logout</span>
        </button>
      </div>
    </aside>
  );
}
