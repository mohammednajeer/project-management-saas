export const WORKLOAD_STATUS_STYLES = {
  underutilized: { bg: "#e0f2fe", color: "#0369a1" },
  balanced: { bg: "#dcfce7", color: "#15803d" },
  overloaded: { bg: "#fee2e2", color: "#b91c1c" },
};

export function getWorkloadStyle(status) {
  const key = String(status || "balanced").toLowerCase();
  return WORKLOAD_STATUS_STYLES[key] || WORKLOAD_STATUS_STYLES.balanced;
}
