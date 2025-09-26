import { Outlet } from "react-router-dom";
import P5Background from "../components/P5Background";

export default function AppLayout() {
  return (
    <div className="app-root relative">
      <P5Background />   {/* 👈 une seule fois pour tout le site */}
      <Outlet />         {/* contenu des pages */}
    </div>
  );
}