import { BrowserRouter, Routes, Route } from "react-router-dom";

import Homepage from "../pages/home/Homepage";
import AuthPage from "../pages/auth/AuthPage";
import Dashboard from "../pages/dashboard/Dashboard";
import Members from "../pages/Members/Members";
import Projects from "../pages/projects/Projects";
import ProtectedRoute from "../components/ProtectedRoute";
import PublicRoute from "../components/PublicRoute";
import AppLayout from "../layout/AppLayout";
import ProjectDetails from "../pages/projects/ProjectDetails";
import Tasks from "../pages/tasks/Tasks";
import TaskDetails from "../pages/tasks/TaskDetails";
import Notifications from "../pages/notifications/Notifications";
import WorkspacePage from "../pages/workspace/WorkspacePage";
function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <Homepage />
            </PublicRoute>
          }
        />
        <Route
          path="/signin"
          element={
            <PublicRoute>
              <AuthPage />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <AuthPage />
            </PublicRoute>
          }
        />

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
          <Route path="tasks/:taskId" element={<TaskDetails />}/>
          <Route path="notifications" element={<Notifications />}/>
          <Route path="workspace"element={<WorkspacePage />}/>
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
