import { useState } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import useProfile from "../../context/profile/useProfile";
import { WORK_STATUSES, getProfileError, workStatusMeta } from "./profileUtils";

function buildForm(profile) {
  return {
    name: profile?.name || "",
    bio: profile?.bio || "",
    designation: profile?.designation || "",
    department: profile?.department || "",
    phone_number: profile?.phone_number || "",
    work_status: profile?.work_status || "available",
  };
}

export default function ProfileEditForm({ profile, onMessage }) {
  const { updateProfile, saving } = useProfile();
  const [form, setForm] = useState(() => buildForm(profile));

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      onMessage("error", "Name is required.");
      return;
    }

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value || ""));

    try {
      await updateProfile(formData);
      onMessage("success", "Profile updated successfully.");
    } catch (err) {
      console.log(err);
      onMessage("error", getProfileError(err));
    }
  };

  return (
    <section className="profile-card profile-edit-card">
      <div className="profile-card-heading">
        <div>
          <span>Edit</span>
          <h2>Profile Settings</h2>
        </div>
      </div>

      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="profile-form-grid">
          <label>
            <span>Name</span>
            <input value={form.name} onChange={(event) => update("name", event.target.value)} />
          </label>
          <label>
            <span>Phone number</span>
            <input value={form.phone_number} onChange={(event) => update("phone_number", event.target.value)} />
          </label>
          <label>
            <span>Designation</span>
            <input value={form.designation} onChange={(event) => update("designation", event.target.value)} />
          </label>
          <label>
            <span>Department</span>
            <input value={form.department} onChange={(event) => update("department", event.target.value)} />
          </label>
        </div>

        <label>
          <span>Bio</span>
          <textarea value={form.bio} onChange={(event) => update("bio", event.target.value)} />
        </label>

        <label>
          <span>Work status</span>
          <select value={form.work_status} onChange={(event) => update("work_status", event.target.value)}>
            {WORK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {workStatusMeta[status].label}
              </option>
            ))}
          </select>
        </label>

        <div className="profile-form-actions">
          <button type="button" className="profile-secondary-button" onClick={() => setForm(buildForm(profile))}>
            <RotateCcw size={15} />
            Reset
          </button>
          <button type="submit" className="profile-primary-button" disabled={saving}>
            {saving ? <Loader2 size={15} className="profile-spin" /> : <Save size={15} />}
            {saving ? "Saving" : "Save Changes"}
          </button>
        </div>
      </form>
    </section>
  );
}
