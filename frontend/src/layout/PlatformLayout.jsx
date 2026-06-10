import { Outlet, NavLink } from "react-router-dom";
import { LayoutDashboard, Building2, ShieldAlert, LogOut, Zap, UserRound, Users } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./PlatformLayout.css";

export default function PlatformLayout() {
  const { user } = useAuth();

  const initials = (user?.name || user?.email || "P")
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
      console.error("Logout failed:", err);
    }
    window.location.href = "/signin";
  };

  return (
    <div className="platform-layout">
      {/* Floating Capsule Header */}
      <header className="platform-header">
        <nav className="platform-navbar">
          {/* Brand Logo */}
          <div className="platform-brand">
            <span className="platform-logo-icon">
              <Zap size={16} />
            </span>
            <span className="platform-brand-text">
              ProjectFlow <span className="platform-badge">Admin</span>
            </span>
          </div>

          {/* Navigation Links */}
          <div className="platform-nav-links">
            <NavLink
              to="/platform"
              end
              className={({ isActive }) =>
                `platform-nav-item ${isActive ? "active" : ""}`
              }
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </NavLink>
            <NavLink
              to="/platform/organizations"
              className={({ isActive }) =>
                `platform-nav-item ${isActive ? "active" : ""}`
              }
            >
              <Building2 size={16} />
              <span>Workspaces</span>
            </NavLink>
            <NavLink
              to="/platform/users"
              className={({ isActive }) =>
                `platform-nav-item ${isActive ? "active" : ""}`
              }
            >
              <Users size={16} />
              <span>Users</span>
            </NavLink>
            <NavLink
              to="/platform/maintenance"
              className={({ isActive }) =>
                `platform-nav-item ${isActive ? "active" : ""}`
              }
            >
              <ShieldAlert size={16} />
              <span>System & Logs</span>
            </NavLink>
          </div>

          {/* User Profile & Logout */}
          <div className="platform-user-actions">
            <div className="platform-user-profile" title={user?.email}>
              <div className="platform-avatar">
                {user?.profile_picture ? (
                  <img src={user.profile_picture} alt="Avatar" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <span className="platform-user-name">{user?.name || "Platform Admin"}</span>
            </div>
            <button className="platform-logout-btn" onClick={handleLogout} title="Log Out">
              <LogOut size={16} />
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="platform-content-container">
        <Outlet />
      </main>
    </div>
  );
}
