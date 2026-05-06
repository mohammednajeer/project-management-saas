import { useState } from "react";
import { createPortal } from "react-dom";
import api from "../../services/api";
import "./InviteMemberModel.css";

export default function InviteMemberModal({ open, onClose, onInviteSuccess }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employee");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
              <option value="manager">Manager</option>
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
