import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "./AppLayout.css";

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-content">
        <Outlet />
      </div>
    </div>
  );
}