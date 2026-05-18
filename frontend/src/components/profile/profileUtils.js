export const WORK_STATUSES = ["available", "busy", "meeting", "focused", "offline"];

export const workStatusMeta = {
  available: { label: "Available", tone: "green" },
  busy: { label: "Busy", tone: "orange" },
  meeting: { label: "In meeting", tone: "blue" },
  focused: { label: "Focused", tone: "purple" },
  offline: { label: "Offline", tone: "gray" },
};

export function getInitials(user = {}) {
  const name = user.name || user.email || "User";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function formatProfileDate(value) {
  if (!value) return "Recently joined";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently joined";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatRole(role) {
  if (!role) return "Member";
  return String(role).replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getProfileError(err, fallback = "Profile could not be updated.") {
  const data = err.response?.data;
  if (typeof data === "string") return data;
  if (data?.message) return data.message;
  if (data?.detail) return data.detail;
  const first = data && Object.values(data).flat?.()[0];
  return first || fallback;
}
