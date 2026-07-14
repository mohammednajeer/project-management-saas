import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  DatabaseZap,
  FolderOpen,
  Globe,
  ImagePlus,
  Loader2,
  MapPin,
  PlaneTakeoff,
  Save,
  ShieldCheck,
  Users,
  Fingerprint,
  Clock,
  History,
  ListOrdered,
  Zap,
  Camera,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { emptyCompany } from "../../utils/company";
import "./OrganizationPage.css";

const fields = [
  { name: "company_name", label: "Legal Entity Name", required: true },
  { name: "industry",     label: "Industry Vertical" },
  { name: "website",      label: "Global Workspace URL", type: "url", icon: Globe },
  { name: "phone",        label: "Phone" },
  { name: "timezone",     label: "Primary Timezone" },
  { name: "working_days", label: "Working Days" },
  { name: "working_hours_start", label: "Start Time", type: "time" },
  { name: "working_hours_end",   label: "End Time",   type: "time" },
];

const locationFields = [
  { name: "city",    label: "Principal City" },
  { name: "state",   label: "State / Region" },
  { name: "country", label: "Country" },
];

const formatHours = (start, end) => {
  if (!start && !end) return "Not set";
  if (!start) return `Until ${end}`;
  if (!end)   return `From ${start}`;
  return `${start.slice(0, 5)} – ${end.slice(0, 5)}`;
};

export default function OrganizationPage() {
  const { user, refreshUser } = useAuth();
  const isAdmin = user?.role === "admin";

  const [profile, setProfile] = useState(emptyCompany);
  const [form,    setForm]    = useState(emptyCompany);
  const [logoFile,    setLogoFile]    = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [message, setMessage] = useState(null);

  const fileInputRef = useRef(null);

  /* ── Data fetch ─────────────────────────────────────────────── */
  useEffect(() => {
    let ignore = false;
    const fetchCompany = async () => {
      setLoading(true);
      try {
        const res = await api.get("/organizations/profile/");
        const next = { ...emptyCompany, ...res.data };
        if (!ignore) { setProfile(next); setForm(next); }
      } catch (err) {
        if (!ignore) setMessage({ type: "error", text: err.response?.data?.message || "Failed to load company profile." });
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchCompany();
    return () => { ignore = true; };
  }, []);

  const logoSrc = logoPreview || form.logo;

  const companyStats = useMemo(() => [
    { label: "Total Members",        value: profile.total_members        ?? 0, iconClass: "org-stat-icon--blue",   suffix: "" },
    { label: "Managers",             value: profile.manager_count        ?? 0, iconClass: "org-stat-icon--purple", suffix: "" },
    { label: "Employees",            value: profile.employee_count       ?? 0, iconClass: "org-stat-icon--green",  suffix: "" },
    { label: "Active Projects",      value: profile.active_projects      ?? 0, iconClass: "org-stat-icon--orange", suffix: "" },
    { label: "Active Tasks",         value: profile.active_tasks         ?? 0, iconClass: "org-stat-icon--cyan",   suffix: "" },
    { label: "Pending Leave Req.",   value: profile.pending_leave_requests ?? 0, iconClass: "org-stat-icon--red", suffix: "" },
  ], [profile]);

  /* ── Handlers ────────────────────────────────────────────────── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    setLogoFile(file || null);
    setLogoPreview(file ? URL.createObjectURL(file) : "");
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    const formData = new FormData();
    [...fields, ...locationFields].forEach(({ name }) => {
      formData.append(name, form[name] || "");
    });
    formData.append("address",     form.address     || "");
    formData.append("description", form.description || "");
    if (logoFile) {
      formData.append("logo", logoFile);
    } else if (logoPreview === "") {
      formData.append("logo", "");
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await api.patch("/organizations/profile/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const next = { ...emptyCompany, ...res.data };
      setProfile(next); setForm(next);
      setLogoFile(null); setLogoPreview("");
      await refreshUser();
      setMessage({ type: "success", text: "Organization profile saved successfully." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || err.response?.data?.detail || "Failed to save.",
      });
    } finally {
      setSaving(false);
    }
  };

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="org-page">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="org-header">
        <div className="org-header-left">
          <nav className="org-breadcrumb">
            <span>ProjectFlow</span>
            <ChevronRight size={12} className="org-breadcrumb-sep" />
            <span className="org-breadcrumb-current">Organization Settings</span>
          </nav>

          <div className="org-title-row">
            <h1 className="org-title">Command Center</h1>
            <div className="org-status-badge">
              <span className="org-status-dot-wrap">
                <span className="org-status-dot-pulse" />
                <span className="org-status-dot" />
              </span>
              <span className="org-status-label">Systems Nominal</span>
            </div>
          </div>

          <p className="org-subtitle">
            Master configuration of your workspace ecosystem, operational parameters, and identity standards.
          </p>
        </div>

        <div className="org-header-actions">
          {!isAdmin && <span className="org-readonly-badge">View Only</span>}
          {isAdmin && (
            <>
              <button type="button" className="org-btn-secondary">Export Logs</button>
              <button type="submit" form="org-form" className="org-btn-primary" disabled={saving}>
                {saving ? <Loader2 size={14} className="org-btn-spin" /> : <Save size={14} />}
                {saving ? "Saving..." : "Deploy Changes"}
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── MESSAGE ─────────────────────────────────────────────── */}
      {message && (
        <div className={`org-message org-message--${message.type}`}>
          {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* ── SKELETON ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="org-skeleton" />
      ) : (
        <form id="org-form" onSubmit={handleSubmit}>
          <div className="org-grid">

            {/* ═══ MAIN COLUMN ══════════════════════════════════════ */}
            <div className="org-main-col">

              {/* ── Identity & Branding ──────────────────────────── */}
              <section className="org-card">
                <div className="org-card-header">
                  <div className="org-card-title-group">
                    <div className="org-card-icon">
                      <Fingerprint size={22} />
                    </div>
                    <div>
                      <h3 className="org-card-title">Identity &amp; Branding</h3>
                      <p className="org-card-subtitle">Core organization metadata and visual markers.</p>
                    </div>
                  </div>
                  <span className="org-card-tag">Config-01</span>
                </div>

                {/* Logo upload */}
                <div className="org-logo-section">
                  <div className="org-logo-wrap">
                    <div className="org-logo-preview">
                      {logoSrc
                        ? <img src={logoSrc} alt="Logo" />
                        : <Building2 size={30} />}
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        className="org-logo-btn"
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload logo"
                      >
                        <Camera size={14} />
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="org-logo-file-input"
                      onChange={handleLogoChange}
                    />
                  </div>
                  <div className="org-logo-info">
                    <h4>Corporate Emblem</h4>
                    <p>SVG or high-res PNG. Automatically synced across all active portals.</p>
                    {isAdmin && (
                      <div className="org-logo-actions">
                        <button type="button" className="org-logo-action-btn" onClick={() => fileInputRef.current?.click()}>
                          Replace File
                        </button>
                        <button type="button" className="org-logo-action-btn org-logo-action-btn--danger" onClick={handleRemoveLogo}>
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Main fields grid */}
                <div className="org-form-grid">
                  {fields.map((field) => (
                    <div
                      key={field.name}
                      className={`org-field ${field.name === "website" ? "org-form-full" : ""}`}
                    >
                      <label className="org-label" htmlFor={`org-${field.name}`}>
                        {field.label}
                      </label>
                      <div className="org-input-wrap">
                        {field.icon && (
                          <span className="org-input-icon">
                            <field.icon size={16} />
                          </span>
                        )}
                        <input
                          id={`org-${field.name}`}
                          className={`org-input${field.icon ? " org-input--with-icon" : ""}`}
                          type={field.type || "text"}
                          name={field.name}
                          value={form[field.name] || ""}
                          onChange={handleChange}
                          disabled={!isAdmin}
                          required={isAdmin && field.required}
                          placeholder={field.label}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Operational Hub ──────────────────────────────── */}
              <section className="org-card">
                <div className="org-card-header">
                  <div className="org-card-title-group">
                    <div className="org-card-icon">
                      <MapPin size={22} />
                    </div>
                    <div>
                      <h3 className="org-card-title">Operational Hub</h3>
                      <p className="org-card-subtitle">Primary HQ location and scheduling parameters.</p>
                    </div>
                  </div>
                  <span className="org-card-tag">Config-02</span>
                </div>

                <div className="org-form-grid org-form-grid--3">
                  {locationFields.map((field) => (
                    <div key={field.name} className="org-field">
                      <label className="org-label" htmlFor={`org-${field.name}`}>{field.label}</label>
                      <div className="org-input-wrap">
                        <input
                          id={`org-${field.name}`}
                          className="org-input"
                          type="text"
                          name={field.name}
                          value={form[field.name] || ""}
                          onChange={handleChange}
                          disabled={!isAdmin}
                          placeholder={field.label}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="org-field org-form-full">
                    <label className="org-label" htmlFor="org-address">Full Address</label>
                    <div className="org-input-wrap">
                      <input
                        id="org-address"
                        className="org-input"
                        type="text"
                        name="address"
                        value={form.address || ""}
                        onChange={handleChange}
                        disabled={!isAdmin}
                        placeholder="Street address"
                      />
                    </div>
                  </div>

                  <div className="org-field org-form-full">
                    <label className="org-label" htmlFor="org-description">About / Description</label>
                    <div className="org-input-wrap">
                      <input
                        id="org-description"
                        className="org-input"
                        type="text"
                        name="description"
                        value={form.description || ""}
                        onChange={handleChange}
                        disabled={!isAdmin}
                        placeholder="Brief description of your organization"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Footer row */}
              {isAdmin && (
                <div className="org-footer-row">
                  <button type="button" className="org-danger-btn">Archive Organization Instance</button>
                  <div className="org-footer-meta">
                    <span>ID: {profile.id || "—"}</span>
                    <span className="org-footer-meta-dot" />
                    <span>Admin Only</span>
                  </div>
                </div>
              )}
            </div>

            {/* ═══ SIDE COLUMN ══════════════════════════════════════ */}
            <div className="org-side-col">

              {/* Stats grid */}
              <div className="org-stats-grid">
                {companyStats.map((stat) => (
                  <div key={stat.label} className="org-stat-card">
                    <div className="org-stat-top">
                      <span className="org-stat-label">{stat.label}</span>
                      <span className={`org-stat-icon ${stat.iconClass}`}>
                        {stat.label === "Total Members"      && <Users size={16} />}
                        {stat.label === "Managers"           && <ShieldCheck size={16} />}
                        {stat.label === "Employees"          && <Users size={16} />}
                        {stat.label === "Active Projects"    && <FolderOpen size={16} />}
                        {stat.label === "Active Tasks"       && <CheckSquare size={16} />}
                        {stat.label === "Pending Leave Req." && <PlaneTakeoff size={16} />}
                      </span>
                    </div>
                    <div className="org-stat-value">
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Security & Compliance */}
              <section className="org-card">
                <div className="org-security-header">
                  <span className="org-security-header-icon">
                    <ShieldCheck size={20} />
                  </span>
                  <h4 className="org-security-title">Security &amp; Compliance</h4>
                </div>

                <div className="org-security-list">
                  <div className="org-security-item">
                    <div className="org-security-item-left">
                      <span className="org-security-item-icon org-security-item-icon--green">
                        <CheckCircle2 size={18} />
                      </span>
                      <span className="org-security-item-label">SSO Integration (SAML)</span>
                    </div>
                    <span className="org-security-badge org-security-badge--enabled">Enabled</span>
                  </div>

                  <div className="org-security-item">
                    <div className="org-security-item-left">
                      <span className="org-security-item-icon org-security-item-icon--muted">
                        <History size={18} />
                      </span>
                      <span className="org-security-item-label">Last Security Audit</span>
                    </div>
                    <span className="org-security-badge org-security-badge--muted">—</span>
                  </div>

                  <button type="button" className="org-security-manage-btn">
                    Manage Credentials
                  </button>
                </div>
              </section>

              {/* Recent Activity */}
              <section className="org-card org-activity-card">
                <div className="org-activity-header">
                  <div className="org-activity-header-left">
                    <span className="org-activity-header-icon">
                      <ListOrdered size={20} />
                    </span>
                    <h4 className="org-activity-title">Recent Activity</h4>
                  </div>
                  <a href="#" className="org-activity-view-all">View All</a>
                </div>

                <div className="org-activity-list">
                  <div className="org-activity-item">
                    <div className="org-activity-avatar org-activity-avatar--blue">
                      <DatabaseZap size={14} />
                    </div>
                    <div>
                      <p className="org-activity-text">Automated system backup completed</p>
                      <span className="org-activity-time">1 hour ago</span>
                    </div>
                  </div>

                  <div className="org-activity-item">
                    <div className="org-activity-avatar org-activity-avatar--apricot">
                      <ShieldCheck size={14} />
                    </div>
                    <div>
                      <p className="org-activity-text"><strong>System</strong> blocked unauthorized API attempt</p>
                      <span className="org-activity-time">3 hours ago</span>
                    </div>
                  </div>

                  <div className="org-activity-item">
                    <div className="org-activity-avatar org-activity-avatar--blue">
                      <Zap size={14} />
                    </div>
                    <div>
                      <p className="org-activity-text">New member joined the workspace</p>
                      <span className="org-activity-time">Yesterday</span>
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
