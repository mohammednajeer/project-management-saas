import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, RefreshCw, ArrowRight, X } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import "./EmailVerificationBanner.css";

export default function EmailVerificationBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState(false);

  if (!user || user.is_email_verified || dismissed) {
    return null;
  }

  const handleResend = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResending(true);
    setMessage("");
    setError("");

    try {
      await api.post("/auth/verify-email/resend/", { email: user.email });
      setMessage("Verification code resent successfully!");
      setTimeout(() => setMessage(""), 5000);
    } catch (err) {
      setError("Failed to resend code.");
      setTimeout(() => setError(""), 5000);
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyRedirect = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/verify-email?email=${encodeURIComponent(user.email)}`);
  };

  return (
    <div className="ev-banner-root">
      <div className="ev-banner-container">
        <div className="ev-banner-content">
          <ShieldAlert size={18} className="ev-banner-icon" />
          <span className="ev-banner-text">
            Your email is not verified. Please verify your email to secure your account.
          </span>
          {message && <span className="ev-banner-success">{message}</span>}
          {error && <span className="ev-banner-error">{error}</span>}
        </div>
        <div className="ev-banner-actions">
          <button 
            onClick={handleResend} 
            disabled={isResending} 
            className="ev-banner-btn-secondary"
          >
            {isResending ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : (
              "Resend Code"
            )}
          </button>
          <button 
            onClick={handleVerifyRedirect} 
            className="ev-banner-btn-primary"
          >
            <span>Verify Now</span>
            <ArrowRight size={12} />
          </button>
          <button 
            onClick={() => setDismissed(true)} 
            className="ev-banner-close"
            title="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
