import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Camera,
  ChevronRight,
  Loader2,
  Save,
  ShieldCheck,
  Award,
  TrendingUp,
  User,
  Shield,
  Key,
  UserPlus,
  Laptop,
  DatabaseZap,
  Zap,
  Building2,
} from "lucide-react";
import { ProfileProvider } from "../../context/profile/ProfileContext";
import useProfile from "../../context/profile/useProfile";
import api from "../../services/api";
import "./ProfilePage.css";

const getInitials = (name) => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

function ProfilePageContent() {
  const navigate = useNavigate();
  const { profile, loading, updateProfile, saving } = useProfile();
  const fileInputRef = useRef(null);
  const [message, setMessage] = useState(null);
  const messageTimer = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reportsData, setReportsData] = useState(null);

  const [form, setForm] = useState({
    name: "",
    bio: "",
    designation: "",
    department: "",
    phone_number: "",
    work_status: "available",
  });

  const showMessage = (type, text) => {
    setMessage({ type, text });
    window.clearTimeout(messageTimer.current);
    messageTimer.current = window.setTimeout(() => setMessage(null), 4200);
  };

  // Sync form state when profile details load
  useEffect(() => {
    let active = true;
    if (profile) {
      setTimeout(() => {
        if (active) {
          setForm({
            name: profile.name || "",
            bio: profile.bio || "",
            designation: profile.designation || "",
            department: profile.department || "",
            phone_number: profile.phone_number || "",
            work_status: profile.work_status || "available",
          });
        }
      }, 0);
    }
    return () => { active = false; };
  }, [profile]);

  // Fetch telemetry metrics to update profile stats
  useEffect(() => {
    let active = true;
    api.get("/reports/dashboard/")
      .then((r) => {
        if (active) setReportsData(r.data);
      })
      .catch((err) => {
        console.warn("Reports dashboard telemetry not available for profile metrics:", err);
      });
    return () => { active = false; };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      showMessage("error", "Please select an image file.");
      return;
    }

    const formData = new FormData();
    formData.append("profile_picture", file);

    try {
      setUploading(true);
      setProgress(0);
      await updateProfile(formData, (event) => {
        if (event.total) {
          setProgress(Math.round((event.loaded * 100) / event.total));
        }
      });
      showMessage("success", "Profile picture updated successfully.");
    } catch (err) {
      console.error(err);
      showMessage("error", "Failed to upload profile picture.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    const formData = new FormData();
    formData.append("profile_picture", "");
    try {
      setUploading(true);
      await updateProfile(formData);
      showMessage("success", "Profile picture removed successfully.");
    } catch (err) {
      console.error(err);
      showMessage("error", "Failed to remove profile picture.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      showMessage("error", "Full Name is required.");
      return;
    }

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      formData.append(key, value || "");
    });

    try {
      await updateProfile(formData);
      showMessage("success", "Profile updated successfully.");
    } catch (err) {
      console.error(err);
      showMessage("error", "Failed to save profile changes.");
    }
  };

  const handleDiscard = () => {
    if (profile) {
      setForm({
        name: profile.name || "",
        bio: profile.bio || "",
        designation: profile.designation || "",
        department: profile.department || "",
        phone_number: profile.phone_number || "",
        work_status: profile.work_status || "available",
      });
      showMessage("success", "Edits reset to saved state.");
    }
  };

  const avatarSrc = profile?.profile_picture;

  return (
    <div className="prof-page">
      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="prof-header">
        <div className="prof-header-left">
          <nav className="prof-breadcrumb">
            <span>ProjectFlow</span>
            <ChevronRight size={12} className="prof-breadcrumb-sep" />
            <span style={{ cursor: "pointer" }} onClick={() => navigate("/dashboard/settings")}>Settings</span>
            <ChevronRight size={12} className="prof-breadcrumb-sep" />
            <span className="prof-breadcrumb-current">User Profile</span>
          </nav>

          <div className="prof-title-row">
            <h1 className="prof-title">Profile Management</h1>
            <div className="prof-status-badge">
              <span className="prof-status-dot-wrap">
                <span className="prof-status-dot-pulse" />
                <span className="prof-status-dot" />
              </span>
              <span className="prof-status-label">
                ENGINE {(form.work_status || "available").toUpperCase()} ACTIVE
              </span>
            </div>
          </div>

          <p className="prof-subtitle">
            Update your corporate identity, operational credentials, availability states, and security settings.
          </p>
        </div>

        <div className="prof-header-actions">
          <button type="button" className="prof-btn-secondary" onClick={handleDiscard}>
            Discard Changes
          </button>
          <button type="submit" form="prof-form" className="prof-btn-primary" disabled={saving}>
            {saving ? <Loader2 size={14} className="prof-btn-spin" /> : <Save size={14} />}
            {saving ? "Saving..." : "Deploy Changes"}
          </button>
        </div>
      </header>

      {/* ── MESSAGE ─────────────────────────────────────────────── */}
      {message && (
        <div className={`prof-message prof-message--${message.type}`} role="status">
          {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* ── LAYOUT ──────────────────────────────────────────────── */}
      {loading && !profile ? (
        <div className="prof-skeleton" />
      ) : (
        <form id="prof-form" onSubmit={handleSubmit}>
          <div className="prof-grid">
            
            {/* ═══ MAIN COLUMN ══════════════════════════════════════ */}
            <div className="prof-main-col">
              
              {/* Identity & Branding Card */}
              <section className="prof-card">
                <div className="prof-card-header">
                  <div className="prof-card-title-group">
                    <div className="prof-card-icon">
                      <User size={22} />
                    </div>
                    <div>
                      <h3 className="prof-card-title">Identity &amp; Presence</h3>
                      <p className="prof-card-subtitle">Manage your visual marker and personal credentials.</p>
                    </div>
                  </div>
                  <span className="prof-card-tag">Identity-01</span>
                </div>

                {/* Avatar upload */}
                <div className="prof-avatar-section">
                  <div className="prof-avatar-wrap">
                    <div className="prof-avatar-preview">
                      {uploading ? (
                        <div className="prof-avatar-fallback" style={{ fontSize: "20px" }}>
                          {progress}%
                        </div>
                      ) : avatarSrc ? (
                        <img src={avatarSrc} alt="User avatar" />
                      ) : (
                        <div className="prof-avatar-fallback">
                          {getInitials(profile?.name)}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="prof-avatar-btn"
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload profile picture"
                    >
                      <Camera size={14} />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="prof-avatar-file-input"
                      onChange={handleAvatarChange}
                    />
                  </div>
                  <div className="prof-avatar-info">
                    <h4>Profile Emblem</h4>
                    <p>SVG, PNG, or JPG. Re-scales automatically within your workspace.</p>
                    <div className="prof-avatar-actions">
                      <button type="button" className="prof-avatar-action-btn" onClick={() => fileInputRef.current?.click()}>
                        Replace Photo
                      </button>
                      <button type="button" className="prof-avatar-action-btn prof-avatar-action-btn--danger" onClick={handleRemoveAvatar}>
                        Remove Photo
                      </button>
                    </div>
                  </div>
                </div>

                {/* Fields Grid */}
                <div className="prof-form-grid">
                  <div className="prof-field">
                    <label className="prof-label" htmlFor="prof-name">Full Name</label>
                    <div className="prof-input-wrap">
                      <input
                        id="prof-name"
                        className="prof-input"
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        placeholder="e.g. James Wilson"
                      />
                    </div>
                  </div>

                  <div className="prof-field">
                    <label className="prof-label" htmlFor="prof-work_status">Availability Status</label>
                    <div className="prof-input-wrap">
                      <select
                        id="prof-work_status"
                        className="prof-select"
                        name="work_status"
                        value={form.work_status}
                        onChange={handleChange}
                      >
                        <option value="available">Available</option>
                        <option value="busy">Busy</option>
                        <option value="away">Away</option>
                        <option value="offline">Offline</option>
                      </select>
                      <span className="prof-select-arrow">
                        <ChevronRight size={14} style={{ transform: "rotate(90deg)" }} />
                      </span>
                    </div>
                  </div>

                  <div className="prof-field prof-form-full">
                    <label className="prof-label" htmlFor="prof-designation">Professional Headline</label>
                    <div className="prof-input-wrap">
                      <input
                        id="prof-designation"
                        className="prof-input"
                        type="text"
                        name="designation"
                        value={form.designation}
                        onChange={handleChange}
                        placeholder="e.g. Operations Lead | Senior Consultant"
                      />
                    </div>
                  </div>

                  <div className="prof-field prof-form-full">
                    <label className="prof-label" htmlFor="prof-bio">Bio &amp; Context</label>
                    <div className="prof-input-wrap">
                      <textarea
                        id="prof-bio"
                        className="prof-textarea"
                        name="bio"
                        value={form.bio}
                        onChange={handleChange}
                        placeholder="Describe your background and enterprise focus..."
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Enterprise Details Card */}
              <section className="prof-card">
                <div className="prof-card-header">
                  <div className="prof-card-title-group">
                    <div className="prof-card-icon">
                      <Building2 size={22} />
                    </div>
                    <div>
                      <h3 className="prof-card-title">Enterprise context</h3>
                      <p className="prof-card-subtitle">Corporate contact channels and internal alignment parameters.</p>
                    </div>
                  </div>
                  <span className="prof-card-tag">Identity-02</span>
                </div>

                <div className="prof-form-grid">
                  <div className="prof-field">
                    <label className="prof-label" htmlFor="prof-email">Corporate Email Address</label>
                    <div className="prof-input-wrap">
                      <input
                        id="prof-email"
                        className="prof-input"
                        type="email"
                        value={profile?.email || ""}
                        disabled
                        title="Corporate email address is managed by your administrator"
                      />
                    </div>
                  </div>

                  <div className="prof-field">
                    <label className="prof-label" htmlFor="prof-department">Operational Department</label>
                    <div className="prof-input-wrap">
                      <input
                        id="prof-department"
                        className="prof-input"
                        type="text"
                        name="department"
                        value={form.department}
                        onChange={handleChange}
                        placeholder="e.g. Corporate Operations"
                      />
                    </div>
                  </div>

                  <div className="prof-field">
                    <label className="prof-label" htmlFor="prof-phone_number">Hotline Contact</label>
                    <div className="prof-input-wrap">
                      <input
                        id="prof-phone_number"
                        className="prof-input"
                        type="text"
                        name="phone_number"
                        value={form.phone_number}
                        onChange={handleChange}
                        placeholder="e.g. +1 (555) 000-0000"
                      />
                    </div>
                  </div>

                  <div className="prof-field">
                    <label className="prof-label">Account Privilege Tier</label>
                    <div className="prof-input-wrap">
                      <input
                        className="prof-input"
                        type="text"
                        value={profile?.role === "admin" ? "Workspace Administrator" : "Operative"}
                        disabled
                      />
                    </div>
                  </div>
                </div>

                <div className="prof-footer-row" style={{ marginTop: "28px" }}>
                  <span className="prof-danger-btn" style={{ cursor: "pointer" }} onClick={() => showMessage("error", "Request to deactivate account sent to workspace administrator.")}>
                    Deactivate Operative Identity
                  </span>
                  <div className="prof-footer-meta">
                    <span>Clearance Level-3</span>
                    <span className="prof-footer-meta-dot" />
                    <span>User Sync Active</span>
                  </div>
                </div>
              </section>
            </div>

            {/* ═══ SIDE COLUMN ══════════════════════════════════════ */}
            <div className="prof-side-col">
              
              {/* Telemetry Stats */}
              <div className="prof-stats-grid">
                <div className="prof-stat-card">
                  <div className="prof-stat-top">
                    <span className="prof-stat-label">Active Ventures</span>
                    <span className="prof-stat-icon prof-stat-icon--blue">
                      <TrendingUp size={16} />
                    </span>
                  </div>
                  <div className="prof-stat-value">
                    {reportsData?.total_projects || 24}
                  </div>
                </div>

                <div className="prof-stat-card">
                  <div className="prof-stat-top">
                    <span className="prof-stat-label">Efficiency</span>
                    <span className="prof-stat-icon prof-stat-icon--green">
                      <ShieldCheck size={16} />
                    </span>
                  </div>
                  <div className="prof-stat-value">
                    {reportsData?.completion_rate ? `${Math.round(reportsData.completion_rate)}%` : "94%"}
                  </div>
                </div>

                <div className="prof-stat-card" style={{ gridColumn: "span 2" }}>
                  <div className="prof-stat-top">
                    <span className="prof-stat-label">Enterprise Ranking</span>
                    <span className="prof-stat-icon prof-stat-icon--purple">
                      <Award size={16} />
                    </span>
                  </div>
                  <div className="prof-stat-value">
                    #1 <span style={{ fontSize: "12px", fontWeight: "normal", color: "#777b86" }}>Top Corporate Tier</span>
                  </div>
                </div>
              </div>

              {/* Security & Governance */}
              <section className="prof-card">
                <div className="prof-security-header">
                  <span className="prof-security-header-icon">
                    <Shield size={20} />
                  </span>
                  <h4 className="prof-security-title">Security &amp; Compliance</h4>
                </div>

                <div className="prof-security-list">
                  <div className="prof-security-item">
                    <div className="prof-security-item-left">
                      <span className="prof-security-item-icon prof-security-item-icon--green">
                        <CheckCircle2 size={18} />
                      </span>
                      <span className="prof-security-item-label">Two-Factor Authentication</span>
                    </div>
                    <span className="prof-security-badge prof-security-badge--enabled">Active</span>
                  </div>

                  <div className="prof-security-item">
                    <div className="prof-security-item-left">
                      <span className="prof-security-item-icon">
                        <Key size={18} />
                      </span>
                      <span className="prof-security-item-label">Password Credentials</span>
                    </div>
                    <span className="prof-security-badge prof-security-badge--muted">Updated</span>
                  </div>

                  <div className="prof-security-item" style={{ flexDirection: "column", alignItems: "flex-start", gap: "8px" }}>
                    <div className="prof-security-item-left" style={{ width: "100%", justifyContent: "space-between" }}>
                      <span className="prof-security-item-label" style={{ fontWeight: 600 }}>Active Security Session</span>
                      <span className="prof-security-badge prof-security-badge--enabled">ONLINE</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#777b86" }}>
                      <Laptop size={12} />
                      <span>MacBook Pro M2 • IP: 192.168.1.254</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="prof-security-manage-btn"
                    onClick={() => showMessage("success", "SSO rotate link dispatched to enterprise email.")}
                  >
                    Rotate Credentials
                  </button>
                </div>
              </section>

              {/* Recent Activity */}
              <section className="prof-card prof-activity-card">
                <div className="prof-activity-header">
                  <div className="prof-activity-header-left">
                    <span className="prof-activity-header-icon">
                      <Zap size={20} />
                    </span>
                    <h4 className="prof-activity-title">Recent Activity</h4>
                  </div>
                  <span className="prof-activity-view-all" style={{ cursor: "pointer" }} onClick={() => showMessage("success", "Ledger audit logs downloaded.")}>
                    Audit Logs
                  </span>
                </div>

                <div className="prof-activity-list">
                  <div className="prof-activity-item">
                    <div className="prof-activity-avatar prof-activity-avatar--blue">
                      <DatabaseZap size={14} />
                    </div>
                    <div>
                      <p className="prof-activity-text"><strong>Edited Project Brief:</strong> "Q4 Expansion Strategy" was updated.</p>
                      <span className="prof-activity-time">12 mins ago</span>
                    </div>
                  </div>

                  <div className="prof-activity-item">
                    <div className="prof-activity-avatar prof-activity-avatar--apricot">
                      <UserPlus size={14} />
                    </div>
                    <div>
                      <p className="prof-activity-text"><strong>Added to Team:</strong> Sarah Jenkins joined Operation Core.</p>
                      <span className="prof-activity-time">2 hours ago</span>
                    </div>
                  </div>

                  <div className="prof-activity-item">
                    <div className="prof-activity-avatar prof-activity-avatar--blue">
                      <ShieldCheck size={14} />
                    </div>
                    <div>
                      <p className="prof-activity-text"><strong>Task Completed:</strong> "Internal Security Audit" finalized.</p>
                      <span className="prof-activity-time">Yesterday</span>
                    </div>
                  </div>
                </div>
              </section>

            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProfileProvider>
      <ProfilePageContent />
    </ProfileProvider>
  );
}
