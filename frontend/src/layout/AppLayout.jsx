import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
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
      </div>
    </NotificationProvider>
  );
}
