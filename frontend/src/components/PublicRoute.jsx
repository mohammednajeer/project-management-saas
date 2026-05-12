import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const redirectByRole = {
  admin: "/dashboard",
  manager: "/dashboard",
  employee: "/workspace",
};

export default function PublicRoute({
  children,
}) {
  const {
    user,
    loading,
    isAuthenticated,
  } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (isAuthenticated) {
    return (
      <Navigate
        to={
          redirectByRole[user.role] ||
          "/dashboard"
        }
        replace
      />
    );
  }

  return children;
}
