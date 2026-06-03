import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock3,
  Globe2,
  ImagePlus,
  Loader2,
  MapPin,
  Phone,
  Save,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { emptyCompany } from "../../utils/company";
import "./SettingsPage.css";

const fields = [
  { name: "company_name", label: "Company name", required: true },
  { name: "industry", label: "Industry" },
  { name: "website", label: "Website", type: "url" },
  { name: "phone", label: "Phone" },
  { name: "timezone", label: "Timezone" },
  { name: "working_days", label: "Working days" },
  { name: "working_hours_start", label: "Start time", type: "time" },
  { name: "working_hours_end", label: "End time", type: "time" },
  { name: "city", label: "City" },
  { name: "state", label: "State" },
  { name: "country", label: "Country" },
];

const formatHours = (start, end) => {
  if (!start && !end) return "Not set";
  if (!start) return `Until ${end}`;
  if (!end) return `From ${start}`;
  return `${start.slice(0, 5)} - ${end.slice(0, 5)}`;
};

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const isAdmin = user?.role === "admin";
  const [profile, setProfile] = useState(emptyCompany);
  const [form, setForm] = useState(emptyCompany);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let ignore = false;

    const fetchCompany = async () => {
      setLoading(true);

      try {
        const res = await api.get("/organizations/profile/");
        const nextProfile = { ...emptyCompany, ...res.data };

        if (!ignore) {
          setProfile(nextProfile);
          setForm(nextProfile);
        }
      } catch (err) {
        if (!ignore) {
          setMessage({
            type: "error",
            text: err.response?.data?.message || "Failed to load company profile.",
          });
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchCompany();

    return () => {
      ignore = true;
    };
  }, []);

  const logoSrc = logoPreview || form.logo;

  const addressSummary = useMemo(() => (
    [profile.city, profile.state, profile.country].filter(Boolean).join(", ") || "Location not set"
  ), [profile.city, profile.country, profile.state]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    setLogoFile(file || null);
    setLogoPreview(file ? URL.createObjectURL(file) : "");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isAdmin) return;

    const formData = new FormData();

    fields.forEach(({ name }) => {
      formData.append(name, form[name] || "");
    });

    formData.append("address", form.address || "");
    formData.append("description", form.description || "");

    if (logoFile) {
      formData.append("logo", logoFile);
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await api.patch("/organizations/profile/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const nextProfile = { ...emptyCompany, ...res.data };
      setProfile(nextProfile);
      setForm(nextProfile);
      setLogoFile(null);
      setLogoPreview("");
      await refreshUser();
      setMessage({
        type: "success",
        text: "Company profile saved.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err.response?.data?.message ||
          err.response?.data?.detail ||
          "Failed to save company profile.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page">
      <header className="settings-header">
        <div>
          <span className="settings-eyebrow">
            <Building2 size={15} />
            Settings
          </span>
          <h1>Company Profile</h1>
          <p>
            {isAdmin
              ? "Manage the company information visible across ProjectFlow."
              : "View your company profile and workspace details."}
          </p>
        </div>
      </header>

      {message && (
        <div className={`settings-message settings-message--${message.type}`}>
          {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="settings-skeleton" />
      ) : (
        <div className="settings-grid">
          <section className="settings-summary">
            <div className="settings-logo">
              {profile.logo ? (
                <img src={profile.logo} alt="" />
              ) : (
                <Building2 size={30} />
              )}
            </div>

            <h2>{profile.company_name || "Company name not set"}</h2>
            <p>{profile.industry || "Industry not set"}</p>

            <div className="settings-summary-list">
              <div>
                <Globe2 size={16} />
                <span>{profile.website || "Website not set"}</span>
              </div>
              <div>
                <Phone size={16} />
                <span>{profile.phone || "Phone not set"}</span>
              </div>
              <div>
                <MapPin size={16} />
                <span>{addressSummary}</span>
              </div>
              <div>
                <Clock3 size={16} />
                <span>{formatHours(profile.working_hours_start, profile.working_hours_end)}</span>
              </div>
            </div>

            <div className="settings-counts">
              <div>
                <strong>{profile.employee_count || 0}</strong>
                <span>Employees</span>
              </div>
              <div>
                <strong>{profile.manager_count || 0}</strong>
                <span>Managers</span>
              </div>
            </div>
          </section>

          <form className="settings-form-card" onSubmit={handleSubmit}>
            <div className="settings-card-heading">
              <div>
                <span>Company details</span>
                <h2>{isAdmin ? "Edit Profile" : "Profile Details"}</h2>
              </div>
              {!isAdmin && <span className="settings-readonly">View only</span>}
            </div>

            <label className="settings-logo-upload">
              <span className="settings-logo-preview">
                {logoSrc ? <img src={logoSrc} alt="" /> : <ImagePlus size={20} />}
              </span>
              <span>
                <strong>Company logo</strong>
                <small>{isAdmin ? "Upload PNG or JPG" : "Admins manage this logo"}</small>
              </span>
              {isAdmin && <input type="file" accept="image/*" onChange={handleLogoChange} />}
            </label>

            <div className="settings-form-grid">
              {fields.map((field) => (
                <label key={field.name}>
                  <span>{field.label}</span>
                  <input
                    type={field.type || "text"}
                    name={field.name}
                    value={form[field.name] || ""}
                    onChange={handleChange}
                    disabled={!isAdmin}
                    required={isAdmin && field.required}
                  />
                </label>
              ))}
            </div>

            <label>
              <span>Address</span>
              <textarea
                name="address"
                value={form.address || ""}
                onChange={handleChange}
                disabled={!isAdmin}
              />
            </label>

            <label>
              <span>Description</span>
              <textarea
                name="description"
                value={form.description || ""}
                onChange={handleChange}
                disabled={!isAdmin}
              />
            </label>

            {isAdmin && (
              <div className="settings-actions">
                <button type="submit" disabled={saving}>
                  {saving ? <Loader2 size={16} className="settings-spin" /> : <Save size={16} />}
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
