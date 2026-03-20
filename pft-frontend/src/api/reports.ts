import { http } from "./http";
import type { CategorySpendItem, IncomeVsExpensePoint } from "./types";

export type AccountBalanceTrendPoint = {
  date: string;
  balance: number;
};

export async function categorySpend(params?: { from?: string; to?: string; accountId?: string; type?: string }) {
  const res = await http.get<CategorySpendItem[]>("/api/reports/category-spend", { params });
  return res.data;
}

export async function incomeVsExpense(params?: { from?: string; to?: string }) {
  const res = await http.get<IncomeVsExpensePoint[]>("/api/reports/income-vs-expense", { params });
  return res.data;
}

export async function accountBalanceTrend(params: { accountId: string; from?: string; to?: string }) {
  const res = await http.get<AccountBalanceTrendPoint[]>("/api/reports/account-balance-trend", { params });
  return res.data;
}

export async function exportTransactionsCsv(params?: {
  startDate?: string;
  endDate?: string;
  accountId?: string;
  categoryId?: string;
  type?: string;
  search?: string;
}) {
  const res = await http.get<Blob>("/api/reports/export.csv", { params, responseType: "blob" });
  return res.data;
}
