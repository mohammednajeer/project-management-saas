import { Outlet } from "react-router-dom";

import WorkspaceSidebar from "../components/WorkspaceSidebar";
import NotificationProvider from "../context/NotificationProvider";

import "./WorkspaceLayout.css";

export default function WorkspaceLayout() {
  return (
    <NotificationProvider>
      <div className="workspace-layout">
        <WorkspaceSidebar />
        <main className="workspace-content">
          <Outlet />
        </main>
      </div>
    </NotificationProvider>
  );
}
