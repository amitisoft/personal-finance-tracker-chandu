import { http } from "./http";
import type { Budget } from "./types";

export async function listBudgets(month: number, year: number, accountId?: string) {
  const res = await http.get<Budget[]>("/api/budgets", { params: { month, year, accountId } });
  return res.data;
}

export async function createBudget(payload: {
  categoryId: string;
  month: number;
  year: number;
  amount: number;
  alertThresholdPercent?: number;
  accountId?: string | null;
}) {
  const res = await http.post<Budget>("/api/budgets", payload);
  return res.data;
}

export async function updateBudget(id: string, payload: { amount: number; alertThresholdPercent?: number }) {
  const res = await http.put<Budget>(`/api/budgets/${id}`, payload);
  return res.data;
}

export async function deleteBudget(id: string) {
  await http.delete(`/api/budgets/${id}`);
}
