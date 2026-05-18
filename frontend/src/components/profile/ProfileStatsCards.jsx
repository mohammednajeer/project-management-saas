import { CheckCircle2, FileUp, ListTodo, ShieldAlert } from "lucide-react";

const stats = [
  { label: "Tasks Assigned", value: "0", icon: ListTodo, tone: "blue" },
  { label: "Tasks Completed", value: "0", icon: CheckCircle2, tone: "green" },
  { label: "Active Issues", value: "0", icon: ShieldAlert, tone: "orange" },
  { label: "Attachments Uploaded", value: "0", icon: FileUp, tone: "purple" },
];

export default function ProfileStatsCards() {
  return (
    <section className="profile-stats-grid">
      {stats.map(({ label, value, icon: Icon, tone }) => (
        <article className={`profile-stat-card profile-stat-card--${tone}`} key={label}>
          <div className="profile-stat-icon">
            <Icon size={20} />
          </div>
          <div>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        </article>
      ))}
    </section>
  );
}
