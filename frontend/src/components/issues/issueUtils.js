export const ISSUE_STATUSES = ["open", "investigating", "resolved", "closed"];
export const ISSUE_PRIORITIES = ["low", "medium", "high", "critical"];

export function formatIssueLabel(value) {
  if (!value) return "None";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatIssueDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function truncateText(value = "", maxLength = 140) {
  if (!value) return "No description provided.";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
}

export function getUserInitials(user = {}) {
  if (!user.name) return "?";
  return user.name.slice(0, 2).toUpperCase();
}

export function isManagerRole(role) {
  return role === "admin" || role === "manager";
}

export function getErrorMessage(err, fallback = "Something went wrong. Please try again.") {
  const data = err.response?.data;

  if (typeof data === "string") return data;
  if (data?.message) return data.message;
  if (data?.detail) return data.detail;

  const firstFieldError = data && Object.values(data).flat?.()[0];
  return firstFieldError || fallback;
}
