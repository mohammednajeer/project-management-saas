import { Building2, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { formatRole } from "./profileUtils";

const fields = [
  { key: "email", label: "Email", icon: Mail },
  { key: "phone_number", label: "Phone", icon: Phone, empty: "Add phone number" },
  { key: "designation", label: "Designation", icon: UserRound, empty: "Add designation" },
  { key: "department", label: "Department", icon: Building2, empty: "Add department" },
];

export default function ProfileInfoCard({ profile }) {
  return (
    <section className="profile-card">
      <div className="profile-card-heading">
        <div>
          <span>Identity</span>
          <h2>Profile Details</h2>
        </div>
        <ShieldCheck size={18} />
      </div>

      <div className="profile-info-list">
        {fields.map(({ key, label, icon: Icon, empty }) => (
          <div className="profile-info-row" key={key}>
            <span className="profile-info-icon">
              <Icon size={16} />
            </span>
            <div>
              <small>{label}</small>
              <strong>{profile?.[key] || empty || "Not available"}</strong>
            </div>
          </div>
        ))}
        <div className="profile-info-row">
          <span className="profile-info-icon">
            <ShieldCheck size={16} />
          </span>
          <div>
            <small>Role</small>
            <strong>{formatRole(profile?.role)}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
