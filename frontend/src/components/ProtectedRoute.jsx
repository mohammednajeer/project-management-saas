import RoleProtectedRoute from "./RoleProtectedRoute";

export default function ProtectedRoute({ children }) {
  return (
    <RoleProtectedRoute>
      {children}
    </RoleProtectedRoute>
  );
}
