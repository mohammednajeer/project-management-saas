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
    <main className="inv-root">
      <div className="inv-shell">

        {/* LEFT PANEL */}
        <aside className="inv-brand">
          <a href="/" className="inv-brand-logo">
            <span className="inv-logo-icon">
              <Zap size={20} />
            </span>
            <span>ProjectFlow</span>
          </a>

          <div className="inv-brand-body">
            <div className="inv-company-card">
              <span className="inv-company-logo">
                {company?.logo ? (
                  <img src={company.logo} alt="" />
                ) : (
                  getCompanyInitials(company, "PF")
                )}
              </span>
              <span>
                <small>Invitation to join</small>
                <strong>{companyName}</strong>
              </span>
            </div>

            <h1>You're invited to join {companyName}</h1>
            <p>Create your account to start collaborating with your team.</p>

            <ul className="inv-benefits">
              <li><Check size={12}/> Real-time collaboration</li>
              <li><Check size={12}/> Role-based access</li>
              <li><Check size={12}/> Team productivity tools</li>
            </ul>
          </div>
        </aside>

        {/* RIGHT PANEL */}
        <div className="inv-form-panel">

          {/* LOADING */}
          {validating && (
            <div className="inv-loading">
              <span className="inv-spinner" />
              <p>Validating invitation...</p>
            </div>
          )}

          {/* INVALID */}
          {!validating && inviteError && (
            <div className="inv-invalid">
              <span className="inv-invalid-icon-wrap">
                <ShieldX size={30} />
              </span>
              <div>
                <h2>Invalid invitation</h2>
                <p>{inviteError}</p>
              </div>

              <div className="inv-invalid-actions">
                <button className="inv-submit" onClick={() => navigate("/signup")}>
                  Go to Signup
                </button>

                <button className="inv-btn-secondary" onClick={() => navigate("/signin")}>
                  Sign in
                </button>
              </div>
            </div>
          )}

          {/* VALID */}
          {!validating && !inviteError && inviteData && (
            <form className="inv-form" onSubmit={handleSubmit}>

              <div className="inv-form-head">
                <h2>Complete your account</h2>
                <p>You are joining {companyName} as {inviteData.role}.</p>
              </div>

              {submitError && (
                <p className="inv-error">
                  <AlertCircle size={16} className="inv-error-icon" />
                  {submitError}
                </p>
              )}

              <div className="inv-fields">
                <label className="inv-field">
                  <span className="inv-label">Email</span>
                  <input
                    className="inv-input"
                    type="email"
                    value={inviteData.email}
                    readOnly
                  />
                </label>

                <label className="inv-field">
                  <span className="inv-label">Full name</span>
                  <input
                    className="inv-input"
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>

                <label className="inv-field">
                  <span className="inv-label">Password</span>
                  <div className="inv-input-wrap">
                    <input
                      className="inv-input"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password (min 8 chars)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      className="inv-eye-btn"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
              </div>

              <button className="inv-submit" type="submit" disabled={submitting}>
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
