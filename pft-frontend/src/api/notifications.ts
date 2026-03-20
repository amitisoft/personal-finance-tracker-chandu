import { http } from "./http";
import type { BudgetAlertNotification } from "./types";

export async function listBudgetAlerts(params?: { month?: number; year?: number }) {
  const res = await http.get<BudgetAlertNotification[]>("/api/notifications/budget-alerts", { params });
  return res.data;
}
