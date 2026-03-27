import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.accessToken);
  const loc = useLocation();
  if (!token) {
    const from = `${loc.pathname}${loc.search}${loc.hash}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }
  return <Outlet />;
}
