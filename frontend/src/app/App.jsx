import { BrowserRouter, Routes, Route } from "react-router-dom";

import Homepage from "../pages/home/Homepage";
import AuthPage from "../pages/auth/AuthPage";
import Dashboard from "../pages/dashboard/Dashboard";
import Members from "../pages/Members/Members";
import Projects from "../pages/projects/Projects";
import ProtectedRoute from "../components/ProtectedRoute";
import AppLayout from "../layout/AppLayout";
import ProjectDetails from "../pages/projects/ProjectDetails";
import Tasks from "../pages/tasks/Tasks";


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
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:projectId" element={<ProjectDetails />}/>
          <Route path="tasks" element={<Tasks />}/>
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
