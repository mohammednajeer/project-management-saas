import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import api from "../services/api";

export default function PublicRoute({
  children,
}) {
  const [isAuthenticated,
    setIsAuthenticated
  ] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await api.get("/auth/me/");
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      }
    };

    const timeoutId = window.setTimeout(
      checkAuth,
      0
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (isAuthenticated === null) {
    return <p>Loading...</p>;
  }

  if (isAuthenticated) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return children;
}
