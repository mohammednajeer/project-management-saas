import { Building2, CalendarDays, Globe2, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { formatProfileDate, formatRole } from "./profileUtils";
import { formatWebsite, getCompanyInitials, getCompanyName } from "../../utils/company";

const fields = [
  { key: "email", label: "Email", icon: Mail },
  { key: "phone_number", label: "Phone", icon: Phone, empty: "Add phone number" },
  { key: "designation", label: "Designation", icon: UserRound, empty: "Add designation" },
  { key: "department", label: "Department", icon: Building2, empty: "Add department" },
];

export default function ProfileInfoCard({ profile }) {
  const company = profile?.company_information;
  const companyName = getCompanyName(company, profile?.organization || "Company not set");

  return (
    <>
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

      <section className="profile-card profile-company-card">
        <div className="profile-card-heading">
          <div>
            <span>Organization</span>
            <h2>Company Information</h2>
          </div>
          <Building2 size={18} />
        </div>

        <div className="profile-company-head">
          <div className="profile-company-logo">
            {company?.logo ? (
              <img src={company.logo} alt="" />
            ) : (
              getCompanyInitials(company, "PF")
            )}
          </div>
          <div>
            <h3>{companyName}</h3>
            <p>{company?.industry || "Industry not set"}</p>
          </div>
        </div>

        <div className="profile-info-list">
          <div className="profile-info-row">
            <span className="profile-info-icon">
              <ShieldCheck size={16} />
            </span>
            <div>
              <small>User role</small>
              <strong>{formatRole(profile?.role)}</strong>
            </div>
          </div>
          <div className="profile-info-row">
            <span className="profile-info-icon">
              <CalendarDays size={16} />
            </span>
            <div>
              <small>Join date</small>
              <strong>{formatProfileDate(profile?.joined_at)}</strong>
            </div>
          </div>
          <div className="profile-info-row">
            <span className="profile-info-icon">
              <Globe2 size={16} />
            </span>
            <div>
              <small>Website</small>
              <strong>{formatWebsite(company?.website)}</strong>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
