export const HEALTH_STYLES = {
  healthy: { bg: "#dcfce7", color: "#15803d", label: "Healthy" },
  attention: { bg: "#fef9c3", color: "#a16207", label: "Attention" },
  at_risk: { bg: "#fee2e2", color: "#b91c1c", label: "At Risk" },
};

export function getHealthStyle(health) {
  const key = String(health || "healthy").toLowerCase();
  return HEALTH_STYLES[key] || HEALTH_STYLES.healthy;
}

export const MILESTONE_STATUS_STYLES = {
  pending: { bg: "#f1f5f9", color: "#64748b" },
  in_progress: { bg: "#dbeafe", color: "#1d4ed8" },
  completed: { bg: "#dcfce7", color: "#15803d" },
};

export function formatStatusLabel(status) {
  if (!status) return "Unknown";
  return String(status).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDueDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
