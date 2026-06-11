import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Zap,
  AlertCircle,
  ShieldX,
} from "lucide-react";
import { getCompanyInitials, getCompanyName } from "../../../utils/company";
import "./InviteSignup.css";

// lazy import api
async function getApi() {
  const { default: api } = await import("../../../services/api");
  return api;
}

const panelPathByRole = {
  admin: "/dashboard",
  manager: "/dashboard",
  employee: "/workspace",
};

function getPanelPath(role) {
  return panelPathByRole[role] || "/dashboard";
}

export default function InviteSignup({ token }) {
  const navigate = useNavigate();

  // validation state
  const [validating, setValidating] = useState(true);
  const [inviteError, setInviteError] = useState(null);
  const [inviteData, setInviteData] = useState(null);

  // form state
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const company = inviteData?.company;
  const companyName = getCompanyName(company, "your workspace");

  // 🔥 VALIDATE TOKEN
  useEffect(() => {
    if (!token) {
      setInviteError("No invitation token found.");
      setValidating(false);
      return;
    }

    (async () => {
      try {
        const api = await getApi();

        const { data } = await api.get(
          `/invitations/validate/?token=${encodeURIComponent(token)}`
        );

        // ✅ only store what backend gives
        setInviteData({
          email: data.email,
          role: data.role,
          company: data.company,
        });
      } catch (err) {
        setInviteError(
          err?.response?.data?.message || "Invalid or expired invite"
        );
      } finally {
        setValidating(false);
      }
    })();
  }, [token]);

  // 🔥 SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
        setSubmitError("Name is required");
        return;
        }

        if (password.length < 5) {
        setSubmitError("Password must be at least 5 characters");
        return;
        }

    setSubmitting(true);
    setSubmitError("");

    try {
      const api = await getApi();

      await api.post("/auth/invite-register/", {
        token,
        name: name.trim(),
        password,
      });

      const meResponse = await api.get("/auth/me/");

      navigate(
        getPanelPath(meResponse.data.role),
        { replace: true }
      );
    } catch (err) {
      setSubmitError(
        err?.response?.data?.message || "Something went wrong"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="ap-root">
      <div className="ap-shell">

        {/* LEFT PANEL */}
        <aside className="ap-brand ap-brand-left">
          <a href="/" className="ap-brand-logo">
            <span className="ap-logo-icon">
              <Zap size={20} />
            </span>
            <span>ProjectFlow</span>
          </a>

          <div className="ap-brand-body">
            <div className="ap-company-card">
              <span className="ap-company-logo">
                {company?.logo ? (
                  <img src={company.logo} alt="" />
                ) : (
                  getCompanyInitials(company, "PF")
                )}
              </span>
              <div className="ap-company-info">
                <small className="ap-company-card-lbl">Invitation to join</small>
                <strong className="ap-company-card-val">{companyName}</strong>
              </div>
            </div>

            <h1 className="ap-brand-title">You're invited to join {companyName}</h1>
            <p className="ap-brand-desc">Create your account to start collaborating with your team.</p>

            <ul className="ap-benefits">
              <li className="ap-benefit">
                <span className="ap-benefit-dot">
                  <Check size={12}/>
                </span>
                Real-time collaboration
              </li>
              <li className="ap-benefit">
                <span className="ap-benefit-dot">
                  <Check size={12}/>
                </span>
                Role-based access
              </li>
              <li className="ap-benefit">
                <span className="ap-benefit-dot">
                  <Check size={12}/>
                </span>
                Team productivity tools
              </li>
            </ul>
          </div>
        </aside>

        {/* RIGHT PANEL */}
        <div className="ap-form-container ap-signin-container is-active">

          {/* LOADING */}
          {validating && (
            <div className="ap-loading">
              <span className="ap-spinner" />
              <p>Validating invitation...</p>
            </div>
          )}

          {/* INVALID */}
          {!validating && inviteError && (
            <div className="ap-invalid">
              <span className="ap-invalid-icon-wrap">
                <ShieldX size={30} />
              </span>
              <div>
                <h2>Invalid invitation</h2>
                <p>{inviteError}</p>
              </div>

              <div className="ap-invalid-actions">
                <button className="ap-submit" onClick={() => navigate("/signup")}>
                  Go to Signup
                </button>

                <button className="ap-btn-secondary" onClick={() => navigate("/signin")}>
                  Sign in
                </button>
              </div>
            </div>
          )}

          {/* VALID */}
          {!validating && !inviteError && inviteData && (
            <form className="ap-form" onSubmit={handleSubmit}>

              <div className="ap-form-head">
                <h2>Complete your account</h2>
                <p>You are joining {companyName} as {inviteData.role}.</p>
              </div>

              {submitError && (
                <p className="ap-error">
                  <AlertCircle size={16} className="ap-error-icon" />
                  {submitError}
                </p>
              )}

              <div className="ap-fields">
                <label className="ap-field">
                  <span className="ap-label">Email</span>
                  <input
                    className="ap-input"
                    type="email"
                    value={inviteData.email}
                    readOnly
                  />
                </label>

                <label className="ap-field">
                  <span className="ap-label">Full name</span>
                  <input
                    className="ap-input"
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>

                <label className="ap-field">
                  <span className="ap-label">Password</span>
                  <div className="ap-input-wrap">
                    <input
                      className="ap-input ap-input-has-icon"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password (min 8 chars)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      className="ap-eye-btn"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
              </div>

              <button className="ap-submit" type="submit" disabled={submitting}>
                {submitting ? "Joining..." : "Join Workspace"}
                <ArrowRight size={16} />
              </button>

            </form>
          )}

        </div>
      </div>
    </main>
  );
}
