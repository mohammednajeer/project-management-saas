export default function IssueSkeleton() {
  return (
    <div className="issue-skeleton-grid" aria-label="Loading issues">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div className="issue-skeleton-card" key={item}>
          <div className="issue-skeleton-row">
            <span />
            <span />
          </div>
          <div className="issue-skeleton-line issue-skeleton-line--wide" />
          <div className="issue-skeleton-line" />
          <div className="issue-skeleton-block" />
        </div>
      ))}
    </div>
  );
}
