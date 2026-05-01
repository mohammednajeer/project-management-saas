import { LogOut, ShieldCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
  try {
        await api.post("/auth/logout/");
        // Force a reload or redirect to signin
        window.location.href = "/signin"; 
    } catch (error) {
        console.error("Logout failed", error);
        // Even if the server fails, clear the UI
        navigate("/signin", { replace: true });
    }
};

  return (
    <main className="dashboard-page">
      <aside className="dashboard-sidebar">
        <a href="/dashboard" className="dashboard-brand">
          <span className="dashboard-brand-icon">
            <Sparkles size={20} />
          </span>
          <span>ProjectFlow</span>
        </a>

        <nav className="dashboard-nav" aria-label="Dashboard navigation">
          <a className="is-active" href="/dashboard">Overview</a>
          <a href="#projects">Projects</a>
          <a href="#team">Team</a>
          <a href="#reports">Reports</a>
        </nav>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <p className="dashboard-kicker">Workspace dashboard</p>
            <h1>Welcome back</h1>
          </div>

          <button type="button" className="dashboard-logout" onClick={handleLogout}>
            <LogOut size={18} />
            Logout
          </button>
        </header>

        <section className="dashboard-welcome-card" aria-label="Workspace summary">
          <div>
            <span className="dashboard-status">
              <ShieldCheck size={16} />
              Active workspace
            </span>
            <h2>Welcome to your organization dashboard</h2>
            <p>Track your team's work, manage access, and keep delivery moving from one clean workspace.</p>
          </div>
        </section>

        <div className="dashboard-info-grid">
          <article className="dashboard-info-card">
            <span>Organization</span>
            <strong>ProjectFlow Workspace</strong>
          </article>

          <article className="dashboard-info-card">
            <span>User role</span>
            <strong>Admin</strong>
          </article>
        </div>
      </section>
    </main>
  );
}
