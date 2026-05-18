import { workStatusMeta } from "./profileUtils";

export default function WorkStatusBadge({ status = "available" }) {
  const meta = workStatusMeta[status] || workStatusMeta.available;

  return (
    <span className={`pf-status-badge pf-status-badge--${meta.tone}`}>
      <span />
      {meta.label}
    </span>
  );
}
