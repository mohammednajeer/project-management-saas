import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import AIChatBot from "../components/AIChatBot";
import NotificationProvider from "../context/NotificationProvider";
import "./AppLayout.css";

export default function AppLayout() {
  return (
    <NotificationProvider>
      <div className="app-layout">
        <Sidebar />
        <div className="app-content">
          <Outlet />
        </div>
        <AIChatBot />
      </div>
    </NotificationProvider>
  );
}
