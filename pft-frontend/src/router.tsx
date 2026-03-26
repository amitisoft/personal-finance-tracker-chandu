import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./views/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { SignupPage } from "./pages/SignupPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { BudgetsPage } from "./pages/BudgetsPage";
import { GoalsPage } from "./pages/GoalsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { AccountsPage } from "./pages/AccountsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { CategoriesPage } from "./views/pages/CategoriesPage";
import { RecurringPage } from "./pages/RecurringPage";
import { InsightsPage } from "./pages/InsightsPage";
import { RulesPage } from "./pages/RulesPage";
import { AcceptInvitePage } from "./views/pages/AcceptInvitePage";

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/dashboard" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/signup", element: <SignupPage /> },
  { path: "/register", element: <Navigate to="/signup" replace /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/transactions", element: <TransactionsPage /> },
          { path: "/budgets", element: <BudgetsPage /> },
          { path: "/goals", element: <GoalsPage /> },
          { path: "/recurring", element: <RecurringPage /> },
          { path: "/reports", element: <ReportsPage /> },
          { path: "/insights", element: <InsightsPage /> },
          { path: "/rules", element: <RulesPage /> },
          { path: "/accounts", element: <AccountsPage /> },
          { path: "/accept-invite", element: <AcceptInvitePage /> },
          { path: "/categories", element: <CategoriesPage /> },
          { path: "/settings", element: <SettingsPage /> },
        ],
      },
    ],
  },
]);
