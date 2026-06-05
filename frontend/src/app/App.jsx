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
import MemberDetails from "../pages/team/MemberDetails";
import Projects from "../pages/projects/Projects";
import ProjectDetails from "../pages/projects/ProjectDetails";
import Tasks from "../pages/tasks/tasks";
import TaskDetails from "../pages/tasks/TaskDetails";
import ActivityPage from "../pages/activity/ActivityPage";
import IssuesPage from "../pages/issues/IssuesPage";
import ProfilePage from "../pages/profile/ProfilePage";
import SettingsPage from "../pages/settings/SettingsPage";
import LeavePage from "../pages/leave/LeavePage";
import CalendarPage from "../pages/calendar/CalendarPage";
import AIAssistantPage from "../pages/ai-assistant/AIAssistantPage";
import Notifications from "../pages/notifications/Notifications";
import WorkspaceHome from "../pages/workspace/WorkspaceHome";
import WorkspaceTasks from "../pages/workspace/WorkspaceTasks";
import WorkspaceNotifications from "../pages/workspace/WorkspaceNotifications";
import TaskWorkspace from "../pages/workspace/TaskWorkspace";
import SubtaskDetails from "../pages/workspace/Subtaskdetails";
import EmployeeActivityPage from "../pages/workspace/EmployeeActivityPage";
import PublicRoute from "../components/PublicRoute";
import RoleProtectedRoute from "../components/RoleProtectedRoute";
import AppLayout from "../layout/AppLayout";
import WorkspaceLayout from "../layout/WorkspaceLayout";
import { AuthProvider } from "../context/AuthContext";
import MyTasks from "../pages/workspace/Mytasks";
import ChatPage from "../pages/chat/ChatPage";
import Reports from "../pages/Reports/Reports";

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
            <Route path="team/:memberId" element={<MemberDetails />} />
            <Route path="reports" element={<Reports />} />
            <Route path="leave" element={<LeavePage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="ai-assistant" element={<AIAssistantPage />} />
            <Route path="organization" element={<SettingsPage />} />
            <Route path="settings" element={<SettingsPage />} />
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
            <Route path="leave" element={<LeavePage />} />
            <Route path="calendar" element={<CalendarPage />} />
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
