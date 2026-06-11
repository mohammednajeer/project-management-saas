import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import AIChatBot from "../components/AIChatBot";
import EmailVerificationBanner from "../components/EmailVerificationBanner";
import NotificationProvider from "../context/NotificationProvider";
import "./AppLayout.css";

export default function AppLayout() {
  return (
    <NotificationProvider>
      <div className="app-layout">
        <Sidebar />
        <div className="app-content">
          <EmailVerificationBanner />
          <Outlet />
        </div>
        <AIChatBot />
      </div>
    </NotificationProvider>
  );
}
