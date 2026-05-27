import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AppLoader } from "../components/AppLoader";
import { useAuth } from "../hooks/useAuth";

export function PublicOnlyRoute() {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <AppLoader />;
  }

  if (isAuthenticated) {
    const redirectPath =
      (location.state as { from?: { pathname?: string } } | null)?.from
        ?.pathname ?? "/dashboard";

    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
}
