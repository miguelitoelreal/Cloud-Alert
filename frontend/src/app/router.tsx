/* eslint-disable react-refresh/only-export-components */
import { Suspense, lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { PublicLayout } from "../layouts/PublicLayout";
import { PageLoader } from "../components/PageLoader";
import { CloudStatusPage } from "../pages/CloudStatusPage";
import { DashboardPage } from "../pages/DashboardPage";
import { LandingPage } from "../pages/LandingPage";
import { LoginPage } from "../pages/LoginPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { RegisterPage } from "../pages/RegisterPage";
import { ProtectedRoute } from "../routes/ProtectedRoute";
import { PublicOnlyRoute } from "../routes/PublicOnlyRoute";

const CloudAnalyticsPage = lazy(() => import("../pages/CloudAnalyticsPage").then((m) => ({ default: m.CloudAnalyticsPage })));
const CloudProviderDetailPage = lazy(() => import("../pages/CloudProviderDetailPage").then((m) => ({ default: m.CloudProviderDetailPage })));
const NocWallboardPage = lazy(() => import("../pages/NocWallboardPage").then((m) => ({ default: m.NocWallboardPage })));
const SlaDashboardPage = lazy(() => import("../pages/SlaDashboardPage").then((m) => ({ default: m.SlaDashboardPage })));
const MonitorDetailPage = lazy(() => import("../pages/MonitorDetailPage").then((m) => ({ default: m.MonitorDetailPage })));
const WorkspacePage = lazy(() => import("../pages/WorkspacePage").then((m) => ({ default: m.WorkspacePage })));
const IntegrationsPage = lazy(() => import("../pages/IntegrationsPage").then((m) => ({ default: m.IntegrationsPage })));
const AlertsPage = lazy(() => import("../pages/AlertsPage").then((m) => ({ default: m.AlertsPage })));
const SettingsPage = lazy(() => import("../pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const AdminPage = lazy(() => import("../pages/AdminPage").then((m) => ({ default: m.AdminPage })));
const CustomersPage = lazy(() => import("../pages/CustomersPage").then((m) => ({ default: m.CustomersPage })));
const SystemHealthPage = lazy(() => import("../pages/SystemHealthPage").then((m) => ({ default: m.SystemHealthPage })));
const NetworkToolsPage = lazy(() => import("../pages/NetworkToolsPage").then((m) => ({ default: m.NetworkToolsPage })));

export const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
    ],
  },
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        path: "/",
        element: <AuthLayout />,
        children: [
          {
            path: "login",
            element: <LoginPage />,
          },
          {
            path: "register",
            element: <RegisterPage />,
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <DashboardLayout />,
        children: [
          {
            path: "dashboard",
            element: <DashboardPage />,
          },
          {
            path: "centro-estado-cloud",
            element: <CloudStatusPage />,
          },
          {
            path: "cloud-status/analytics",
            element: <Suspense fallback={<PageLoader />}><CloudAnalyticsPage /></Suspense>,
          },
          {
            path: "cloud-status/:providerSlug",
            element: <Suspense fallback={<PageLoader />}><CloudProviderDetailPage /></Suspense>,
          },
          {
            path: "noc",
            element: <Suspense fallback={<PageLoader />}><NocWallboardPage /></Suspense>,
          },
          {
            path: "alert-subscriptions",
            element: <Suspense fallback={<PageLoader />}><AlertsPage /></Suspense>,
          },
          {
            path: "sla-dashboard",
            element: <Suspense fallback={<PageLoader />}><SlaDashboardPage /></Suspense>,
          },
          {
            path: "system-health",
            element: <Suspense fallback={<PageLoader />}><SystemHealthPage /></Suspense>,
          },
          {
            path: "herramientas-red",
            element: <Suspense fallback={<PageLoader />}><NetworkToolsPage /></Suspense>,
          },
          {
            path: "workspace",
            element: <Suspense fallback={<PageLoader />}><WorkspacePage /></Suspense>,
          },
          {
            path: "alertas",
            element: <Suspense fallback={<PageLoader />}><AlertsPage /></Suspense>,
          },
          {
            path: "integraciones",
            element: <Suspense fallback={<PageLoader />}><IntegrationsPage /></Suspense>,
          },
          {
            path: "configuracion",
            element: <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>,
          },
          {
            path: "clientes",
            element: <Suspense fallback={<PageLoader />}><CustomersPage /></Suspense>,
          },
          {
            path: "monitors/:id",
            element: <Suspense fallback={<PageLoader />}><MonitorDetailPage /></Suspense>,
          },
          {
            path: "admin",
            element: <Suspense fallback={<PageLoader />}><AdminPage /></Suspense>,
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
