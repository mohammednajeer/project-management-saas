import { ArrowRight, Check, Eye, Zap } from "lucide-react";
import "./Auth.css";
import "./Signin.css";

export default function Signin() {
  return (
    <main className="auth-root auth-login-page">
      <section className="auth-login-shell" aria-label="Sign in">
        <aside className="auth-login-brand" aria-label="ProjectFlow">
          <a href="/" className="auth-brand auth-brand-light">
            <span className="auth-logo auth-logo-soft">
              <Zap size={24} />
            </span>
            <span>ProjectFlow</span>
          </a>

          <div className="auth-brand-copy">
            <h1>Manage projects with clarity</h1>
            <p>Everything your team needs to plan, track, and ship projects on time.</p>

            <ul className="auth-benefits" aria-label="ProjectFlow benefits">
              <li>
                <span><ArrowRight size={14} /></span>
                Real-time collaboration across teams
              </li>
              <li>
                <span><ArrowRight size={14} /></span>
                Role-based access for every member
              </li>
              <li>
                <span><ArrowRight size={14} /></span>
                Analytics and reporting built in
              </li>
            </ul>
          </div>

          <figure className="auth-testimonial">
            <blockquote>
              "ProjectFlow transformed how our 50-person team collaborates. We ship 30% faster now."
            </blockquote>
            <figcaption>
              <span className="auth-avatar">AK</span>
              <span>
                <strong>Alex Kim</strong>
                <small>VP Engineering, Streamline</small>
              </span>
            </figcaption>
          </figure>
        </aside>

        <div className="auth-login-content">
          <form className="auth-login-form" onSubmit={(event) => event.preventDefault()}>
            <div className="auth-form-head auth-form-head-left">
              <h2>Welcome back</h2>
              <p>Sign in to your workspace</p>
            </div>

            <div className="auth-oauth">
              <button type="button" className="auth-oauth-btn">Google</button>
              <button type="button" className="auth-oauth-btn">GitHub</button>
            </div>

            <div className="auth-divider">
              <span>or sign in with email</span>
            </div>

            <label className="auth-field">
              <span className="auth-label">Email address</span>
              <input className="auth-input" type="email" placeholder="you@company.com" />
            </label>

            <label className="auth-field">
              <span className="auth-label-row">
                <span className="auth-label">Password</span>
                <button type="button" className="auth-link-btn">Forgot password?</button>
              </span>
              <span className="auth-input-wrap">
                <input className="auth-input auth-input-with-action" type="password" placeholder="Enter your password" />
                <Eye size={18} className="auth-input-action" aria-hidden="true" />
              </span>
            </label>

            <label className="auth-check">
              <input type="checkbox" />
              <span>
                <Check size={14} />
              </span>
              Remember me for 30 days
            </label>

            <button type="submit" className="auth-submit">
              Sign in to workspace
              <ArrowRight size={18} />
            </button>

            <p className="auth-footer-note">
              Don't have a workspace? <a href="/signup">Create one free</a>
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
