import { KanbanSquare, Mail, Lock, ArrowLeft } from "lucide-react";
import "./Auth.css";
import "./Signin.css";

export default function Signin() {
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
        {/* Form */}
        <div className="auth-form-wrap signin-form-wrap">
          <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
            <div className="auth-form-head">
              <h1>Welcome back</h1>
              <p>Sign in to your Nimbus account.</p>
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

            <div className="auth-row-end">
              <button type="button" className="auth-link-btn">Forgot password?</button>
            </div>

            <button type="submit" className="auth-submit">Sign in</button>

            <div className="auth-divider">
              <span>or continue with</span>
            </div>

            <div className="auth-oauth">
              <button type="button" className="auth-oauth-btn">Google</button>
              <button type="button" className="auth-oauth-btn">GitHub</button>
            </div>

            <p className="auth-mobile-switch">
              New to Nimbus? <a href="/signup">Sign up</a>
            </p>
          </form>
        </div>

        {/* Brand panel */}
        <div className="auth-panel signin-panel">
          <div className="auth-panel-inner">
            <div className="auth-panel-mark">
              <KanbanSquare size={24} />
            </div>
            <h2>Hello, friend!</h2>
            <p>New to Nimbus? Create your workspace and invite your team in seconds.</p>
            <a href="/signup" className="auth-switch-btn">Sign up</a>
          </div>
        </div>
      </div>
    </main>
  );
}
