import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Mail, ArrowRight } from "lucide-react";
import api from "../../services/api";
import "./AuthPage.css";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      await api.post("/auth/forgot-password/", { email });
      setMessage("If this email is registered, a password reset OTP has been sent.");
      
      // Automatically redirect to the reset page passing the email after 2 seconds
      setTimeout(() => {
        navigate(`/reset-password?email=${encodeURIComponent(email)}`);
      }, 2500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to request password reset.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="ap-root">
      <div className="ap-shell" style={{ justifyContent: "center" }}>
        <div className="ap-form-container is-active" style={{ maxWidth: "480px", width: "100%", padding: "40px" }}>
          <div className="ap-form">
            <div className="ap-brand-logo ap-brand-logo--dark" style={{ justifyContent: "center", marginBottom: "30px" }}>
              <span className="ap-logo-icon ap-logo-icon--dark">
                <Zap size={20} />
              </span>
              <span>ProjectFlow</span>
            </div>

            <div className="ap-form-head" style={{ textAlign: "center", alignItems: "center" }}>
              <div style={{ display: "inline-flex", padding: "12px", background: "var(--sky)", borderRadius: "50%", marginBottom: "16px", color: "var(--ink)" }}>
                <Mail size={28} />
              </div>
              <h2>Forgot Password</h2>
              <p>Enter your email address to receive a 6-digit OTP code to reset your password.</p>
            </div>

            <form onSubmit={handleSubmit} noValidate style={{ marginTop: "24px" }}>
              <label className="ap-field">
                <span className="ap-label">Email address</span>
                <input
                  className="ap-input"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </label>

              {error && (
                <p className="ap-error" role="alert" style={{ textAlign: "center" }}>
                  {error}
                </p>
              )}

              {message && (
                <p style={{ color: "#22c55e", fontSize: "14px", textAlign: "center", marginTop: "8px" }} role="status">
                  {message}
                </p>
              )}

              <button type="submit" className="ap-submit" disabled={isLoading || !email} style={{ marginTop: "24px" }}>
                {isLoading ? "Sending OTP..." : "Send Reset OTP"}
                <ArrowRight size={17} />
              </button>

              <div style={{ textAlign: "center", marginTop: "24px" }}>
                <button
                  type="button"
                  className="ap-link-btn"
                  onClick={() => navigate("/signin")}
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
