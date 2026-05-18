import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, UserRound } from "lucide-react";
import { ProfileProvider } from "../../context/profile/ProfileContext";
import useProfile from "../../context/profile/useProfile";
import ProfileActivityCard from "../../components/profile/ProfileActivityCard";
import ProfileEditForm from "../../components/profile/ProfileEditForm";
import ProfileHeader from "../../components/profile/ProfileHeader";
import ProfileInfoCard from "../../components/profile/ProfileInfoCard";
import ProfileSkeleton from "../../components/profile/ProfileSkeleton";
import ProfileStatsCards from "../../components/profile/ProfileStatsCards";
import "./ProfilePage.css";

function ProfilePageContent() {
  const { profile, loading } = useProfile();
  const [message, setMessage] = useState(null);
  const messageTimer = useRef(null);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    window.clearTimeout(messageTimer.current);
    messageTimer.current = window.setTimeout(() => setMessage(null), 4200);
  };

  if (loading && !profile) return <ProfileSkeleton />;

  return (
    <div className="profile-page">
      <header className="profile-page-header">
        <div>
          <span className="profile-page-eyebrow">
            <UserRound size={15} />
            Account
          </span>
          <h1>Profile Management</h1>
          <p>Keep your identity, availability, and team context up to date.</p>
        </div>
      </header>

      {message && (
        <div className={`profile-toast profile-toast--${message.type}`} role="status">
          {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      <ProfileHeader profile={profile} onMessage={showMessage} />
      <ProfileStatsCards />

      <div className="profile-content-grid">
        <div className="profile-main-column">
          <ProfileEditForm key={profile?.id || "profile-form"} profile={profile} onMessage={showMessage} />
        </div>
        <aside className="profile-side-column">
          <ProfileInfoCard profile={profile} />
          <ProfileActivityCard />
        </aside>
      </div>
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
