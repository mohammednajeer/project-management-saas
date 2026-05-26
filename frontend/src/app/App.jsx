import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Homepage from "../pages/home/Homepage";
import AuthPage from "../pages/auth/AuthPage";
import Dashboard from "../pages/dashboard/Dashboard";
import Members from "../pages/Members/Members";
import Projects from "../pages/projects/Projects";
import ProjectDetails from "../pages/projects/ProjectDetails";
import Tasks from "../pages/tasks/Tasks";
import TaskDetails from "../pages/tasks/TaskDetails";
import ActivityPage from "../pages/activity/ActivityPage";
import IssuesPage from "../pages/issues/IssuesPage";
import ProfilePage from "../pages/profile/ProfilePage";
import Notifications from "../pages/notifications/Notifications";
import WorkspaceHome from "../pages/workspace/WorkspaceHome";
import WorkspaceTasks from "../pages/workspace/WorkspaceTasks";
import WorkspaceNotifications from "../pages/workspace/WorkspaceNotifications";
import TaskWorkspace from "../pages/workspace/TaskWorkspace";
import SubtaskDetails from "../pages/workspace/SubtaskDetails";
import EmployeeActivityPage from "../pages/workspace/EmployeeActivityPage";
import PublicRoute from "../components/PublicRoute";
import RoleProtectedRoute from "../components/RoleProtectedRoute";
import AppLayout from "../layout/AppLayout";
import WorkspaceLayout from "../layout/WorkspaceLayout";
import { AuthProvider } from "../context/AuthContext";
import MyTasks from "../pages/workspace/MyTasks";
import ChatPage from "../pages/chat/ChatPage";
import Reports from "../pages/Reports/Reports";


function PlaceholderPage({ title }) {
  return (
    <div style={{ padding: "2rem" }}>
      <h1>{title}</h1>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
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

          <Route
            path="/dashboard"
            element={
              <RoleProtectedRoute
                allowedRoles={["admin", "manager"]}
                fallbackPath="/workspace"
              >
                <AppLayout />
              </RoleProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:projectId" element={<ProjectDetails />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="tasks/:taskId" element={<TaskDetails />} />
            <Route path="issues" element={<IssuesPage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="team" element={<Members />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<PlaceholderPage title="Settings" />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>

          <Route
            path="/workspace"
            element={
              <RoleProtectedRoute
                allowedRoles={["employee"]}
                fallbackPath="/dashboard"
              >
                <WorkspaceLayout />
              </RoleProtectedRoute>
            }
          >
            <Route index element={<WorkspaceHome />} />
            <Route path="tasks" element={<WorkspaceTasks />} />
            <Route path="issues" element={<IssuesPage />} />
            <Route path="activity" element={<EmployeeActivityPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="notifications" element={<WorkspaceNotifications />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="my-tasks" element={<MyTasks />} />
            <Route path="task/:taskId" element={<TaskWorkspace />} />
            {/* ── Employee subtask workspace ── */}
            <Route path="subtask/:subtaskId" element={<SubtaskDetails />} />
            <Route path="*" element={<Navigate to="/workspace" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;