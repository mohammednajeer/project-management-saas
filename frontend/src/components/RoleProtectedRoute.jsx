import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const defaultRedirectByRole = {
  admin: "/dashboard",
  manager: "/dashboard",
  employee: "/workspace",
  platform_admin: "/platform",
};

export default function RoleProtectedRoute({
  children,
  allowedRoles,
  fallbackPath,
}) {
  const location = useLocation();
  const {
    user,
    loading,
    isAuthenticated,
  } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/signin"
        replace
        state={{ from: location }}
      />
    );
  }

  if (
    allowedRoles?.length &&
    !allowedRoles.includes(user.role)
  ) {
    return (
      <Navigate
        to={
          fallbackPath ||
          defaultRedirectByRole[user.role] ||
          "/signin"
        }
        replace
      />
    );
  }

  return children;
}
