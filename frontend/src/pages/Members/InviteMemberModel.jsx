import { useState } from "react";
import { createPortal } from "react-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { getCompanyFromUser, getCompanyInitials, getCompanyName } from "../../utils/company";
import "./InviteMemberModel.css";

export default function InviteMemberModal({ open, onClose, onInviteSuccess }) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employee");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isAdmin = user?.role === "admin";
  const company = getCompanyFromUser(user);
  const companyName = getCompanyName(company, user?.organization || "your company");

  if (!open) return null;

  const handleInvite = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
        const res = await api.post("/invitations/create/", {
            email,
            role,
        });

        setEmail("");
        setRole("employee");

        await onInviteSuccess({
            email,
            invite_link:
            `http://localhost:5173/signup?token=${res.data.token}`,
        });

        onClose();

        } catch (err) {
        setError(
            err.response?.data?.message ||
            err.response?.data?.detail ||
            "Failed to send invite"
        );
        } finally {
        setLoading(false);
        }
  };

  return createPortal(
    <div className="invite-overlay" onClick={onClose}>
      <div className="invite-modal" onClick={(e) => e.stopPropagation()}>
        <div className="invite-header">
          <h2>Invite Team Member</h2>
          <button type="button" onClick={onClose} aria-label="Close invite modal">
            X
          </button>
        </div>

        <div className="invite-company-card">
          <span className="invite-company-logo">
            {company?.logo ? (
              <img src={company.logo} alt="" />
            ) : (
              getCompanyInitials(company, "PF")
            )}
          </span>
          <span>
            <small>Joining company</small>
            <strong>{companyName}</strong>
          </span>
        </div>

        <form onSubmit={handleInvite} className="invite-form">
          <div className="invite-field">
            <label>Email</label>
            <input
              type="email"
              placeholder="john@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="invite-field">
            <label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="employee">Employee</option>
              {isAdmin && <option value="manager">Manager</option>}
              {isAdmin && <option value="admin">Admin</option>}
            </select>
          </div>

          {error && <p className="invite-error">{error}</p>}

          <button type="submit" className="invite-submit" disabled={loading}>
            {loading ? "Sending..." : "Send Invite"}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
