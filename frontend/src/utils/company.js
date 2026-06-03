export const emptyCompany = {
  company_name: "",
  logo: "",
  industry: "",
  website: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  country: "",
  timezone: "UTC",
  working_days: "Monday-Friday",
  working_hours_start: "",
  working_hours_end: "",
  description: "",
  employee_count: 0,
  manager_count: 0,
};

export function getCompanyFromUser(user) {
  return user?.company_information || null;
}

export function getCompanyName(company, fallback = "ProjectFlow") {
  return (
    company?.company_name ||
    company?.name ||
    company?.organization ||
    fallback
  );
}

export function getCompanyInitials(company, fallback = "PF") {
  const source = getCompanyName(company, fallback);

  return source
    .split(/[\s.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function formatWebsite(website) {
  if (!website) return "Website not set";

  return website.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function getCompanyLocation(company) {
  return [company?.city, company?.state, company?.country]
    .filter(Boolean)
    .join(", ");
}

export function formatWorkingHours(company) {
  const start = company?.working_hours_start;
  const end = company?.working_hours_end;

  if (!start && !end) return "Hours not set";
  if (!start) return `Until ${end.slice(0, 5)}`;
  if (!end) return `From ${start.slice(0, 5)}`;

  return `${start.slice(0, 5)} - ${end.slice(0, 5)}`;
}
