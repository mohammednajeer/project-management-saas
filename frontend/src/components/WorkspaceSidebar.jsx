import { useState } from "react";
import {
  Bell,
  CheckSquare,
  Home,
  Activity,
  AlertCircle,
  CalendarDays,
  LogOut,
  PlaneTakeoff,
  Sparkles,
  UserRound,
  MessageCircle,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import useNotifications from "../context/useNotifications";
import { getCompanyFromUser, getCompanyInitials, getCompanyName } from "../utils/company";

import "./Sidebar.css";

const workspaceNavItems = [
  { type: "header", label: "Core" },
  {
    icon: Home,
    label: "Workspace Home",
    to: "/workspace",
    end: true,
  },
  {
    icon: CheckSquare,
    label: "My Work",
    to: "/workspace/my-tasks",
  },

  { type: "divider" },
  { type: "header", label: "Operations" },
  {
    icon: AlertCircle,
    label: "Issues",
    to: "/workspace/issues",
  },
  {
    icon: PlaneTakeoff,
    label: "Leave",
    to: "/workspace/leave",
  },
  {
    icon: CalendarDays,
    label: "Calendar",
    to: "/workspace/calendar",
  },
  {
    icon: Activity,
    label: "Activity",
    to: "/workspace/activity",
  },

  { type: "divider" },
  { type: "header", label: "Collaboration" },
  {
    icon: MessageCircle,
    label: "Chat",
    to: "/workspace/chat",
  },

  { type: "divider" },
  { type: "header", label: "System" },
  {
    icon: Bell,
    label: "Notifications",
    to: "/workspace/notifications",
  },
];

export default function WorkspaceSidebar() {
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
    try {
      await api.post("/auth/logout/");
    } catch (err) {
      console.log(err);
    }
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
            <Sparkles size={12} style={{ color: "#a8c8f8" }} />
            Workspace
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sb-nav">
        {workspaceNavItems.map((item, idx) => {
          if (item.type === "header") {
            return (
              <div key={`header-${idx}`} className="sb-group-title">
                {item.label}
              </div>
            );
          }
          if (item.type === "divider") {
            return <div key={`divider-${idx}`} className="sb-group-divider" />;
          }
          const { icon: Icon, label, to, end } = item;
          return (
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
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sb-footer">
        <div className="sb-divider" />

        <NavLink
          to="/workspace/profile"
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
