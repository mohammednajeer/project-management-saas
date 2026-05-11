import { useEffect, useState } from "react";

import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  Users,
  Mail,
  BarChart2,
  Settings,
  LogOut,
  Sparkles,
  Bell,
} from "lucide-react";

import { NavLink } from "react-router-dom";

import api from "../services/api";

import "./Sidebar.css";

const navItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    to: "/dashboard",
    end: true,
  },

  {
    icon: FolderOpen,
    label: "Projects",
    to: "/dashboard/projects",
  },

  {
    icon: CheckSquare,
    label: "Tasks",
    to: "/dashboard/tasks",
  },

  {
    icon: Users,
    label: "Team",
    to: "/dashboard/team",
  },

  {
    icon: Mail,
    label: "Invitations",
    to: "/dashboard/invitations",
  },

  {
    icon: BarChart2,
    label: "Reports",
    to: "/dashboard/reports",
  },

  {
    icon: Bell,
    label: "Notifications",
    to: "/dashboard/notifications",
  },

  {
    icon: Settings,
    label: "Settings",
    to: "/dashboard/settings",
  },
];

export default function Sidebar() {

  const [hovered, setHovered] =
    useState(false);

  const [unreadCount,
    setUnreadCount
  ] = useState(0);

  const handleLogout =
    async () => {

      try {

        await fetch(
          "/api/auth/logout/",
          {
            method: "POST",
          }
        );

      } catch {}

      window.location.href =
        "/signin";
    };

  const fetchUnreadNotifications =
    async () => {

      try {

        const res =
          await api.get(
            "/notifications/"
          );

        const unread =
          res.data.filter(
            (notification) =>
              !notification.is_read
          );

        setUnreadCount(
          unread.length
        );

      } catch (err) {

        console.log(err);
      }
    };

  useEffect(() => {

    fetchUnreadNotifications();

    window.addEventListener(
      "notificationsUpdated",
      fetchUnreadNotifications
    );

    return () => {

      window.removeEventListener(
        "notificationsUpdated",
        fetchUnreadNotifications
      );
    };

  }, []);

  return (

    <aside
      className={`sidebar ${
        hovered
          ? "sidebar--expanded"
          : "sidebar--collapsed"
      }`}
      onMouseEnter={() =>
        setHovered(true)
      }
      onMouseLeave={() =>
        setHovered(false)
      }
    >

      {/* Brand */}

      <a
        href="/dashboard"
        className="sidebar-brand"
      >

        <span className="sidebar-brand-icon">

          <Sparkles size={18} />

        </span>

        <span className="sidebar-brand-text">

          ProjectFlow

        </span>

      </a>

      {/* Nav */}

      <nav className="sidebar-nav">

        {navItems.map(
          ({
            icon: Icon,
            label,
            to,
            end,
          }) => (

            <NavLink
              key={label}
              to={to}
              end={end}
              className={({
                isActive,
              }) =>
                `sidebar-nav-item${
                  isActive
                    ? " is-active"
                    : ""
                }`
              }
            >

              <span className="sidebar-nav-icon">

                <Icon size={18} />

                {label ===
                  "Notifications" &&
                  unreadCount > 0 && (

                  <span className="notification-badge">

                    {unreadCount}

                  </span>

                )}

              </span>

              <span className="sidebar-nav-label">

                {label}

              </span>

            </NavLink>
          )
        )}

      </nav>

      {/* Footer */}

      <div className="sidebar-footer">

        <button
          className="sidebar-logout"
          onClick={handleLogout}
        >

          <span className="sidebar-nav-icon">

            <LogOut size={18} />

          </span>

          <span className="sidebar-nav-label">

            Logout

          </span>

        </button>

      </div>

    </aside>
  );
}