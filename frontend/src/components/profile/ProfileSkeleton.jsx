export default function ProfileSkeleton() {
  return (
    <div className="profile-page">
      <div className="profile-skeleton-hero">
        <span />
        <div>
          <i />
          <b />
          <em />
        </div>
      </div>
      <div className="profile-skeleton-grid">
        {[0, 1, 2, 3].map((item) => (
          <div className="profile-skeleton-card" key={item} />
        ))}
      </div>
    </div>
  );
}
