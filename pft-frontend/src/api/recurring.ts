import { http } from "./http";
import type { RecurringItem } from "./types";

export async function listRecurring() {
  const res = await http.get<RecurringItem[]>("/api/recurring");
  return res.data;
}

export async function createRecurring(payload: {
  title: string;
  type: string;
  amount: number;
  categoryId?: string | null;
  accountId?: string | null;
  frequency: string;
  startDate: string;
  endDate?: string | null;
  nextRunDate: string;
  autoCreateTransaction: boolean;
}) {
  const res = await http.post<RecurringItem>("/api/recurring", payload);
  return res.data;
}

export async function updateRecurring(
  id: string,
  payload: {
    title: string;
    type: string;
    amount: number;
    categoryId?: string | null;
    accountId?: string | null;
    frequency: string;
    startDate: string;
    endDate?: string | null;
    nextRunDate: string;
    autoCreateTransaction: boolean;
  },
) {
  const res = await http.put<RecurringItem>(`/api/recurring/${id}`, payload);
  return res.data;
}

export async function deleteRecurring(id: string) {
  await http.delete(`/api/recurring/${id}`);
}