import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Zap, ShieldCheck, RefreshCw, ArrowRight } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "./AuthPage.css";

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  
  const queryEmail = new URLSearchParams(location.search).get("email") || "";
  const [email, setEmail] = useState(queryEmail);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (user && !email) {
      setEmail(user.email);
    }
  }, [user, email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      await api.post("/auth/verify-email/", { email, otp });
      setMessage("Email verified successfully! Redirecting you...");
      const nextUser = await refreshUser();
      setTimeout(() => {
        if (nextUser?.role === "employee") {
          navigate("/workspace");
        } else {
          navigate("/dashboard");
        }
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed. Please check your OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError("");
    setMessage("");
    setIsResending(true);

    try {
      await api.post("/auth/verify-email/resend/", { email });
      setMessage("Verification OTP has been sent to your email.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setIsResending(false);
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
                <ShieldCheck size={28} />
              </div>
              <h2>Verify your email</h2>
              <p>We've sent a 6-digit OTP code to <strong>{email || "your email"}</strong></p>
            </div>

            <form onSubmit={handleSubmit} noValidate style={{ marginTop: "24px" }}>
              {!email && (
                <label className="ap-field">
                  <span className="ap-label">Email address</span>
                  <input
                    className="ap-input"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </label>
              )}

              <label className="ap-field">
                <span className="ap-label">6-digit Verification Code</span>
                <input
                  className="ap-input"
                  type="text"
                  placeholder="Enter OTP (e.g. 123456)"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  disabled={isLoading}
                  style={{ textAlign: "center", letterSpacing: "8px", fontSize: "20px", fontWeight: "bold" }}
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

              <button type="submit" className="ap-submit" disabled={isLoading || otp.length !== 6} style={{ marginTop: "24px" }}>
                {isLoading ? "Verifying..." : "Verify Email"}
                <ArrowRight size={17} />
              </button>

              <div style={{ textAlign: "center", marginTop: "24px" }}>
                <button
                  type="button"
                  className="ap-link-btn"
                  onClick={handleResendOTP}
                  disabled={isResending || !email}
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                  <RefreshCw size={14} className={isResending ? "animate-spin" : ""} />
                  {isResending ? "Resending..." : "Resend Verification Code"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
