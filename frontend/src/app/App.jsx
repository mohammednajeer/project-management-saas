import { BrowserRouter, Routes, Route } from "react-router-dom";

import Homepage from "../pages/home/Homepage";
import AuthPage from "../pages/auth/AuthPage"
import Dashboard from "../pages/dashboard/Dashboard";

import ProtectedRoute from "../components/ProtectedRoute";

const appRoutes = [
  { path: "/", element: <Homepage /> },
  { path: "/signin", element: <AuthPage /> },
  { path: "/signup", element: <AuthPage /> },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
];

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {appRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={route.element}
          />
        ))}
      </Routes>
    </BrowserRouter>
  );
}

export default App;