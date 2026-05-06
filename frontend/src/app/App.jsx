import { BrowserRouter, Routes, Route } from "react-router-dom";

import Homepage from "../pages/home/Homepage";
import AuthPage from "../pages/auth/AuthPage";
import Dashboard from "../pages/dashboard/Dashboard";
import Members from "../pages/Members/Members";

import ProtectedRoute from "../components/ProtectedRoute";
import AppLayout from "../layout/AppLayout";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public */}
        <Route path="/" element={<Homepage />} />
        <Route path="/signin" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage />} />

        {/* Protected */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="team" element={<Members />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
