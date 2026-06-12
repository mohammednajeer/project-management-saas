import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Users, UserPlus, Shield } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "./CreateProjectModal.css";

export default function CreateProjectModal({
  open,
  onClose,
  onSuccess,
}) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [team, setTeam] = useState([]);
  const [projectLead, setProjectLead] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [createChannel, setCreateChannel] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      // Fetch organization members
      api.get("/organizations/team/")
        .then((res) => {
          setTeam(res.data || []);
          // Pre-select current user as project lead
          if (user) {
            setProjectLead(String(user.id));
          }
        })
        .catch((err) => console.log(err));
    }
  }, [open, user]);

  if (!open) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.post("/projects/", {
        name,
        description,
        priority,
        due_date: dueDate || null,
        project_lead: projectLead || null,
        members: selectedMembers,
        create_channel: createChannel,
      });

      await onSuccess();
      
      // Reset form
      setName("");
      setDescription("");
      setPriority("medium");
      setDueDate("");
      setProjectLead(user ? String(user.id) : "");
      setSelectedMembers([]);
      setCreateChannel(true);
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        Object.values(err.response?.data || {}).flat().join(" ") ||
        "Failed to create project"
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (memberId) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  return createPortal(
    <div className="cp-overlay" onClick={onClose}>
      <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cp-header">
          <h2>Create Project</h2>
          <button type="button" className="cp-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="cp-form">
          <div className="cp-field">
            <label>Project Name <span className="required-star">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q3 Website Redesign"
              required
            />
          </div>

          <div className="cp-field">
            <label>Description</label>
            <textarea
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summarize the project objectives and constraints..."
            />
          </div>

          <div className="cp-field checkbox-field" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, margin: "8px 0" }}>
            <input
              type="checkbox"
              id="create-channel-checkbox"
              checked={createChannel}
              onChange={(e) => setCreateChannel(e.target.checked)}
              style={{ width: "auto", cursor: "pointer", margin: 0 }}
            />
            <label htmlFor="create-channel-checkbox" style={{ margin: 0, cursor: "pointer", fontSize: 13, fontWeight: 500, color: "var(--cp-on-surface)" }}>
              Create a group chat channel for this project
            </label>
          </div>

          <div className="cp-row">
            <div className="cp-field">
              <label>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="cp-field">
              <label>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="cp-field">
            <label className="field-label-with-icon">
              <Shield size={13} style={{ marginRight: 4 }} /> Project Lead
            </label>
            <select
              value={projectLead}
              onChange={(e) => setProjectLead(e.target.value)}
            >
              <option value="">Select a lead...</option>
              {team.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} ({member.email})
                </option>
              ))}
            </select>
          </div>

          <div className="cp-field">
            <label className="field-label-with-icon">
              <Users size={13} style={{ marginRight: 4 }} /> Associate Team Members
            </label>
            <div className="cp-members-selection">
              {team.map((member) => {
                const isSelected = selectedMembers.includes(member.id);
                return (
                  <button
                    type="button"
                    key={member.id}
                    className={`cp-member-pill ${isSelected ? "active" : ""}`}
                    onClick={() => toggleMember(member.id)}
                  >
                    {isSelected && <UserPlus size={11} style={{ marginRight: 4 }} />}
                    {member.name}
                  </button>
                );
              })}
              {team.length === 0 && (
                <span className="no-members-lbl">No organization team members found.</span>
              )}
            </div>
          </div>

          {error && <p className="cp-error">{error}</p>}

          <div className="cp-actions">
            <button
              type="button"
              className="cp-cancel-btn"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cp-submit-btn"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}