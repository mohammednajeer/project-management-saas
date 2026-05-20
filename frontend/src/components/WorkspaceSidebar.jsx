import {
  Bell,
  CheckSquare,
  Home,
  AlertCircle,
  LogOut,
  Sparkles,
  UserRound,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import useNotifications from "../context/useNotifications";

import "./WorkspaceSidebar.css";

const workspaceNavItems = [
  {
    icon: Home,
    label: "Workspace Home",
    to: "/workspace",
    end: true,
  },
  {
    icon: CheckSquare,
    label: "My Tasks",
    to: "/workspace/my-tasks",
  },
  {
    icon: AlertCircle,
    label: "Issues",
    to: "/workspace/issues",
  },
  {
    icon: Bell,
    label: "Notifications",
    to: "/workspace/notifications",
  },
];

export default function WorkspaceSidebar() {
  const { unreadCount } = useNotifications();
  const { user } = useAuth();
  const initials = (user?.name || user?.email || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
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
    <aside className="workspace-sidebar">
      <a
        href="/workspace"
        className="workspace-sidebar-brand"
      >
        <span className="workspace-sidebar-brand-icon">
          <Sparkles size={18} />
        </span>
        <span>
          ProjectFlow
        </span>
      </a>

      <nav className="workspace-sidebar-nav">
        {workspaceNavItems.map(({
          icon: Icon,
          label,
          to,
          end,
        }) => (
          <NavLink
            key={label}
            to={to}
            end={end}
            className={({ isActive }) =>
              `workspace-sidebar-link${
                isActive ? " is-active" : ""
              }`
            }
          >
            <span className="workspace-sidebar-icon">
              <Icon size={18} />
              {label === "Notifications" &&
                unreadCount > 0 && (
                  <span className="workspace-notification-badge">
                    {unreadCount > 99
                      ? "99+"
                      : unreadCount}
                  </span>
                )}
            </span>
            <span>
              {label}
            </span>
          </NavLink>
        ))}
      </nav>

      <NavLink
        to="/workspace/profile"
        className={({ isActive }) =>
          `workspace-sidebar-profile${
            isActive ? " is-active" : ""
          }`
        }
      >
        <span className="workspace-sidebar-avatar">
          {user?.profile_picture ? (
            <img src={user.profile_picture} alt="" />
          ) : (
            initials || <UserRound size={15} />
          )}
        </span>
        <span>
          Profile
        </span>
      </NavLink>

      <button
        className="workspace-sidebar-logout"
        type="button"
        onClick={handleLogout}
      >
        <LogOut size={18} />
        <span>
          Logout
        </span>
      </button>
    </aside>
  );
}
