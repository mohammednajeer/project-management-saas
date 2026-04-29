import { KanbanSquare, Mail, Lock, User, Building2, ArrowLeft } from "lucide-react";
import "./Auth.css";
import "./Signup.css";

export default function Signup() {
  return (
    <main className="auth-root">
      <div aria-hidden className="auth-blobs">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />
      </div>

      <a href="/" className="auth-back">
        <ArrowLeft size={14} /> Back home
      </a>

      <div className="auth-card">
        {/* Brand panel */}
        <div className="auth-panel signup-panel">
          <div className="auth-panel-inner">
            <div className="auth-panel-mark">
              <KanbanSquare size={24} />
            </div>
            <h2>Welcome back!</h2>
            <p>Already part of a workspace? Jump back in and pick up where your team left off.</p>
            <a href="/signin" className="auth-switch-btn">Sign in</a>
          </div>
        </div>

        {/* Form */}
        <div className="auth-form-wrap signup-form-wrap">
          <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
            <div className="auth-form-head">
              <h1>Create your workspace</h1>
              <p>Start collaborating with your team in minutes.</p>
            </div>

            <div className="auth-field">
              <label className="auth-label">Full name</label>
              <div className="auth-input-wrap">
                <User size={16} className="auth-input-icon" />
                <input className="auth-input" type="text" placeholder="Ada Lovelace" />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Workspace name</label>
              <div className="auth-input-wrap">
                <Building2 size={16} className="auth-input-icon" />
                <input className="auth-input" type="text" placeholder="Acme Corp" />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Email</label>
              <div className="auth-input-wrap">
                <Mail size={16} className="auth-input-icon" />
                <input className="auth-input" type="email" placeholder="you@company.com" />
              </div>
            </div>

            <div className="auth-field">
              <label className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <Lock size={16} className="auth-input-icon" />
                <input className="auth-input" type="password" placeholder="••••••••" />
              </div>
            </div>

            <button type="submit" className="auth-submit">Create workspace</button>

            <div className="auth-divider">
              <span>or continue with</span>
            </div>

            <div className="auth-oauth">
              <button type="button" className="auth-oauth-btn">Google</button>
              <button type="button" className="auth-oauth-btn">GitHub</button>
            </div>

            <p className="auth-mobile-switch">
              Already have an account? <a href="/signin">Sign in</a>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
