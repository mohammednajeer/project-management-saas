import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Zap, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import api from "../../services/api";
import "./AuthPage.css";

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const queryEmail = new URLSearchParams(location.search).get("email") || "";
  const [email, setEmail] = useState(queryEmail);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/auth/reset-password/", {
        email,
        otp,
        password
      });
      setMessage(response.data?.message || "Password reset successfully!");
      setTimeout(() => {
        navigate("/signin");
      }, 2500);
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed. Please check your OTP or email.");
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
                <Lock size={28} />
              </div>
              <h2>Set New Password</h2>
              <p>Enter the 6-digit OTP code sent to your email and select your new password.</p>
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
                  disabled={isLoading || !!queryEmail}
                  required
                />
              </label>

              <label className="ap-field">
                <span className="ap-label">6-digit Reset OTP</span>
                <input
                  className="ap-input"
                  type="text"
                  placeholder="Enter OTP (e.g. 123456)"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  disabled={isLoading}
                  style={{ textAlign: "center", letterSpacing: "6px", fontSize: "18px", fontWeight: "bold" }}
                  required
                />
              </label>

              <label className="ap-field">
                <span className="ap-label">New Password</span>
                <span className="ap-input-wrap">
                  <input
                    className="ap-input ap-input-has-icon"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    className="ap-eye-btn"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>

              <label className="ap-field">
                <span className="ap-label">Confirm New Password</span>
                <input
                  className="ap-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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

              <button type="submit" className="ap-submit" disabled={isLoading || otp.length !== 6 || !password || !confirmPassword} style={{ marginTop: "24px" }}>
                {isLoading ? "Resetting Password..." : "Reset Password"}
                <ArrowRight size={17} />
              </button>

              <div style={{ textAlign: "center", marginTop: "24px" }}>
                <button
                  type="button"
                  className="ap-link-btn"
                  onClick={() => navigate("/signin")}
                >
                  Cancel & Sign In
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
