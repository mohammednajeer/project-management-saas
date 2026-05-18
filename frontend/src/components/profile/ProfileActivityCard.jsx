import { Activity, CheckCircle2, MessageSquare, UploadCloud } from "lucide-react";

const fallbackActivities = [
  { icon: CheckCircle2, title: "Profile workspace ready", detail: "Your profile is connected to ProjectFlow." },
  { icon: MessageSquare, title: "Collaboration profile", detail: "Bio and status help teammates understand availability." },
  { icon: UploadCloud, title: "Avatar sync enabled", detail: "Profile changes update across navigation instantly." },
];

export default function ProfileActivityCard({ activities = fallbackActivities }) {
  return (
    <section className="profile-card profile-activity-card">
      <div className="profile-card-heading">
        <div>
          <span>Timeline</span>
          <h2>Recent Activity</h2>
        </div>
        <Activity size={18} />
      </div>

      <div className="profile-activity-list">
        {activities.map(({ icon: Icon, title, detail }) => (
          <div className="profile-activity-item" key={title}>
            <span>
              <Icon size={15} />
            </span>
            <div>
              <strong>{title}</strong>
              <p>{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
