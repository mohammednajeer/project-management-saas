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
import "./InviteSignup.css";

// lazy import api
async function getApi() {
  const { default: api } = await import("../../../services/api");
  return api;
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

      navigate("/dashboard");
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
            <h1>You're invited to join a workspace</h1>
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
              <p>Validating invitation...</p>
            </div>
          )}

          {/* INVALID */}
          {!validating && inviteError && (
            <div className="inv-invalid">
              <ShieldX size={30} />
              <h2>Invalid invitation</h2>
              <p>{inviteError}</p>

              <button onClick={() => navigate("/signup")}>
                Go to Signup
              </button>

              <button onClick={() => navigate("/signin")}>
                Sign in
              </button>
            </div>
          )}

          {/* VALID */}
          {!validating && !inviteError && inviteData && (
            <form className="inv-form" onSubmit={handleSubmit}>

              <h2>Complete your account</h2>

              {submitError && (
                <p className="inv-error">{submitError}</p>
              )}

              {/* EMAIL */}
              <input
                type="email"
                value={inviteData.email}
                readOnly
              />

              {/* NAME */}
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              {/* PASSWORD */}
              <div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password (min 8 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>

              <button type="submit" disabled={submitting}>
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