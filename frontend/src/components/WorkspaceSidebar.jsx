import {
  Bell,
  CheckSquare,
  Home,
  AlertCircle,
  LogOut,
  Sparkles,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import api from "../services/api";
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
    to: "/workspace/tasks",
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
