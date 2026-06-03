import { BriefcaseBusiness, Building2, CalendarDays, Mail } from "lucide-react";
import WorkStatusBadge from "./WorkStatusBadge";
import ProfileAvatarUpload from "./ProfileAvatarUpload";
import { formatProfileDate, formatRole } from "./profileUtils";
import { getCompanyName } from "../../utils/company";

export default function ProfileHeader({ profile, onMessage }) {
  const company = profile?.company_information;

  return (
    <section className="profile-hero">
      <ProfileAvatarUpload profile={profile} onMessage={onMessage} />

      <div className="profile-hero-main">
        <div className="profile-hero-topline">
          <WorkStatusBadge status={profile?.work_status} />
          <span className="profile-role-pill">{formatRole(profile?.role)}</span>
        </div>
        <h1>{profile?.name || "Your profile"}</h1>
        <p>{profile?.bio || "Add a short bio to help teammates know you better."}</p>

        <div className="profile-hero-meta">
          <span>
            <BriefcaseBusiness size={15} />
            {profile?.designation || "Add designation"}
          </span>
          <span>
            <Building2 size={15} />
            {profile?.department || getCompanyName(company, profile?.organization || "Add department")}
          </span>
          <span>
            <Mail size={15} />
            {profile?.email}
          </span>
          <span>
            <CalendarDays size={15} />
            Joined {formatProfileDate(profile?.joined_at)}
          </span>
        </div>
      </div>
    </section>
  );
}
