import { useMemo, useState } from "react";
import { ArrowRight, Check, Eye, EyeOff, Plus, Zap } from "lucide-react";
import "./AuthPage.css";

/* ─────────────────────────────────────────────
   Signup multi-step config
───────────────────────────────────────────── */
const STEPS = ["Account", "Workspace", "Invite"];

/* ─────────────────────────────────────────────
   Root AuthPage
───────────────────────────────────────────── */
export default function AuthPage() {
  const [isSignup, setIsSignup] = useState(false);

  return (
    <main className="ap-root">
      <div className="ap-shell">
        {/* ── Left: Brand Panel ── */}
        <aside className="ap-brand" aria-label="ProjectFlow">
          <a href="/" className="ap-brand-logo">
            <span className="ap-logo-icon">
              <Zap size={22} />
            </span>
            <span>ProjectFlow</span>
          </a>

          <div className="ap-brand-body">
            <div className="ap-brand-illustration" aria-hidden="true">
              <IllustrationSVG />
            </div>

            <h1 className="ap-brand-title">
              {isSignup
                ? "Ship projects faster, together."
                : "Manage projects with clarity."}
            </h1>
            <p className="ap-brand-desc">
              {isSignup
                ? "Set up your workspace in under two minutes and invite your whole team."
                : "Everything your team needs to plan, track, and ship on time — in one place."}
            </p>

            <ul className="ap-benefits">
              <BenefitItem text="Real-time collaboration across teams" />
              <BenefitItem text="Role-based access for every member" />
              <BenefitItem text="Analytics and reporting built in" />
            </ul>
          </div>

          <figure className="ap-testimonial">
            <blockquote>
              "ProjectFlow transformed how our 50-person team collaborates.
              We ship 30% faster now."
            </blockquote>
            <figcaption>
              <span className="ap-avatar">AK</span>
              <span>
                <strong>Alex Kim</strong>
                <small>VP Engineering, Streamline</small>
              </span>
            </figcaption>
          </figure>
        </aside>

        {/* ── Right: Sliding Forms ── */}
        <div className="ap-forms-viewport">
          <div
            className="ap-forms-track"
            style={{ transform: isSignup ? "translateX(-100%)" : "translateX(0)" }}
          >
            {/* Sign In */}
            <div className="ap-form-panel" aria-hidden={isSignup}>
              <SigninForm onSwitchToSignup={() => setIsSignup(true)} />
            </div>

            {/* Sign Up */}
            <div className="ap-form-panel" aria-hidden={!isSignup}>
              <SignupForm onSwitchToSignin={() => setIsSignup(false)} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ─────────────────────────────────────────────
   Sign In Form
───────────────────────────────────────────── */
function SigninForm({ onSwitchToSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const { default: api } = await import("../../services/api");
      await api.post("/auth/login/", { email, password });
      window.location.href = "/dashboard";
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Login failed. Please check your credentials."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="ap-form" onSubmit={handleSubmit} noValidate>
      <div className="ap-form-head">
        <h2>Welcome back</h2>
        <p>Sign in to your workspace</p>
      </div>

      <div className="ap-oauth">
        <button type="button" className="ap-oauth-btn">
          <GoogleIcon /> Google
        </button>
        <button type="button" className="ap-oauth-btn">
          <GitHubIcon /> GitHub
        </button>
      </div>

      <div className="ap-divider">
        <span>or sign in with email</span>
      </div>

      <label className="ap-field">
        <span className="ap-label">Email address</span>
        <input
          className="ap-input"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          autoComplete="email"
        />
      </label>

      <label className="ap-field">
        <span className="ap-label-row">
          <span className="ap-label">Password</span>
          <button type="button" className="ap-link-btn">
            Forgot password?
          </button>
        </span>
        <span className="ap-input-wrap">
          <input
            className="ap-input ap-input-has-icon"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            autoComplete="current-password"
          />
          <button
            type="button"
            className="ap-eye-btn"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </span>
      </label>

      {error && (
        <p className="ap-error" role="alert">
          {error}
        </p>
      )}

      <label className="ap-check">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        <span className="ap-check-box">
          <Check size={12} />
        </span>
        Remember me for 30 days
      </label>

      <button type="submit" className="ap-submit" disabled={isLoading}>
        {isLoading ? "Signing in…" : "Sign in to workspace"}
        <ArrowRight size={17} />
      </button>

      <p className="ap-switch-note">
        Don't have a workspace?{" "}
        <button type="button" className="ap-switch-btn" onClick={onSwitchToSignup}>
          Create one free
        </button>
      </p>
    </form>
  );
}

/* ─────────────────────────────────────────────
   Sign Up Form (multi-step)
───────────────────────────────────────────── */
function SignupForm({ onSwitchToSignin }) {
  const [step, setStep] = useState(0);
  const [invites, setInvites] = useState([0, 1, 2]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    workspace_name: "",
  });

  const buttonLabel = useMemo(
    () => (step === STEPS.length - 1 ? "Create workspace" : "Continue"),
    [step]
  );

  const handleChange = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }

    setIsLoading(true);
    try {
      const { default: api } = await import("../../services/api");
      await api.post("/organizations/register/", {
        name: formData.workspace_name,
        email: formData.email,
        phone: "0000000000",
        admin_name: formData.name,
        password: formData.password,
      });
      window.location.href = "/dashboard";
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.email?.[0] ||
          "Signup failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ap-form ap-signup-wrapper">
      {/* Logo */}
      <a href="/" className="ap-brand-logo ap-brand-logo--dark">
        <span className="ap-logo-icon ap-logo-icon--dark">
          <Zap size={20} />
        </span>
        <span>ProjectFlow</span>
      </a>

      {/* Stepper */}
      <nav className="ap-stepper" aria-label="Signup steps">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`ap-step ${i < step ? "is-complete" : ""} ${
              i === step ? "is-active" : ""
            }`}
            onClick={() => i < step && setStep(i)}
            aria-current={i === step ? "step" : undefined}
          >
            <span className="ap-step-dot">
              {i < step ? <Check size={16} /> : i + 1}
            </span>
            <span className="ap-step-label">{label}</span>
          </button>
        ))}
      </nav>

      {/* Step card */}
      <form className="ap-card" onSubmit={handleSubmit} noValidate>
        {step === 0 && (
          <AccountStep formData={formData} handleChange={handleChange} />
        )}
        {step === 1 && (
          <WorkspaceStep formData={formData} handleChange={handleChange} />
        )}
        {step === 2 && (
          <InviteStep
            invites={invites}
            onAddInvite={() => setInvites((items) => [...items, items.length])}
          />
        )}

        {error && (
          <p className="ap-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="ap-submit" disabled={isLoading}>
          {isLoading ? "Creating…" : buttonLabel}
          <ArrowRight size={17} />
        </button>
      </form>

      <p className="ap-switch-note">
        Already have a workspace?{" "}
        <button type="button" className="ap-switch-btn" onClick={onSwitchToSignin}>
          Sign in
        </button>
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Signup sub-steps
───────────────────────────────────────────── */
function AccountStep({ formData, handleChange }) {
  const [showPassword, setShowPassword] = useState(false);

  const strength = useMemo(() => {
    const p = formData.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  }, [formData.password]);

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColors = ["", "#ef4444", "#f59e0b", "#3b82f6", "#22c55e"];

  return (
    <>
      <div className="ap-form-head">
        <h2>Create your account</h2>
        <p>Start your free trial — no card required.</p>
      </div>

      <label className="ap-field">
        <span className="ap-label">Full name</span>
        <input
          className="ap-input"
          type="text"
          placeholder="John Doe"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          autoComplete="name"
        />
      </label>

      <label className="ap-field">
        <span className="ap-label">Work email</span>
        <input
          className="ap-input"
          type="email"
          placeholder="you@company.com"
          value={formData.email}
          onChange={(e) => handleChange("email", e.target.value)}
          autoComplete="email"
        />
      </label>

      <label className="ap-field">
        <span className="ap-label">Password</span>
        <span className="ap-input-wrap">
          <input
            className="ap-input ap-input-has-icon"
            type={showPassword ? "text" : "password"}
            placeholder="Min. 8 characters"
            value={formData.password}
            onChange={(e) => handleChange("password", e.target.value)}
            autoComplete="new-password"
          />
          <button
            type="button"
            className="ap-eye-btn"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </span>

        {formData.password && (
          <span className="ap-strength-row">
            <span className="ap-strength">
              {[1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="ap-strength-bar"
                  style={{
                    background: i <= strength ? strengthColors[strength] : undefined,
                  }}
                />
              ))}
            </span>
            <span
              className="ap-strength-label"
              style={{ color: strengthColors[strength] }}
            >
              {strengthLabel}
            </span>
          </span>
        )}
      </label>
    </>
  );
}

function WorkspaceStep({ formData, handleChange }) {
  return (
    <>
      <div className="ap-form-head">
        <h2>Set up your workspace</h2>
        <p>This is where your team will collaborate.</p>
      </div>

      <label className="ap-field">
        <span className="ap-label">Workspace name</span>
        <input
          className="ap-input"
          type="text"
          placeholder="Acme Corp"
          value={formData.workspace_name}
          onChange={(e) => handleChange("workspace_name", e.target.value)}
        />
      </label>

      <div className="ap-workspace-preview">
        <span className="ap-workspace-slug">
          projectflow.app/
          <strong>
            {formData.workspace_name
              ? formData.workspace_name.toLowerCase().replace(/\s+/g, "-")
              : "your-workspace"}
          </strong>
        </span>
        <span className="ap-workspace-hint">Your team's unique URL</span>
      </div>
    </>
  );
}

function InviteStep({ invites, onAddInvite }) {
  return (
    <>
      <div className="ap-form-head">
        <h2>Invite your team</h2>
        <p>You can always do this later.</p>
      </div>

      <div className="ap-invite-list">
        {invites.map((item) => (
          <input
            key={item}
            className="ap-input"
            type="email"
            placeholder="colleague@company.com"
          />
        ))}
      </div>

      <button type="button" className="ap-add-btn" onClick={onAddInvite}>
        <Plus size={16} />
        Add another
      </button>
    </>
  );
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function BenefitItem({ text }) {
  return (
    <li className="ap-benefit">
      <span className="ap-benefit-dot">
        <Check size={12} />
      </span>
      {text}
    </li>
  );
}

function IllustrationSVG() {
  return (
    <svg viewBox="0 0 340 220" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Dashboard card */}
      <rect x="20" y="20" width="210" height="140" rx="12" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      {/* Header bar */}
      <rect x="20" y="20" width="210" height="32" rx="12" fill="rgba(255,255,255,0.08)" />
      <rect x="20" y="40" width="210" height="12" fill="rgba(255,255,255,0.08)" />
      <circle cx="40" cy="36" r="7" fill="rgba(255,255,255,0.25)" />
      <rect x="54" y="32" width="60" height="8" rx="4" fill="rgba(255,255,255,0.2)" />

      {/* Progress bars */}
      <rect x="36" y="66" width="160" height="6" rx="3" fill="rgba(255,255,255,0.1)" />
      <rect x="36" y="66" width="110" height="6" rx="3" fill="rgba(255,255,255,0.55)" />

      <rect x="36" y="82" width="160" height="6" rx="3" fill="rgba(255,255,255,0.1)" />
      <rect x="36" y="82" width="70" height="6" rx="3" fill="rgba(255,255,255,0.35)" />

      <rect x="36" y="98" width="160" height="6" rx="3" fill="rgba(255,255,255,0.1)" />
      <rect x="36" y="98" width="130" height="6" rx="3" fill="rgba(255,255,255,0.45)" />

      {/* Task chips */}
      <rect x="36" y="118" width="52" height="20" rx="6" fill="rgba(255,255,255,0.18)" />
      <rect x="96" y="118" width="52" height="20" rx="6" fill="rgba(255,255,255,0.1)" />
      <rect x="156" y="118" width="52" height="20" rx="6" fill="rgba(255,255,255,0.14)" />

      {/* Floating card top-right */}
      <rect x="200" y="10" width="130" height="72" rx="10" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
      <circle cx="220" cy="30" r="8" fill="rgba(255,255,255,0.3)" />
      <rect x="234" y="25" width="60" height="7" rx="3.5" fill="rgba(255,255,255,0.25)" />
      <rect x="234" y="36" width="40" height="5" rx="2.5" fill="rgba(255,255,255,0.15)" />
      <rect x="212" y="50" width="100" height="5" rx="2.5" fill="rgba(255,255,255,0.15)" />
      <rect x="212" y="60" width="70" height="5" rx="2.5" fill="rgba(255,255,255,0.1)" />

      {/* Floating bottom-right stat card */}
      <rect x="230" y="110" width="100" height="56" rx="10" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      <rect x="246" y="124" width="30" height="5" rx="2.5" fill="rgba(255,255,255,0.2)" />
      <rect x="246" y="134" width="50" height="10" rx="4" fill="rgba(255,255,255,0.35)" />
      <rect x="246" y="150" width="40" height="5" rx="2.5" fill="rgba(255,255,255,0.15)" />

      {/* Decorative dots */}
      <circle cx="305" cy="30" r="3" fill="rgba(255,255,255,0.3)" />
      <circle cx="315" cy="20" r="2" fill="rgba(255,255,255,0.2)" />
      <circle cx="10" cy="180" r="3" fill="rgba(255,255,255,0.2)" />
      <circle cx="22" cy="195" r="2" fill="rgba(255,255,255,0.15)" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}